import { formatWorkingMemory } from "../context";
import {
  formatAction,
  formatContextLog,
  formatContextState,
  formatOutputInterface,
  render,
  xml,
} from "../formatters";
import type { Prompt } from "../prompt";
import type {
  AnyAction,
  AnyContext,
  ContextState,
  Output,
  WorkingMemory,
} from "../types";
import type { MemoryResult } from "../memory/types";
/*

## Instructions
- If asked for something - never do a summary unless you are asked to do a summary. Always respond with the exact information requested.
- You must use the available actions and outputs to respond to the context.
- You must reason about the context, think, and planned actions.
- IMPORTANT: If you state that you will perform an action, you MUST issue the corresponding action call. Do not say you will do something without actually issuing the action call.
- IMPORTANT: Never end your response with a plan to do something without actually doing it. Always follow through with action calls.
- When you determine that no further actions or outputs are needed and the flow should end, use the <finalize/> tag to indicate completion.
*/
export const templateSections = {
  intro: `\
  You are an expert AI assistant acting as the control system for a software application. Your goal is to analyze the current situation, reason methodically, and generate the appropriate actions and outputs to complete the active task.`,

  instructions: `\
Follow these steps to process the current situation:

1.  **Understand the Active Task:** Review the Current Situation section to understand what needs immediate attention and what operations are in progress.

2.  **Think Step-by-Step:** Plan your approach systematically. Wrap your entire reasoning process in <reasoning> tags. Your reasoning should consider:
    * What specific task needs to be completed based on the active task section.
    * What contextual knowledge and recent history inform your approach.
    * Which available tools (actions/outputs) are most appropriate.
    * Any dependencies between planned actions.
    * How to build efficiently on existing operations and context.

3.  **Learn from Examples:** Reference the provided interaction examples for format and quality standards.

4.  **Execute Actions:** Use available actions to gather data, perform operations, or change state. Ensure action arguments follow the provided schemas exactly.

5.  **Provide Output:** When direct response is needed, use appropriate output types. Be clear about any asynchronous operations and set proper expectations.

6.  **Verify Completion:** Ensure your response addresses the active task completely and efficiently leverages available contextual knowledge.`,

  content: `\
## CURRENT SITUATION

### Active Task
{{currentTask}}

### Context State
{{contextState}}

### Operations in Progress
{{activeOperations}}

---

## AVAILABLE TOOLS

### Actions You Can Initiate
{{actions}}

### Output Methods
{{outputs}}

### Template Engine
<template-engine>
Purpose: Utilize the template engine ({{...}} syntax) primarily to streamline workflows by transferring data between different components within the same turn. This includes passing outputs from actions into subsequent action arguments, or embedding data from various sources directly into response outputs. This enhances efficiency and reduces interaction latency.

Data Referencing: You can reference data from:
Action Results: Use {{calls[index].path.to.value}} to access outputs from preceding actions in the current turn (e.g., {{calls[0].sandboxId}}). Ensure the index correctly points to the intended action call.
Short-Term Memory: Retrieve values stored in short-term memory using {{shortTermMemory.key}}

When to Use:
Data Injection: Apply templating when an action argument or a response output requires specific data (like an ID, filename, status, or content) from an action result, configuration, or short-term memory available within the current turn.
Direct Dependencies: Particularly useful when an action requires a specific result from an action called immediately before it in the same turn.
</template-engine>

---

## CONTEXTUAL KNOWLEDGE

### Relevant Prior Knowledge
{{semanticContext}}

### Recent Interaction History
{{recentHistory}}

### Decision Context
{{decisionContext}}

### Examples of High-Quality Interactions
{{examples}}`,

  response: `\
Here's how you structure your response:
<response>
<reasoning>
[Your detailed, step-by-step reasoning about the context, messages, and planned actions, demonstrating your thought process.]
</reasoning>

[List of async action calls to be initiated, if applicable. The arguments MUST be valid JSON.]
<action_call name="[Action name]">[action arguments using the schema and format]</action_call>

[List of outputs, if applicable.]
<output type="[Output type]" {...output attributes using the attributes_schema}>
[output content using the content_schema]
</output>
</response>

IMPORTANT ACTION CALL FORMAT:
- Use XML format with a 'name' attribute: <action_call name="actionName">{"arg": "value"}</action_call>
- The action name goes in the XML attribute.
- The content within the tags must be a valid JSON object representing the action's arguments.`,

  footer: `\
Guiding Principles for Your Response:
- **Situational Awareness:** Always start by understanding the current active task and context state.
- **Efficient Resource Use:** Leverage recent interaction history and decision context before initiating new actions.
- **Progressive Building:** Build on active operations rather than starting from scratch.
- **Clear Communication:** Provide actionable insights that connect your reasoning to specific outcomes.
- **Reliable Execution:** Address any failures explicitly and adjust your approach based on available context.
- **Format Adherence:** Use <response>, <reasoning>, <action_call>, and <output> tags correctly. If you state you will perform an action, you MUST include the corresponding action call.
`,
} as const;

