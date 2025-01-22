import type { LLMClient } from "./llm-client";
import type {
  ActionHandler,
  ChainOfThoughtContext,
  CoTAction,
  Goal,
  HorizonType,
  RefinedGoal,
} from "../types";

import { Logger } from "./logger";
import { EventEmitter } from "events";
import { GoalManager } from "./goal-manager";
import { StepManager, type Step, type StepType } from "./step-manager";
import { LogLevel } from "../types";
import {
  calculateImportance,
  determineEmotions,
  generateUniqueId,
  getValidatedLLMResponse,
  injectTags,
} from "./utils";
import { systemPromptAction } from "./actions/system-prompt";
import Ajv from "ajv";
import type { VectorDB } from "./vector-db";

import type { AnySchema, JSONSchemaType } from "ajv";
import { z } from "zod";

const ajv = new Ajv();

export class ChainOfThought extends EventEmitter {
  private stepManager: StepManager;
  private context: ChainOfThoughtContext;
  private snapshots: ChainOfThoughtContext[];
  private logger: Logger;
  goalManager: GoalManager;
  public memory: VectorDB;

  private actionRegistry = new Map<string, ActionHandler>();
  private actionExamples = new Map<
    string,
    { description: string; example: string }
  >();

  private actionSchemas = new Map<string, JSONSchemaType<any>>();

  constructor(
    private llmClient: LLMClient,
    memory: VectorDB,
    initialContext?: ChainOfThoughtContext,
    config: {
      logLevel?: LogLevel;
    } = {}
  ) {
    super();
    this.setMaxListeners(50);
    this.memory = memory;
    this.stepManager = new StepManager();
    this.snapshots = [];
    this.goalManager = new GoalManager();

    this.context = initialContext ?? {
      worldState: "",
    };

    this.logger = new Logger({
      level: config.logLevel ?? LogLevel.ERROR,
      enableColors: true,
      enableTimestamp: true,
    });

    this.llmClient.on("trace:tokens", (data) => {
      this.emit("trace:tokens", data);
    });

    this.registerDefaultActions();
  }

  public async planStrategy(objective: string): Promise<void> {
    this.logger.debug("planStrategy", "Planning strategy for objective", {
      objective,
    });

    // Fetch relevant documents and experiences related to the objective
    const [relevantDocs, relevantExperiences] = await Promise.all([
      this.memory.findSimilarDocuments(objective, 5),
      this.memory.findSimilarEpisodes(objective, 3),
    ]);

    this.logger.debug("planStrategy", "Retrieved relevant context", {
      docCount: relevantDocs.length,
      expCount: relevantExperiences.length,
    });

    // Build context from relevant documents
    const gameStateContext = relevantDocs
      .map(
        (doc) => `
        Document: ${doc.title}
        Category: ${doc.category}
        Content: ${doc.content}
        Tags: ${doc.tags.join(", ")}
      `
      )
      .join("\n\n");

    // Build context from past experiences
    const experienceContext = relevantExperiences
      .map(
        (exp) => `
        Past Experience:
        Action: ${exp.action}
        Outcome: ${exp.outcome}
        Importance: ${exp.importance}
        Emotions: ${exp.emotions?.join(", ") || "none"}
      `
      )
      .join("\n\n");

    const prompt = `
      <objective>
      "${objective}"
      </objective>

      <context>
      ${gameStateContext}
      
      <past_experiences>
      ${experienceContext}
      </past_experiences>

      </context>

      <goal_planning_rules>
      1. Break down the objective into hierarchical goals
      2. Each goal must have clear success criteria
      3. Identify dependencies between goals
      4. Prioritize goals (1-10) based on urgency and impact
      5. short term goals should be given a priority of 10
      6. Ensure goals are achievable given the current context
      7. Consider past experiences when setting goals
      8. Use available game state information to inform strategy
      
      # Return a JSON structure with three arrays:
      - long_term: Strategic goals that might take multiple sessions
      - medium_term: Tactical goals achievable in one session
      - short_term: Immediate actionable goals
      
      # Each goal must include:
      - description: Clear goal statement
      - success_criteria: Array of specific conditions for completion
      - dependencies: Array of prerequisite goal IDs (empty for initial goals)
      - priority: Number 1-10 (10 being highest)
      - required_resources: Array of resources needed (based on game state)
      - estimated_difficulty: Number 1-10 based on past experiences
      </goal_planning_rules>
    `;

    const goalSchema = z.object({
      description: z.string(),
      success_criteria: z.array(z.string()),
      dependencies: z.array(z.string()),
      priority: z.number().min(1).max(10),
      required_resources: z.array(z.string()),
      estimated_difficulty: z.number().min(1).max(10),
    });

    const goalPlanningSchema = z.object({
      long_term: z.array(goalSchema),
      medium_term: z.array(goalSchema),
      short_term: z.array(goalSchema),
    });

    try {
      const goals = await getValidatedLLMResponse({
        prompt,
        systemPrompt:
          "You are a strategic planning system that creates hierarchical goal structures.",
        schema: goalPlanningSchema,
        maxRetries: 3,
        onRetry: (error, attempt) => {
          this.logger.error("planStrategy", `Attempt ${attempt} failed`, {
            error,
          });
        },
        llmClient: this.llmClient,
        logger: this.logger,
      });

      // Create goals in order: long-term first, then medium, then short
      for (const horizon of [
        "long_term",
        "medium_term",
        "short_term",
      ] as const) {
        for (const goalData of goals[horizon]) {
          const newGoal = this.goalManager.addGoal({
            horizon: horizon.split("_")[0] as HorizonType,
            status: "pending",
            ...goalData,
            created_at: Date.now(),
          });

          this.emit("goal:created", {
            id: newGoal.id,
            description: newGoal.description,
            priority: newGoal.priority,
          });
        }
      }

      // Add a planning step
      this.addStep(
        `Strategy planned for objective: ${objective}`,
        "planning",
        ["strategy-planning"],
        { goals }
      );
    } catch (error) {
      this.logger.error("planStrategy", "Failed to plan strategy", { error });
      throw error;
    }
  }

