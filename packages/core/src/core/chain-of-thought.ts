import type { LLMClient } from "./llm-client";
import type {
  ChainOfThoughtContext,
  CoTAction,
  CoTContractRead,
  CoTTransaction,
  LLMStructuredResponse,
} from "../types";
import { queryValidator } from "./validation";
import { Logger } from "./logger";
import { executeStarknetTransaction, executeStarknetRead, fetchData } from "./providers";
import { EventEmitter } from "events";
import { GoalManager, type HorizonType, type GoalStatus } from "./goalManager";
import { StepManager, type Step, type StepType } from "./stepManager";
import { LogLevel } from "../types";
import { Provider, constants } from "starknet";

// Todo: remove these when we bundle
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { injectTags } from "./utils";

async function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question}\nYour response: `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export class ChainOfThought extends EventEmitter {
  private stepManager: StepManager;
  private context: ChainOfThoughtContext;
  private snapshots: ChainOfThoughtContext[];
  private logger: Logger;
  private contextLogPath: string;
  goalManager: GoalManager;

  constructor(
    private llmClient: LLMClient,
    initialContext?: ChainOfThoughtContext
  ) {
    super(); // Initialize EventEmitter
    this.stepManager = new StepManager();
    this.context = initialContext ?? {
      worldState: "",
      queriesAvailable: "",
      availableActions: "",
    };
    this.snapshots = [];
    this.logger = new Logger({
      level: LogLevel.ERROR,
      enableColors: true,
      enableTimestamp: true,
    });

    this.contextLogPath = path.join(process.cwd(), "logs", "context.log");
    // Ensure logs directory exists
    const logsDir = path.dirname(this.contextLogPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    // Log initial context
    this.logContext("INITIAL_CONTEXT");

    this.goalManager = new GoalManager();
  }

  public async planStrategy(objective: string): Promise<void> {
    this.logger.debug("planStrategy", "Planning strategy for objective", {
      objective,
    });

    const prompt = `
      <objective>
      "${objective}"
      </objective>

      <context>
      ${JSON.stringify(this.context, null, 2)}
      </context>

      <goal_planning_rules>
      1. Break down the objective into hierarchical goals
      2. Each goal must have clear success criteria
      3. Identify dependencies between goals
      4. Prioritize goals (1-10) based on urgency and impact
      5. Ensure goals are achievable given the current context
      
      Return a JSON structure with three arrays:
      - long_term: Strategic goals that might take multiple sessions
      - medium_term: Tactical goals achievable in one session
      - short_term: Immediate actionable goals
      
      Each goal must include:
      - description: Clear goal statement
      - success_criteria: Array of specific conditions for completion
      - dependencies: Array of prerequisite goal IDs (empty for initial goals)
      - priority: Number 1-10 (10 being highest)

      </goal_planning_rules>

    Return as JSON with this <response_structure>, do not include any other text:

    <response_structure>
      {
        "long_term": [{ description, success_criteria[], priority, dependencies[] }],
        "medium_term": [...],
        "short_term": [...]
      }
    </response_structure>

    `;

    try {
      const response = await this.llmClient.analyze(prompt, {
        system:
          "You are a strategic planning system that creates hierarchical goal structures.",
      });

      const goals = JSON.parse(response.toString());

      console.log(goals);

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

  private getPrioritizedGoals(): any[] {
    const readyGoals = this.goalManager.getReadyGoals();

    // Sort first by horizon priority (short > medium > long)
    const horizonPriority = {
      short: 3,
      medium: 2,
      long: 1,
    };

    return readyGoals.sort((a, b) => {
      // First sort by horizon
      const horizonDiff =
        horizonPriority[a.horizon] - horizonPriority[b.horizon];
      if (horizonDiff !== 0) return -horizonDiff;

      // Then by explicit priority
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  private async canExecuteGoal(
    goal: any
  ): Promise<{ possible: boolean; reason: string }> {
    const prompt = `
      <goal_execution_check>
      Goal: ${goal.description}
      
      Current Context:
      ${JSON.stringify(this.context, null, 2)}
      
      Required Resources/Prerequisites:
      ${JSON.stringify(goal.requirements || {}, null, 2)}
      
      Analyze if this goal can be executed right now. Consider:
      1. Are all required resources available?
      2. Are environmental conditions met?
      3. Are there any blocking conditions?
      

      </goal_execution_check>

    Return as JSON with this <response_structure>, do not include any other text:

    <response_structure>
      {
        "possible": boolean,
        "reason": string (explanation why possible/not possible)
      }
      </response_structure>

      Only return the JSON object, do not include any other text, backticks, or comments.
    `;

    try {
      const response = await this.llmClient.analyze(prompt, {
        system:
          "You are a goal feasibility analyzer that checks if goals can be executed given current conditions.",
      });

      console.log(response);

      return JSON.parse(response.toString());
    } catch (error) {
      this.logger.error(
        "canExecuteGoal",
        "Failed to check goal executability",
        { error }
      );
      return { possible: false, reason: "Error checking goal executability" };
    }
  }

  private async refineGoal(goal: any): Promise<void> {
    const prompt = `
      <goal_refinement>
      Goal to Refine: ${goal.description}
      
      Current Context:
      ${JSON.stringify(this.context, null, 2)}
      
      Break this goal down into more specific, immediately actionable sub-goals.
      Each sub-goal must be:
      1. Concrete and measurable
      2. Achievable with current resources
      3. Properly sequenced

      </goal_refinement>
      
      Return as JSON with this <response_structure>, do not include any other text:

      <response_structure>
      {
        "description": string,
        "success_criteria": string[],
        "priority": number,
        "horizon": "short",
        "requirements": object
      }
      </response_structure>

      Only return the JSON object, do not include any other text, backticks, or comments.
    `;

    try {
      const response = await this.llmClient.analyze(prompt, {
        system:
          "You are a goal refinement system that breaks down complex goals into actionable steps.",
      });

      const subGoals = JSON.parse(response.toString());

      // Add sub-goals to goal manager with parent reference
      for (const subGoal of subGoals) {
        this.goalManager.addGoal({
          ...subGoal,
          parentGoal: goal.id,
          status: "pending",
        });
      }

      // Update original goal status
      this.goalManager.updateGoalStatus(goal.id, "active");
    } catch (error) {
      this.logger.error("refineGoal", "Failed to refine goal", { error });
      throw error;
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

  private async handleGoalCompletion(goal: any): Promise<void> {
    // Mark the goal as completed
    this.goalManager.updateGoalStatus(goal.id, "completed");

    // Update context based on goal completion
    const contextUpdate = await this.determineContextUpdates(goal);
    if (contextUpdate) {
      this.mergeContext(contextUpdate);
    }

    // Check parent goals
    if (goal.parentGoal) {
      const parentGoal = this.goalManager.getGoalById(goal.parentGoal);
      if (parentGoal) {
        const siblingGoals = this.goalManager.getChildGoals(parentGoal.id);
        const allCompleted = siblingGoals.every(g => g.status === "completed");
        if (allCompleted) {
          // Only mark parent as ready if it hasn't been completed
          if (parentGoal.status !== "completed") {
            this.goalManager.updateGoalStatus(parentGoal.id, "ready");
          }
        }
      }
    }

    // Update dependent goals
    const dependentGoals = this.goalManager.getDependentGoals(goal.id);
    for (const depGoal of dependentGoals) {
      // Only update if the goal isn't already completed
      if (depGoal.status !== "completed" && this.goalManager.arePrerequisitesMet(depGoal.id)) {
        this.goalManager.updateGoalStatus(depGoal.id, "ready");
      }
    }

    // Emit completion event
    this.emit("goal:completed", {
      id: goal.id,
      result: "Goal success criteria met"
    });

    // Stop the current think process
    this.addStep(`Goal "${goal.description}" completed successfully. Moving to next goal.`, "system", ["goal-completion"]);
  }

  private async determineContextUpdates(
    goal: any
  ): Promise<Partial<ChainOfThoughtContext> | null> {
    const prompt = `
      <context_update_analysis>
      Completed Goal: ${goal.description}
      
      Current Context:
      ${JSON.stringify(this.context, null, 2)}
      
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

  private async handleGoalFailure(goal: any, error: Error | unknown): Promise<void> {
    // Check for specific error conditions
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Cannot explore while in combat')) {
      // Create a new combat resolution goal with higher priority
      const combatGoal = this.goalManager.addGoal({
        description: "Resolve active combat before continuing exploration",
        success_criteria: ["Beast is defeated or successfully fled from"],
        priority: 10, // High priority to handle combat first
        horizon: "short",
        status: "ready",
        created_at: Date.now(),
        dependencies: [] // Initialize with no dependencies
      });

      // Block the current goal until combat is resolved
      this.goalManager.updateGoalStatus(goal.id, "blocked");
      
      // Add the combat goal as a dependency by updating the blocked goal's status
      this.goalManager.blockGoalHierarchy(goal.id, "Combat must be resolved first");
      
      // Update the goal's dependencies in the goals Map directly
      const currentGoal = this.goalManager.getGoalById(goal.id);
      if (currentGoal) {
        currentGoal.dependencies = [...(currentGoal.dependencies || []), combatGoal.id];
      }

      this.emit("goal:blocked", {
        id: goal.id,
        reason: "Combat must be resolved first"
      });

      // Emit the new combat goal
      this.emit("goal:created", {
        id: combatGoal.id,
        description: combatGoal.description
      });
      
      return;
    }

    // Handle other types of failures
    this.goalManager.updateGoalStatus(goal.id, "failed");

    // If this was a sub-goal, mark parent as blocked
    if (goal.parentGoal) {
      const parentGoal = this.goalManager.getGoalById(goal.parentGoal);
      if (parentGoal && parentGoal.status !== "completed") {
        this.goalManager.updateGoalStatus(goal.parentGoal, "blocked");
      }
    }

    this.emit("goal:failed", {
      id: goal.id,
      error: errorMessage
    });
  }

  private async validateGoalSuccess(goal: any): Promise<boolean> {
    const prompt = `
      <goal_validation>
      Goal: ${goal.description}
      
      Success Criteria:
      ${goal.success_criteria.map((c: string) => `- ${c}`).join("\n")}
      
      Current Context:
      ${JSON.stringify(this.context, null, 2)}
      
      Recent Steps:
      ${JSON.stringify(this.stepManager.getSteps().slice(-5), null, 2)}
      
      Based on the success criteria and current context, has this goal been achieved?
      Return only a JSON object with: { "success": boolean, "reason": string }
      </goal_validation>
    `;

    try {
      const response = await this.llmClient.analyze(prompt, {
        system:
          "You are a goal validation system that carefully checks success criteria against the current context.",
      });

      const result = JSON.parse(response.toString());

      if (result.success) {
        this.addStep(
          `Goal validated as successful: ${result.reason}`,
          "system",
          ["goal-validation"]
        );
      } else {
        this.addStep(`Goal validation failed: ${result.reason}`, "system", [
          "goal-validation",
        ]);
      }

      return result.success;
    } catch (error) {
      this.logger.error("validateGoalSuccess", "Goal validation failed", {
        error,
      });
      return false;
    }
  }

  private logContext(trigger: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] Context changed by: ${trigger}\n${JSON.stringify(
      this.context,
      null,
      2
    )}\n${"=".repeat(80)}\n`;

    try {
      fs.appendFileSync(this.contextLogPath, logEntry);
    } catch (error) {
      this.logger.error("logContext", "Failed to write context log", { error });
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
      id: this.generateUniqueId(),
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
   * Insert a new step at a specified index in the chain.
   * Useful if you need to adjust or backtrack the chain of thought.
   * @param index The position where the new step should be inserted.
   * @param content The content of the new step.
   * @param tags Optional tags for the step.
   * @param meta Optional metadata.
   */
  public insertStep(
    index: number,
    content: string,
    tags?: string[],
    meta?: Record<string, any>
  ): Step {
    this.logger.debug("insertStep", "Inserting step at index", {
      index,
      content,
      tags,
      meta,
    });

    if (index < 0 || index > this.stepManager.getSteps().length) {
      const error = `Invalid index: ${index}. Index must be between 0 and ${
        this.stepManager.getSteps().length
      }`;
      this.logger.error("insertStep", error);
      throw new Error(error);
    }

    const newStep: Step = {
      id: this.generateUniqueId(),
      type: "action",
      content,
      timestamp: Date.now(),
      tags,
      meta,
    } as Step;

    this.stepManager.getSteps().splice(index, 0, newStep);
    return newStep;
  }

  /**
   * Update the content of an existing step.
   * @param stepId Unique identifier for the step to be updated.
   * @param newContent The new textual content.
   */
  public updateStepContent(stepId: string, newContent: string): void {
    this.logger.debug("updateStepContent", "Updating step content", {
      stepId,
      newContent,
    });

    const step = this.stepManager.getStepById(stepId);
    if (step && "content" in step) {
      (step as { content: string; timestamp: number }).content = newContent;
      (step as { content: string; timestamp: number }).timestamp = Date.now();
    } else {
      this.logger.warn("updateStepContent", "Step not found or invalid type", {
        stepId,
      });
    }
  }

  /**
   * Retrieve the entire chain of steps.
   */
  public getSteps(): Step[] {
    return this.stepManager.getSteps();
  }

  /**
   * Retrieve the current context.
   */
  public getContext(): ChainOfThoughtContext {
    return this.context;
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

    this.logContext("MERGE_CONTEXT");
  }

  /**
   * Add (push) a context snapshot to keep track of changes over time.
   */
  public snapshotContext(): void {
    this.logger.debug("snapshotContext", "Creating context snapshot");

    const snapshot = JSON.parse(JSON.stringify(this.context));
    this.snapshots.push(snapshot);

    this.logContext("SNAPSHOT_CREATED");
  }

  /**
   * Retrieve all snapshots.
   */
  public getSnapshots(): ChainOfThoughtContext[] {
    return this.snapshots;
  }

  /**
   * A central method to handle CoT actions that might be triggered by the LLM.
   * @param action The action to be executed.
   */
  public async executeAction(action: CoTAction): Promise<string> {
    this.logger.debug("executeAction", "Executing action", { action });
    this.emit("action:start", action);

    // Add action step at the start
    const actionStep = this.addStep(
      `Executing action: ${action.type}`,
      "action",
      ["action-execution"],
      { action }
    );

    console.log("log", action);

    try {
      const result = await (async () => {
        switch (action.type) {
          case "SYSTEM_PROMPT":
            // Handle system prompt by asking user
            const userResponse = await askUser(action.payload.prompt);
            return userResponse;

          case "GRAPHQL_FETCH":
            return await this.graphqlFetchAction(action.payload);

          case "EXECUTE_TRANSACTION":
            return this.runTransaction(action.payload as CoTTransaction);

          case "READ_CONTRACT":
            return this.readContractAction(action.payload as CoTContractRead);

          default:
            this.logger.warn("executeAction", "Unknown action type", {
              actionType: action.type,
            });
            return "Unknown action type: " + action.type;
        }
      })();

      // Update the action step with the result
      this.stepManager.updateStep(actionStep.id, {
        content: `Action completed: ${result}`,
        meta: { ...actionStep.meta, result },
      });

      // Store the result in context
      this.mergeContext({
        actionHistory: {
          ...(this.context.actionHistory || {}),
          [Date.now()]: {
            action,
            result,
          },
        },
      });

      this.emit("action:complete", { action, result });
      return result;
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

  private async graphqlFetchAction(
    payload?: Record<string, any>
  ): Promise<string> {
    this.logger.debug("graphqlFetchAction", "Executing GraphQL fetch", {
      payload,
    });

    // Example of expected fields in the payload
    const { query, variables } = payload || {};

    const result = await fetchData(query, variables);

    const resultStr =
      `query: ` + query + `\n\nresult: ` + JSON.stringify(result, null, 2);

    return resultStr;
  }

  /**
   * Execute a "transaction" that can modify the chain of thought, the context,
   * or even the game state. The specifics are up to your design.
   */
  private async runTransaction(transaction: CoTTransaction): Promise<string> {
    this.logger.debug("runTransaction", "Running transaction", { transaction });

    // Add step to indicate transaction is pending
    const pendingStep = this.addStep(
      `Transaction pending: ${transaction.entrypoint}`,
      "action",
      ["transaction", "pending"]
    );

    try {
      // Check for active combat before allowing explore
      if (transaction.entrypoint === 'explore') {
        const beastCheck = await executeStarknetRead({
          contractAddress: transaction.contractAddress,
          entrypoint: 'get_attacking_beast',
          calldata: transaction.calldata.slice(0, 1) // Just the adventurer_id
        });
        
        if (beastCheck && Object.keys(beastCheck).length > 0) {
          throw new Error('Cannot explore while in combat. Must attack or flee first.');
        }
      }

      // Await the transaction result
      const result = await executeStarknetTransaction(transaction);
      
      // Update step to show transaction completed
      this.stepManager.updateStep(pendingStep.id, {
        content: `Transaction completed: ${transaction.entrypoint}`,
        tags: ["transaction", "completed"]
      });

      // Parse response based on entrypoint
      let parsedResult;
      switch (transaction.entrypoint) {
        case 'explore':
          if (result?.data) {
            const exploreResults = [];
            for (let i = 0; i < result.data.length; i++) {
              const value = Number(BigInt(result.data[i] || '0x0'));
              switch (value) {
                case 0: exploreResults.push('Beast');
                  break;
                case 1: exploreResults.push('Obstacle');
                  break;
                case 2: exploreResults.push('Discovery');
                  break;
              }
            }
            parsedResult = {
              results: exploreResults
            };
          }
          break;

        case 'attack':
          if (result?.data) {
            parsedResult = {
              damage_dealt: Number(BigInt(result.data[0] || '0x0')),
              damage_taken: Number(BigInt(result.data[1] || '0x0')),
              beast_slain: result.data[2] === '0x1',
              xp_earned: Number(BigInt(result.data[3] || '0x0')),
              gold_earned: Number(BigInt(result.data[4] || '0x0'))
            };
          }
          break;

        case 'flee':
          if (result?.data) {
            parsedResult = {
              success: result.data[0] === '0x1',
              damage_taken: Number(BigInt(result.data[1] || '0x0'))
            };
          }
          break;

        case 'equip':
          if (result?.data) {
            parsedResult = {
              success: result.data[0] === '0x1',
              equipped_items: result.data.slice(1).map((item: string) => Number(BigInt(item || '0x0')))
            };
          }
          break;

        case 'upgrade':
          if (result?.data) {
            parsedResult = {
              success: result.data[0] === '0x1',
              stats: {
                strength: Number(BigInt(result.data[1] || '0x0')),
                dexterity: Number(BigInt(result.data[2] || '0x0')),
                vitality: Number(BigInt(result.data[3] || '0x0')),
                intelligence: Number(BigInt(result.data[4] || '0x0')),
                wisdom: Number(BigInt(result.data[5] || '0x0')),
                charisma: Number(BigInt(result.data[6] || '0x0')),
                luck: Number(BigInt(result.data[7] || '0x0'))
              },
              potions: Number(BigInt(result.data[8] || '0x0')),
              items: result.data.slice(9).map((item: string, i: number) => ({
                item_id: Number(BigInt(item || '0x0')),
                equip: result.data[9 + i + 1] === '0x1'
              }))
            };
          }
          break;
      }

      // Update context with transaction result
      if (parsedResult) {
        this.mergeContext({
          lastTransactionResult: {
            entrypoint: transaction.entrypoint,
            result: parsedResult,
            timestamp: Date.now()
          }
        });
        return JSON.stringify(parsedResult, null, 2);
      }

      // Default case - return raw result
      return JSON.stringify(result || {}, null, 2);

    } catch (error) {
      // Update step to show transaction failed
      this.stepManager.updateStep(pendingStep.id, {
        content: `Transaction failed: ${error}`,
        tags: ["transaction", "failed"],
        meta: { error }
      });
      throw error;
    }
  }

  private async readContractAction(contractRead: CoTContractRead): Promise<string> {
    // Add step to indicate read is pending
    const pendingStep = this.addStep(
      `Contract read pending: ${contractRead.entrypoint}`,
      "action",
      ["contract-read", "pending"]
    );

    try {
      // Await the read result
      const result = await executeStarknetRead(contractRead);
      
      // Update step to show read completed
      this.stepManager.updateStep(pendingStep.id, {
        content: `Contract read completed: ${contractRead.entrypoint}`,
        tags: ["contract-read", "completed"]
      });

      let parsedResult;
      // Parse response based on entrypoint
      switch (contractRead.entrypoint) {
        case 'get_adventurer':
          if (Array.isArray(result)) {
            const adventurer = {
              health: Number(BigInt(result[0] || '0x0')),
              xp: Number(BigInt(result[1] || '0x0')),
              gold: Number(BigInt(result[2] || '0x0')),
              beast_health: Number(BigInt(result[3] || '0x0')),
              stat_upgrades_available: Number(BigInt(result[4] || '0x0')),
              stats: {
                strength: Number(BigInt(result[5] || '0x0')),
                dexterity: Number(BigInt(result[6] || '0x0')),
                vitality: Number(BigInt(result[7] || '0x0')),
                intelligence: Number(BigInt(result[8] || '0x0')),
                wisdom: Number(BigInt(result[9] || '0x0')),
                charisma: Number(BigInt(result[10] || '0x0')),
                luck: Number(BigInt(result[11] || '0x0'))
              },
              equipment: {
                weapon: { id: Number(BigInt(result[12] || '0x0')), xp: Number(BigInt(result[13] || '0x0')) },
                chest: { id: Number(BigInt(result[14] || '0x0')), xp: Number(BigInt(result[15] || '0x0')) },
                head: { id: Number(BigInt(result[16] || '0x0')), xp: Number(BigInt(result[17] || '0x0')) },
                waist: { id: Number(BigInt(result[18] || '0x0')), xp: Number(BigInt(result[19] || '0x0')) },
                foot: { id: Number(BigInt(result[20] || '0x0')), xp: Number(BigInt(result[21] || '0x0')) },
                hand: { id: Number(BigInt(result[22] || '0x0')), xp: Number(BigInt(result[23] || '0x0')) },
                neck: { id: Number(BigInt(result[24] || '0x0')), xp: Number(BigInt(result[25] || '0x0')) },
                ring: { id: Number(BigInt(result[26] || '0x0')), xp: Number(BigInt(result[27] || '0x0')) }
              },
              battle_action_count: Number(BigInt(result[28] || '0x0')),
              mutated: result[29] === '0x1',
              awaiting_item_specials: result[30] === '0x1'
            };
            parsedResult = adventurer;
          }
          break;

        case 'get_attacking_beast':
          if (Array.isArray(result)) {
            const beast = {
              id: Number(BigInt(result[0] || '0x0')),
              starting_health: Number(BigInt(result[1] || '0x0')),
              combat_spec: {
                tier: Number(BigInt(result[2] || '0x0')),
                item_type: Number(BigInt(result[3] || '0x0')),
                level: Number(BigInt(result[4] || '0x0')),
                specials: {
                  special1: Number(BigInt(result[5] || '0x0')),
                  special2: Number(BigInt(result[6] || '0x0')),
                  special3: Number(BigInt(result[7] || '0x0'))
                }
              }
            };
            parsedResult = beast;
          }
          break;

        case 'get_market':
          if (Array.isArray(result)) {
            parsedResult = [];
            for (let i = 0; i < result.length; i++) {
              parsedResult.push(Number(BigInt(result[i] || '0x0')));
            }
          }
          break;

        case 'get_bag':
          if (Array.isArray(result)) {
            const bag = {
              items: Array.from({length: 15}, (_, i) => ({
                id: Number(BigInt(result[i*2] || '0x0')),
                xp: Number(BigInt(result[i*2 + 1] || '0x0'))
              })),
              mutated: result[30] === '0x1'
            };
            parsedResult = bag;
          }
          break;

        case 'get_potion_price':
          if (Array.isArray(result) && result.length > 0) {
            parsedResult = Number(BigInt(result[0] || '0x0'));
          }
          break;

        case 'get_item_specials':
          if (Array.isArray(result)) {
            parsedResult = [];
            for (let i = 0; i < result.length; i += 2) {
              parsedResult.push({
                item_id: Number(BigInt(result[i] || '0x0')),
                special_power: {
                  special1: Number(BigInt(result[i + 1] || '0x0')),
                  special2: Number(BigInt(result[i + 2] || '0x0')),
                  special3: Number(BigInt(result[i + 3] || '0x0'))
                }
              });
            }
          }
          break;
      }

      // Update context with read result
      if (parsedResult) {
        this.mergeContext({
          lastContractRead: {
            entrypoint: contractRead.entrypoint,
            result: parsedResult,
            timestamp: Date.now()
          }
        });
        return JSON.stringify(parsedResult, null, 2);
      }

      // Default case - return raw result
      return JSON.stringify(result || [], null, 2);

    } catch (error) {
      // Update step to show read failed
      this.stepManager.updateStep(pendingStep.id, {
        content: `Contract read failed: ${error}`,
        tags: ["contract-read", "failed"],
        meta: { error }
      });
      throw error;
    }
  }

  /**
   * Generate a unique ID for steps. In a real environment,
   * you might use a library like uuid to ensure uniqueness.
   */
  private generateUniqueId(): string {
    // Quick example ID generator
    return "step-" + Math.random().toString(36).substring(2, 15);
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
   * High-level method that:
   * 1. Builds a prompt from the chain & context
   * 2. Calls the LLM
   * 3. Validates and parses the response
   * 4. Executes or applies the returned plan & actions
   */
  public async callAndProcess(
    query: string,
    maxRetries: number = 3
  ): Promise<LLMStructuredResponse> {
    this.logger.debug("callAndProcess", "Starting LLM call", {
      maxRetries,
    });

    let attempts = 0;

    while (attempts < maxRetries) {
      // 1. Build the prompt
      const prompt = this.buildPrompt({ query });

      // 2. Send the prompt to the LLM and get a structured response
      try {
        const llmRawResponse = await this.callModel(prompt);

        // Parse the response
        let llmResponse: LLMStructuredResponse;
        try {
          llmResponse = JSON.parse(llmRawResponse) as LLMStructuredResponse;
        } catch (err) {
          this.logger.error(
            "callAndProcess",
            "Failed to parse LLM response as JSON",
            {
              error: err instanceof Error ? err.message : String(err),
              response: llmRawResponse,
            }
          );
          attempts++;
          continue;
        }

        // Validate the response structure
        if (!queryValidator(llmResponse)) {
          this.logger.error(
            "callAndProcess",
            "LLM response failed validation",
            {
              response: llmResponse,
            }
          );
          attempts++;
          continue;
        }

        // 3. Extract the plan and add it as a step
        if (llmResponse.plan) {
          this.addStep(`${llmResponse.plan}`, "planning", ["llm-plan"]);
        }

        // If we get here, everything worked
        return llmResponse;
      } catch (err) {
        this.logger.error("callAndProcess", "Error in LLM processing", {
          error: err instanceof Error ? err.message : String(err),
          attempt: attempts + 1,
        });
        attempts++;
      }
    }

    // If we get here, we've exhausted all retries
    const error = `Failed to get valid LLM response after ${maxRetries} attempts`;
    this.logger.error("callAndProcess", error);
    throw new Error(error);
  }

  /**
   * Build a prompt that instructs the LLM to produce structured data.
   * You can adapt the instructions, tone, or style as needed.
   */
  private buildPrompt(tags: Record<string, string> = {}): string {
    this.logger.debug("buildPrompt", "Building LLM prompt");

    // You can control how many steps or which steps to send
    // For example, let's just send the last few steps:
    const lastSteps = JSON.stringify(this.stepManager.getSteps());

    // Replace any {{tag}} with the provided value or leave unchanged

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

${this.context.queriesAvailable}

${this.context.availableActions}

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
- actions: A list of actions to be executed. You can use GRAPHQL_FETCH, EXECUTE_TRANSACTION, or READ_CONTRACT. You must only use these.

{{output_format_details}}

Provide a JSON response with the following structure (this is an example only):

{
  "plan": "A short explanation of what you will do",
      "meta": {
      "requirements": {},
  "actions": [
        {
          type: "GRAPHQL_FETCH",
          payload: {
            query: "query GetRealmInfo { eternumRealmModels(where: { realm_id: 42 }) { edges { node { ... on eternum_Realm { entity_id level } } }",
          },
        },
        {
          type: "EXECUTE_TRANSACTION",
          payload: {
              contractAddress: "0x1234567890abcdef",
              entrypoint: "execute",
              calldata: [1, 2, 3],
          },
        },
        {
          type: "READ_CONTRACT",
          payload: {
            contractAddress: "0x1234567890abcdef",
            entrypoint: "get_attacking_beast",
          },
        },
  ]
}

</OUTPUT_FORMAT>

Do NOT include any additional keys outside of "plan" and "actions".
Make sure the JSON is valid. No extra text outside of the JSON.

</global_context>
`;

    return injectTags(tags, prompt);
  }

  private async callModel(prompt: string): Promise<string> {
    this.logger.debug("callModel", "Sending prompt to LLM");

    const response = await this.llmClient.analyze(prompt, {
      system: `"You are a reasoning system that outputs structured JSON only."`,
    });

    // Make sure we're dealing with a string
    let responseStr: string;

    if (typeof response === "string") {
      responseStr = response;
    } else if (typeof response === "object") {
      responseStr = JSON.stringify(response);
    } else {
      const error = `Unexpected response type from LLM: ${typeof response}`;
      this.logger.error("callModel", error);
      throw new Error(error);
    }

    this.logger.debug("callModel", "Received LLM response", {
      response: JSON.parse(responseStr),
    });

    return responseStr;
  }

  public async think(
    userQuery: string,
    maxIterations: number = 10
  ): Promise<void> {
    this.emit("think:start", { query: userQuery });

    try {
      this.logger.debug("think", "Beginning to think", {
        userQuery,
        maxIterations,
      });

      // Initialize with user query
      this.addStep(`User Query: ${userQuery}`, "task", ["user-query"]);

      let currentIteration = 0;
      let isComplete = false;
      const llmResponse = await this.callAndProcess(userQuery);
      let pendingActions: CoTAction[] = [...llmResponse.actions];

      while (
        !isComplete &&
        currentIteration < maxIterations &&
        pendingActions.length > 0
      ) {
        this.logger.debug("think", "Processing iteration", {
          currentIteration,
        });

        // Process one action at a time
        if (pendingActions.length > 0) {
          const currentAction = pendingActions.shift()!;
          this.logger.debug("think", "Processing action", {
            action: currentAction,
            remainingActions: pendingActions.length,
          });

          // Validate action before execution
          if (!currentAction.type || !currentAction.payload) {
            this.logger.error("think", "Invalid action structure", {
              action: currentAction,
            });
            throw new Error(
              `Invalid action structure: ${JSON.stringify(currentAction)}`
            );
          }

          try {
            // Execute action and await result
            const result = await this.executeAction(currentAction);

            // Wait for context to be updated with the result
            await new Promise(resolve => setTimeout(resolve, 100));

            const updateContext = this.buildPrompt({ result });
            
            // Check completion status - await the response
            const completionCheck = await this.llmClient.analyze(
              `
              ${updateContext}

             ${JSON.stringify({
               query: userQuery,
               currentSteps: this.stepManager.getSteps(),
               lastAction: currentAction.toString() + " RESULT:" + result,
             })},
             <verification_rules>
              Analyze using Chain of Verification:
1. The original query/goal - Verify the exact requirements
2. All steps taken so far - Verify each step was completed successfully
3. The current context - Verify the current state matches expectations
4. The result of the last action - Verify the outcome was correct
5. Values will always be in hexadecimal so convert them to decimal for verification

For each verification:
- Check preconditions were met  
- Validate the execution was proper
- Confirm expected postconditions
- Look for any edge cases or errors

Determine through verification:
- Has the goal been achieved OR determined to be impossible? (complete)
- What specific verifications led to your determination? (reason)
- Should the system continue only if resources are available? (shouldContinue)

Only return a JSON object with this exact structure:

{
  "complete": boolean,
  "reason": "detailed explanation of verification results",
  "shouldContinue": boolean,
  "newActions": [] // Only include if continuing and resources are available and search <global_context> for more details
}

Do not include any text outside the JSON object. Do not include backticks, backslashes, markdown formatting, or explanations.

</verification_rules>
                `,
              {
                system: `You are a goal completion analyzer using Chain of Verification. Your task is to carefully evaluate whether a goal has been achieved or is impossible based on the provided context. Use <verification_rules> to guide your analysis.
`,
              }
            );

            console.log(completionCheck);

            try {
              const completion = JSON.parse(completionCheck.toString());
              isComplete = completion.complete;

              if (completion.newActions) {
                // Extract actions from each plan in newActions
                const extractedActions = completion.newActions.flatMap(
                  (plan: any) => plan.actions || []
                );
                pendingActions.unshift(...extractedActions);
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
              this.logger.error(
                "solveQuery",
                "Error parsing completion check",
                {
                  error: error instanceof Error ? error.message : String(error),
                  completionCheck,
                }
              );
              continue;
            }
          } catch (error) {
            this.emit("think:error", { query: userQuery, error });
            throw error;
          }
        }

        currentIteration++;
      }

      if (currentIteration >= maxIterations) {
        const error = `Failed to solve query "${userQuery}" within ${maxIterations} iterations`;
        this.logger.error("solveQuery", error);
        this.emit("think:timeout", { query: userQuery });
      }
    } catch (error) {
      this.emit("think:error", { query: userQuery, error });
      throw error;
    }
  }
}