export const promptTemplate = `\
{{intro}}

{{instructions}}

{{content}}

{{response}}

{{footer}}
`;

export function formatPromptSections({
  contexts,
  outputs,
  actions,
  workingMemory,
  maxWorkingMemorySize,
  chainOfThoughtSize,
}: {
  contexts: ContextState<AnyContext>[];
  outputs: Output[];
  actions: AnyAction[];
  workingMemory: WorkingMemory;
  maxWorkingMemorySize?: number;
  chainOfThoughtSize?: number;
}) {
  // Get unprocessed items that need attention
  const unprocessedLogs = [
    ...(workingMemory.inputs?.filter((log) => !log.processed) ?? []),
    ...(workingMemory.calls?.filter((log) => !log.processed) ?? []),
    ...(workingMemory.results?.filter((log) => !log.processed) ?? []),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Get pending action calls
  const pendingActions =
    workingMemory.calls?.filter((call) => {
      const hasResult = workingMemory.results?.some(
        (result) => result.callId === call.id
      );
      return !hasResult;
    }) ?? [];

  // Get recent conversation flow (processed inputs/outputs)
  const recentConversation = [
    ...(workingMemory.inputs?.filter((log) => log.processed) ?? []),
    ...(workingMemory.outputs?.filter((log) => log.processed) ?? []),
  ]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-(maxWorkingMemorySize ?? 10));

  // Get key reasoning from recent thoughts
  const keyThoughts =
    workingMemory.thoughts
      ?.slice(-(chainOfThoughtSize ?? 3))
      ?.map((log) => formatContextLog(log)) ?? [];

  // Format relevant memories for semantic context
  const formatMemory = (memory: MemoryResult) => {
    const score = memory.score
      ? ` (relevance: ${(memory.score * 100).toFixed(0)}%)`
      : "";
    const timestamp = memory.timestamp
      ? ` [${new Date(memory.timestamp).toLocaleString()}]`
      : "";

    if (memory.type === "episode") {
      return `**Episode Memory**${score}${timestamp}: ${JSON.stringify(
        memory.content
      )}`;
    } else if (memory.type === "episode") {
      return `**${memory.type} Episode**${score}${timestamp}: ${JSON.stringify(
        memory.content
      )}`;
    } else {
      return `**${
        memory.type || "Memory"
      }**${score}${timestamp}: ${JSON.stringify(memory.content)}`;
    }
  };

  const relevantMemories =
    workingMemory.relevantMemories && workingMemory.relevantMemories.length > 0
      ? workingMemory.relevantMemories.map(formatMemory)
      : ["No relevant memories found."];

  return {
    // CURRENT SITUATION
    currentTask: xml(
      "current-task",
      undefined,
      unprocessedLogs.length > 0
        ? unprocessedLogs.map((log) => formatContextLog(log))
        : ["No pending tasks."]
    ),
    contextState: xml(
      "context-state",
      undefined,
      contexts.map(formatContextState)
    ),
    activeOperations: xml(
      "active-operations",
      undefined,
      pendingActions.length > 0
        ? pendingActions.map((call) => formatContextLog(call))
        : ["No operations in progress."]
    ),

    // AVAILABLE TOOLS
    actions: xml(
      "available-actions",
      undefined,
      actions.length > 0 ? actions.map(formatAction) : ["No actions available."]
    ),
    outputs: xml(
      "available-outputs",
      undefined,
      outputs.length > 0
        ? outputs.map(formatOutputInterface)
        : ["No outputs available."]
    ),

    // CONTEXTUAL KNOWLEDGE
    semanticContext: xml("semantic-context", undefined, relevantMemories),
    recentHistory: xml(
      "recent-history",
      undefined,
      recentConversation.length > 0
        ? recentConversation.map((log) => formatContextLog(log))
        : ["No recent conversation history."]
    ),
    decisionContext: xml(
      "decision-context",
      undefined,
      keyThoughts.length > 0 ? keyThoughts : ["No recent reasoning available."]
    ),
  };
}

// WIP
export const mainPrompt = {
  name: "main",
  template: promptTemplate,
  sections: templateSections,
  render: (data: ReturnType<typeof formatPromptSections>) => {
    const sections = Object.fromEntries(
      Object.entries(mainPrompt.sections).map(([key, templateSection]) => [
        key,
        render(templateSection, data as any),
      ])
    ) as Record<keyof typeof templateSections, string>;
    return render(mainPrompt.template, sections);
  },
  formatter: formatPromptSections,
} as const;

export type PromptConfig = typeof mainPrompt;