  private getPrioritizedGoals(): Goal[] {
    const readyGoals = this.goalManager.getReadyGoals();
    const horizonPriority: Record<string, number> = {
      short: 3,
      medium: 2,
      long: 1,
    };

    return readyGoals.sort((a, b) => {
      const horizonDiff =
        horizonPriority[a.horizon] - horizonPriority[b.horizon];
      if (horizonDiff !== 0) {
        return -horizonDiff;
      }
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  }

  private async canExecuteGoal(goal: Goal): Promise<{
    possible: boolean;
    reason: string;
    missing_requirements: string[];
  }> {
    console.log("canExecuteGoal: =================================", goal);
    const [relevantDocs, relevantExperiences, blackboardState] =
      await Promise.all([
        this.memory.findSimilarDocuments(goal.description, 5),
        this.memory.findSimilarEpisodes(goal.description, 3),
        this.getBlackboardState(),
      ]);

    const prompt = `
      <goal_execution_check>

      # Goal
      ${goal.description}

      <relevant_context>
      ${relevantDocs
        .map((doc) => `Document: ${doc.title}\n${doc.content}`)
        .join("\n\n")}
      </relevant_context>

      <relevant_experiences>
      ${relevantExperiences
        .map((exp) => `Experience: ${exp.action}\n${exp.outcome}`)
        .join("\n\n")}
      </relevant_experiences>

      <current_game_state>
      ${JSON.stringify(blackboardState, null, 2)}
      </current_game_state>
      
      Required dependencies:
      ${JSON.stringify(goal.dependencies || {}, null, 2)}
      
      # Analyze if this goal can be executed right now. Consider:

      1. Are all required resources available in the current game state?
      2. Are environmental conditions met?
      3. Are there any blocking conditions?
      4. Do we have the necessary game state requirements?
      
      </goal_execution_check>
    `;

    try {
      const schema = z
        .object({
          possible: z.boolean(),
          reason: z.string(),
          missing_requirements: z.array(z.string()),
        })
        .strict();

      const response = await getValidatedLLMResponse<{
        possible: boolean;
        reason: string;
        missing_requirements: string[];
      }>({
        prompt,
        systemPrompt:
          "You are a goal feasibility analyzer that checks if goals can be executed given current conditions.",
        schema,
        maxRetries: 3,
        onRetry: (error, attempt) => {
          this.logger.warn("canExecuteGoal", `Retry attempt ${attempt}`, {
            error,
          });
        },
        llmClient: this.llmClient,
        logger: this.logger,
      });

      return response;
    } catch (error) {
      this.logger.error(
        "canExecuteGoal",
        "Failed to check goal executability",
        { error }
      );
      return {
        possible: false,
        reason: "Error checking goal executability",
        missing_requirements: [],
      };
    }
  }

  private async refineGoal(goal: Goal, maxRetries: number = 3): Promise<void> {
    const [relevantDocs, relevantExperiences, blackboardState] =
      await Promise.all([
        this.memory.findSimilarDocuments(goal.description, 5),
        this.memory.findSimilarEpisodes(goal.description, 3),
        this.getBlackboardState(),
      ]);

    const schema = z.array(
      z
        .object({
          description: z.string(),
          success_criteria: z.array(z.string()),
          priority: z.number(),
          horizon: z.literal("short"),
          requirements: z.record(z.any()),
        })
        .strict()
    );

    const prompt = `
      <goal_refinement>
      Goal to Refine: ${goal.description}
      
      <relevant_context>
      ${relevantDocs
        .map((doc) => `Document: ${doc.title}\n${doc.content}`)
        .join("\n\n")}
      </relevant_context>

      <relevant_experiences>
      ${relevantExperiences
        .map((exp) => `Experience: ${exp.action}\n${exp.outcome}`)
        .join("\n\n")}
      </relevant_experiences>

      <current_game_state>
      ${JSON.stringify(blackboardState, null, 2)}
      </current_game_state>

      # Goal Refinement Rules
      Break this goal down into more specific, immediately actionable sub-goals.
      Each sub-goal must be:
      1. Concrete and measurable
      2. Achievable with current resources
      3. Properly sequenced

      # Goal Refinement Schema
      Return an array of sub-goals, each with:
      - description: Clear goal statement
      - success_criteria: Array of specific conditions for completion
      - priority: Number 1-10 (10 being highest)
      - horizon: Must be "short" for immediate actions
      - requirements: Object containing needed resources/conditions
      
      </goal_refinement>
    `;

    try {
      const subGoals = await getValidatedLLMResponse<RefinedGoal[]>({
        prompt,
        systemPrompt:
          "You are a goal refinement system that breaks down complex goals into actionable steps. Return only valid JSON array matching the schema.",
        schema,
        maxRetries,
        onRetry: (error, attempt) => {
          this.logger.error("refineGoal", `Attempt ${attempt} failed`, {
            error,
          });
        },
        llmClient: this.llmClient,
        logger: this.logger,
      });

      // Add sub-goals to goal manager with parent reference
      for (const subGoal of subGoals) {
        this.goalManager.addGoal({
          ...subGoal,
          parentGoal: goal.id,
          status: "pending",
          created_at: Date.now(),
        });
      }

      // Update original goal status
      this.goalManager.updateGoalStatus(goal.id, "active");
    } catch (error) {
      throw new Error(
        `Failed to refine goal after ${maxRetries} attempts: ${error}`
      );
    }
  }

  public async executeNextGoal(): Promise<void> {
    const prioritizedGoals = this.getPrioritizedGoals();

    if (!prioritizedGoals.length) {
      this.logger.debug("executeNextGoal", "No ready goals available");
      return;
    }

    // Try goals in priority order until we find one we can execute
    for (const currentGoal of prioritizedGoals) {
      const { possible, reason } = await this.canExecuteGoal(currentGoal);

      if (!possible) {
        this.logger.debug("executeNextGoal", "Goal cannot be executed", {
          goalId: currentGoal.id,
          reason,
        });

        // If it's a medium/long term goal, try to refine it
        if (currentGoal.horizon !== "short") {
          this.logger.debug("executeNextGoal", "Attempting to refine goal", {
            goalId: currentGoal.id,
          });
          await this.refineGoal(currentGoal);
          continue;
        }

        // Mark as blocked and continue to next goal
        this.goalManager.blockGoalHierarchy(currentGoal.id, reason);
        this.emit("goal:blocked", {
          id: currentGoal.id,
          reason,
        });
        continue;
      }

      // We found an executable goal
      this.emit("goal:started", {
        id: currentGoal.id,
        description: currentGoal.description,
      });

      try {
        // Execute the goal using think()
        await this.think(currentGoal.description);

        // Check success criteria
        const success = await this.validateGoalSuccess(currentGoal);

        if (success) {
          await this.handleGoalCompletion(currentGoal);
        } else {
          // Instead of throwing error, block the goal and continue
          const blockReason = `Goal validation failed: Success criteria not met for ${currentGoal.description}`;
          this.goalManager.blockGoalHierarchy(currentGoal.id, blockReason);
          this.emit("goal:blocked", {
            id: currentGoal.id,
            reason: blockReason,
          });

          // Try the next goal
          continue;
        }

        // Only execute one successful goal per call
        break;
      } catch (error) {
        // Handle unexpected errors during execution
        this.logger.error(
          "executeNextGoal",
          "Unexpected error during goal execution",
          {
            goalId: currentGoal.id,
            error,
          }
        );

        await this.handleGoalFailure(currentGoal, error);

        // Continue with next goal instead of throwing
        continue;
      }
    }
  }

  private async handleGoalCompletion(goal: Goal): Promise<void> {
    this.goalManager.updateGoalStatus(goal.id, "completed");

    // Update context based on goal completion
    const contextUpdate = await this.determineContextUpdates(goal);
    if (contextUpdate) {
      this.mergeContext(contextUpdate);

      // Store relevant state changes in blackboard
      const timestamp = Date.now();
      for (const [key, value] of Object.entries(contextUpdate)) {
        await this.updateBlackboard({
          type: "state",
          key,
          value,
          timestamp,
          metadata: {
            goal_id: goal.id,
            goal_description: goal.description,
          },
        });
      }
    }

    // Check parent goals
    if (goal.parentGoal) {
      const parentGoal = this.goalManager.getGoalById(goal.parentGoal);
      if (parentGoal) {
        const siblingGoals = this.goalManager.getChildGoals(parentGoal.id);
        const allCompleted = siblingGoals.every(
          (g) => g.status === "completed"
        );

        if (allCompleted) {
          this.goalManager.updateGoalStatus(parentGoal.id, "ready");
        }
      }
    }

    // Update dependent goals
    const dependentGoals = this.goalManager.getDependentGoals(goal.id);
    for (const depGoal of dependentGoals) {
      if (this.goalManager.arePrerequisitesMet(depGoal.id)) {
        this.goalManager.updateGoalStatus(depGoal.id, "ready");
      }
    }

    this.emit("goal:completed", {
      id: goal.id,
      result: "Goal success criteria met",
    });
  }

  private async determineContextUpdates(
    goal: Goal
  ): Promise<Partial<ChainOfThoughtContext> | null> {
    const blackboardState = await this.getBlackboardState();

    const prompt = `
      <context_update_analysis>
      Completed Goal: ${goal.description}
      
      Current Context:
      ${JSON.stringify(blackboardState, null, 2)}
      
      Recent Steps:
      ${JSON.stringify(this.stepManager.getSteps().slice(-5), null, 2)}
      
      Analyze how the world state has changed after this goal completion.
      Return only a JSON object with updated context fields that have changed.
      </context_update_analysis>
    `;

    try {
      const response = await this.llmClient.analyze(prompt, {
        system:
          "You are a context analysis system that determines state changes after goal completion.",
      });

      return JSON.parse(response.toString());
    } catch (error) {
      this.logger.error(
        "determineContextUpdates",
        "Failed to determine context updates",
        { error }
      );
      return null;
    }
  }

  private async handleGoalFailure(
    goal: Goal,
    error: Error | unknown
  ): Promise<void> {
    this.goalManager.updateGoalStatus(goal.id, "failed");

    // If this was a sub-goal, mark parent as blocked
    if (goal.parentGoal) {
      this.goalManager.updateGoalStatus(goal.parentGoal, "blocked");
    }

    this.emit("goal:failed", {
      id: goal.id,
      error,
    });
  }

  private async validateGoalSuccess(goal: Goal): Promise<boolean> {
    const blackboardState = await this.getBlackboardState();

    const prompt = `
      <goal_validation>
      Goal: ${goal.description}
      
      Success Criteria:
      ${goal.success_criteria.map((c: string) => `- ${c}`).join("\n")}
      
      Current Context:
      ${JSON.stringify(blackboardState, null, 2)}
      
      Recent Steps:
      ${JSON.stringify(this.stepManager.getSteps().slice(-10), null, 2)}
      
      Based on the success criteria and current context, has this goal been achieved?

      Outcome Score:
      - 0-100 = 0-100% success

      Return only a JSON object with: { "success": boolean, "reason": string, "outcomeScore": number }
      </goal_validation>
    `;

    try {
      const response = await getValidatedLLMResponse({
        prompt,
        systemPrompt:
          "You are a goal validation system that carefully checks success criteria against the current context.",
        schema: z.object({
          success: z.boolean(),
          reason: z.string(),
          outcomeScore: z.number(),
        }),
        llmClient: this.llmClient,
        logger: this.logger,
      });

      console.log(
        "validateGoalSuccess response: =================================",
        response
      );

      if (response.success) {
        this.addStep(
          `Goal validated as successful: ${response.reason}`,
          "system",
          ["goal-validation"]
        );
      } else {
        this.addStep(`Goal validation failed: ${response.reason}`, "system", [
          "goal-validation",
        ]);
      }

      // Record the outcome score
      this.goalManager.recordGoalOutcome(
        goal.id,
        response.outcomeScore,
        response.reason
      );

      return response.success;
    } catch (error) {
      this.logger.error("validateGoalSuccess", "Goal validation failed", {
        error,
      });
      return false;
    }
  }

  /**
   * Add a new step to the end of the chain.
   * @param content Reasoning or textual content of the step.
   * @param type The type of the step.
   * @param tags Optional tags or categories to label the step.
   * @param meta Additional metadata to store in the step.
   */
  public addStep(
    content: string,
    type: StepType = "action",
    tags?: string[],
    meta?: Record<string, any>
  ): Step {
    const newStep: Step = {
      id: generateUniqueId(),
      type,
      content,
      timestamp: Date.now(),
      tags,
      meta,
    } as Step;

    const step = this.stepManager.addStep(newStep);
    this.emit("step", step);
    return step;
  }

  /**
   * Merge new data into the current context.
   * @param newContext Partial context to merge into the existing context.
   */
  public mergeContext(newContext: Partial<ChainOfThoughtContext>): void {
    this.logger.debug("mergeContext", "Merging new context", { newContext });

    this.context = {
      ...this.context,
      ...newContext,
    };
  }

  /**
   * Add (push) a context snapshot to keep track of changes over time.
   */
  public snapshotContext(): void {
    this.logger.debug("snapshotContext", "Creating context snapshot");

    const snapshot = JSON.parse(JSON.stringify(this.context));
    this.snapshots.push(snapshot);
  }

  /**
   * Retrieve all snapshots.
   */
  public getSnapshots(): ChainOfThoughtContext[] {
    return this.snapshots;
  }

  public registerAction(
    type: string,
    handler: ActionHandler,
    example?: { description: string; example: string },
    schema?: JSONSchemaType<any>
  ): void {
    this.logger.debug("registerAction", "Registering custom action", { type });
    this.actionRegistry.set(type, handler);

    // Store the example snippet if provided
    if (example) {
      this.actionExamples.set(type, example);
    }

    if (schema) {
      this.actionSchemas.set(type, schema);
    }
  }

  /**
   * A central method to handle CoT actions that might be triggered by the LLM.
   * @param action The action to be executed.
   */
  public async executeAction(action: CoTAction): Promise<string> {
    this.logger.debug("executeAction", "Executing action", { action });
    this.emit("action:start", action);

    const actionStep = this.addStep(
      `Executing action: ${action.type}`,
      "action",
      ["action-execution"],
      { action }
    );

    try {
      // Validate the result against the schema
      if (this.actionSchemas.has(action.type)) {
        const validate = ajv.compile(
          this.actionSchemas.get(action.type) as AnySchema
        );
        if (!validate(action.payload)) {
          return "Invalid action result - try schema validation again";
        }
      }

      const handler = this.actionRegistry.get(action.type);
      if (!handler) {
        return `No handler registered for action type "${action.type}" try again`;
      }

      const result = await handler(action, this);

      // Format the result for better readability
      const formattedResult =
        typeof result === "object"
          ? `${action.type} completed successfully:\n${JSON.stringify(
              result,
              null,
              2
            )}`
          : result;

      // Update the action step
      this.stepManager.updateStep(actionStep.id, {
        content: `Action completed: ${formattedResult}`,
        meta: { ...actionStep.meta, result: formattedResult },
      });

      // Store in context
      this.mergeContext({
        actionHistory: {
          ...(this.context.actionHistory || {}),
          [Date.now()]: {
            action,
            result: formattedResult,
          },
        },
      });

      this.emit("action:complete", { action, result: formattedResult });
      return formattedResult;
    } catch (error) {
      // Update the action step with the error
      this.stepManager.updateStep(actionStep.id, {
        content: `Action failed: ${error}`,
        meta: { ...actionStep.meta, error },
      });
      this.emit("action:error", { action, error });
      throw error;
    }
  }

  /**
   * Removes a step from the chain by its ID.
   * @param stepId The unique identifier of the step to remove
   * @throws Error if the step with the given ID doesn't exist
   */
  public removeStep(stepId: string): void {
    this.logger.debug("removeStep", "Removing step", { stepId });

    const index = this.stepManager
      .getSteps()
      .findIndex((step) => step.id === stepId);
    if (index === -1) {
      const error = `Step with ID ${stepId} not found`;
      this.logger.error("removeStep", error);
      throw new Error(error);
    }
    this.stepManager.removeStep(stepId);
  }

  /**
   * Returns a formatted string listing all available actions registered in the action registry
   */
  private getAvailableActions(): string {
    const actions = Array.from(this.actionRegistry.keys());
    return `Available actions:\n${actions
      .map((action) => `- ${action}`)
      .join("\n")}`;
  }

  private buildPrompt(tags: Record<string, string> = {}): string {
    this.logger.debug("buildPrompt", "Building LLM prompt");

    const lastSteps = JSON.stringify(this.stepManager.getSteps());

    const actionExamplesText = Array.from(this.actionExamples.entries())
      .map(([type, { description, example }]) => {
        return `
Action Type: ${type}
Description: ${description}
Example JSON:
${example}
`;
      })
      .join("\n\n");

    const prompt = `
    <global_context>
    <OBJECTIVE>
    
    <GOAL>
    {{query}}
    </GOAL>

You are a Chain of Thought reasoning system. Think through this problem step by step:

1. First, carefully analyze the goal and break it down into logical components
2. For each component, determine the precise actions and information needed
3. Consider dependencies and prerequisites between steps
4. Validate that each step directly contributes to the goal
5. Ensure the sequence is complete and sufficient to achieve the goal

Return a precise sequence of steps that achieves the given goal. Each step must be:
- Actionable and concrete
- Directly contributing to the goal
- Properly ordered in the sequence
- Validated against requirements

Focus solely on the goal you have been given. Do not add extra steps or deviate from the objective.
</OBJECTIVE>

<LAST_STEPS>
${lastSteps}
</LAST_STEPS>

<CONTEXT_SUMMARY>
${this.context.worldState}

{{additional_context}}
</CONTEXT_SUMMARY>

<STEP_VALIDATION_RULES>
1. Each step must have a clear, measurable outcome
2. Maximum 10 steps per sequence
3. Steps must be non-redundant unless explicitly required
4. All dynamic values (marked with <>) must be replaced with actual values
5. Use queries for information gathering, transactions for actions only
{{custom_validation_rules}}
</STEP_VALIDATION_RULES>

<REQUIRED_VALIDATIONS>
1. Resource costs must be verified before action execution
2. Building requirements must be confirmed before construction
3. Entity existence must be validated before interaction
4. If the required amounts are not available, end the sequence.
{{additional_validations}}
</REQUIRED_VALIDATIONS>

<OUTPUT_FORMAT>
Return a JSON array where each step contains:
- plan: A short explanation of what you will do
- meta: A metadata object with requirements for the step. Find this in the context.
- actions: A list of actions to be executed. You can either use ${this.getAvailableActions()}. You must only use these.

<AVAILABLE_ACTIONS>
Below is a list of actions you may use. For each action, 
the "payload" must follow the indicated structure exactly.

${actionExamplesText}
</AVAILABLE_ACTIONS>

</global_context>
`;

    return injectTags(tags, prompt);
  }

  public async think(
    userQuery: string,
    maxIterations: number = 10
  ): Promise<void> {
    this.emit("think:start", { query: userQuery });

    try {
      // Consult single memory instance for both types of memories
      const [similarExperiences, relevantDocs] = await Promise.all([
        this.memory.findSimilarEpisodes(userQuery, 1),
        this.memory.findSimilarDocuments(userQuery, 1),
      ]);

      this.logger.debug("think", "Retrieved memory context", {
        experienceCount: similarExperiences.length,
        docCount: relevantDocs.length,
      });

      this.logger.debug("think", "Beginning to think", {
        userQuery,
        maxIterations,
      });

      // Initialize with user query
      this.addStep(`User Query: ${userQuery}`, "task", ["user-query"]);

      let currentIteration = 0;
      let isComplete = false;

      // Get initial plan and actions
      const initialResponse = await getValidatedLLMResponse({
        prompt: this.buildPrompt({ query: userQuery }),
        schema: z.object({
          plan: z.string().optional(),
          meta: z.any().optional(),
          actions: z.array(
            z.object({
              type: z.string(),
              payload: z.any(),
            })
          ),
        }),
        systemPrompt:
          "You are a reasoning system that outputs structured JSON only.",
        maxRetries: 3,
        llmClient: this.llmClient,
        logger: this.logger,
      });

      // Initialize pending actions queue with initial actions
      let pendingActions: CoTAction[] = [
        ...initialResponse.actions,
      ] as CoTAction[];

      // Add initial plan as a step if provided
      if (initialResponse.plan) {
        this.addStep(`Initial plan: ${initialResponse.plan}`, "planning", [
          "initial-plan",
        ]);
      }

      while (
        !isComplete &&
        currentIteration < maxIterations &&
        pendingActions.length > 0
      ) {
        this.logger.debug("think", "Processing iteration", {
          currentIteration,
          pendingActionsCount: pendingActions.length,
        });

        // Process one action at a time
        const currentAction = pendingActions.shift()!;
        this.logger.debug("think", "Processing action", {
          action: currentAction,
          remainingActions: pendingActions.length,
        });

        try {
          const result = await this.executeAction(currentAction);

          // Store the experience
          await this.storeEpisode(currentAction.type, result);

          // If the result seems important, store as knowledge
          if (calculateImportance(result) > 0.7) {
            await this.storeKnowledge(
              `Learning from ${currentAction.type}`,
              result,
              "action_learning",
              [currentAction.type, "automated_learning"]
            );
          }

          const completion = await getValidatedLLMResponse({
            prompt: `${this.buildPrompt({ result })}
            ${JSON.stringify({
              query: userQuery,
              currentSteps: this.stepManager.getSteps(),
              lastAction: currentAction.toString() + " RESULT:" + result,
            })}
            <verification_rules>
             # Chain of Verification Analysis

             ## Verification Steps
             1. Original Query/Goal
             - Verify exact requirements
             2. All Steps Taken
             - Verify successful completion of each step
             3. Current Context  
             - Verify state matches expectations
             4. Last Action Result
             - Verify correct outcome
             5. Value Conversions
             - Convert hex values to decimal for verification

             ## Verification Process
             - Check preconditions were met
             - Validate proper execution
             - Confirm expected postconditions  
             - Check for edge cases/errors

             ## Determination Criteria
             - Goal Achievement Status
             - Achieved or impossible? (complete)
             - Supporting verification evidence (reason)
             - Resource Requirements
             - Continue if resources available? (shouldContinue)

             </verification_rules>

             <thinking_process>
             Think in detail here
             </thinking_process>
               `,
            schema: z.object({
              complete: z.boolean(),
              reason: z.string(),
              shouldContinue: z.boolean(),
              newActions: z.array(z.any()),
            }),
            systemPrompt:
              "You are a goal completion analyzer using Chain of Verification...",
            maxRetries: 3,
            llmClient: this.llmClient,
            logger: this.logger,
          });

          try {
            isComplete = completion.complete;

            if (completion.newActions?.length > 0) {
              // Add new actions to the end of the pending queue
              const extractedActions = completion.newActions.flatMap(
                (plan: any) => plan.actions || []
              );
              pendingActions.push(...extractedActions);

              this.logger.debug("think", "Added new actions", {
                newActionsCount: extractedActions.length,
                totalPendingCount: pendingActions.length,
              });
            }

            if (isComplete || !completion.shouldContinue) {
              this.addStep(
                `Goal ${isComplete ? "achieved" : "failed"}: ${
                  completion.reason
                }`,
                "system",
                ["completion"]
              );
              this.emit("think:complete", { query: userQuery });
              return;
            } else {
              this.addStep(
                `Action completed, continuing execution: ${completion.reason}`,
                "system",
                ["continuation"]
              );
            }
          } catch (error) {
            this.logger.error("think", "Error parsing completion check", {
              error: error instanceof Error ? error.message : String(error),
              completion,
            });
            continue;
          }
        } catch (error) {
          this.emit("think:error", { query: userQuery, error });
          throw error;
        }

        currentIteration++;
      }

      if (currentIteration >= maxIterations) {
        const error = `Failed to solve query "${userQuery}" within ${maxIterations} iterations`;
        this.logger.error("think", error);
        this.emit("think:timeout", { query: userQuery });
      }
    } catch (error) {
      this.emit("think:error", { query: userQuery, error });
      throw error;
    }
  }

  private async formatActionOutcome(
    action: string,
    result: string | Record<string, any>
  ): Promise<string> {
    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);

    const response = await getValidatedLLMResponse({
      prompt: `
      # Action Result Summary
      Summarize this action result in a clear, concise way
      
      # Action taken
      ${action}

      # Result of action
      ${resultStr}

      # Rules for summary:
      1. Be concise but informative (1-2 lines max)
      2. All values from the result to make the summary more informative
      3. Focus on the key outcomes or findings
      4. Use neutral, factual language
      5. Don't include technical details unless crucial
      6. Make it human-readable
      
      # Rules for output
      Return only the summary text, no additional formatting.
      `,
      schema: z.any(),
      systemPrompt:
        "You are a result summarizer. Create clear, concise summaries of action results.",
      maxRetries: 3,
      llmClient: this.llmClient,
      logger: this.logger,
    });

    return response.toString().trim();
  }

  private async storeEpisode(
    action: string,
    result: string | Record<string, any>,
    importance?: number
  ): Promise<void> {
    try {
      const formattedOutcome = await this.formatActionOutcome(action, result);
      const calculatedImportance =
        importance ?? calculateImportance(formattedOutcome);
      const actionWithResult = `${action} RESULT: ${result}`;
      const emotions = determineEmotions(
        actionWithResult,
        formattedOutcome,
        calculatedImportance
      );

      const experience = {
        timestamp: new Date(),
        action: actionWithResult,
        outcome: formattedOutcome,
        context: this.context,
        importance: calculatedImportance,
        emotions,
      };

      await this.memory.storeEpisode(experience);

      this.emit("memory:experience_stored", {
        experience: {
          ...experience,
          id: crypto.randomUUID(),
        },
      });
    } catch (error) {
      this.logger.error("storeEpisode", "Failed to store experience", {
        error,
      });
    }
  }

  private async storeKnowledge(
    title: string,
    content: string,
    category: string,
    tags: string[]
  ): Promise<void> {
    try {
      const document = {
        id: crypto.randomUUID(),
        title,
        content,
        category,
        tags,
        lastUpdated: new Date(),
      };

      await this.memory.storeDocument(document);

      this.emit("memory:knowledge_stored", { document });
    } catch (error) {
      this.logger.error("storeKnowledge", "Failed to store knowledge", {
        error,
      });
    }
  }

  private registerDefaultActions() {
    this.actionRegistry.set("SYSTEM_PROMPT", systemPromptAction);
  }

  private async updateBlackboard(update: {
    type: "resource" | "state" | "event" | "achievement";
    key: string;
    value: any;
    timestamp: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.memory.storeDocument({
        title: `Blackboard Update: ${update.type} - ${update.key}`,
        content: JSON.stringify({
          ...update,
          value: update.value,
          timestamp: update.timestamp || Date.now(),
        }),
        category: "blackboard",
        tags: ["blackboard", update.type, update.key],
        lastUpdated: new Date(),
      });

      this.logger.debug("updateBlackboard", "Stored blackboard update", {
        update,
      });
    } catch (error) {
      this.logger.error(
        "updateBlackboard",
        "Failed to store blackboard update",
        {
          error,
        }
      );
    }
  }

  async getBlackboardState(): Promise<Record<string, any>> {
    try {
      // Use findDocumentsByCategory to get all blackboard documents
      const blackboardDocs = await this.memory.searchDocumentsByTag([
        "blackboard",
      ]);

      // Build current state by applying updates in order
      const state: Record<string, any> = {};

      blackboardDocs
        .sort((a, b) => {
          const aContent = JSON.parse(a.content);
          const bContent = JSON.parse(b.content);
          return aContent.timestamp - bContent.timestamp;
        })
        .forEach((doc) => {
          const update = JSON.parse(doc.content);
          if (!state[update.type]) {
            state[update.type] = {};
          }
          state[update.type][update.key] = update.value;
        });

      return state;
    } catch (error) {
      this.logger.error(
        "getBlackboardState",
        "Failed to get blackboard state",
        {
          error,
        }
      );
      return {};
    }
  }

  async getBlackboardHistory(
    type?: string,
    key?: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Use searchDocumentsByTag to find relevant documents
      const tags = ["blackboard"];
      if (type) tags.push(type);
      if (key) tags.push(key);

      const docs = await this.memory.searchDocumentsByTag(tags, limit);

      return docs
        .map((doc) => ({
          ...JSON.parse(doc.content),
          id: doc.id,
          lastUpdated: doc.lastUpdated,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.logger.error(
        "getBlackboardHistory",
        "Failed to get blackboard history",
        {
          error,
        }
      );
      return [];
    }
  }
}