// Add type definitions for the events
export interface ChainOfThoughtEvents {
  step: (step: Step) => void;
  "action:start": (action: CoTAction) => void;
  "action:complete": (data: { action: CoTAction; result: string }) => void;
  "action:error": (data: { action: CoTAction; error: Error | unknown }) => void;
  "think:start": (data: { query: string }) => void;
  "think:complete": (data: { query: string }) => void;
  "think:timeout": (data: { query: string }) => void;
  "think:error": (data: { query: string; error: Error | unknown }) => void;
  "goal:created": (goal: { id: string; description: string }) => void;
  "goal:updated": (goal: { id: string; status: GoalStatus }) => void;
  "goal:completed": (goal: { id: string; result: any }) => void;
  "goal:failed": (goal: { id: string; error: Error | unknown }) => void;
  "goal:started": (goal: { id: string; description: string }) => void;
  "goal:blocked": (goal: { id: string; reason: string }) => void;
}

// Add type safety to event emitter
export declare interface ChainOfThought {
  on<K extends keyof ChainOfThoughtEvents>(
    event: K,
    listener: ChainOfThoughtEvents[K]
  ): this;
  emit<K extends keyof ChainOfThoughtEvents>(
    event: K,
    ...args: Parameters<ChainOfThoughtEvents[K]>
  ): boolean;
}
