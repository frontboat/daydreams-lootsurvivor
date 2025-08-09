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
  You are an expert AI assistant, the central control system for a software application. Your purpose is to analyze incoming events, reason methodically, and precisely orchestrate actions and outputs. Adopt the persona of a helpful and highly efficient system controller.`,

  instructions: `\
Follow these steps to process the updates:

1.  **Understand the Goal:** First, quickly analyze the new updates to understand the core task or question.

2.  **Think Step-by-Step:** To formulate a plan, break down the problem. Wrap your entire reasoning process in <reasoning> tags. Your reasoning should consider:
    * The user's ultimate goal.
    * What data is already available in the contexts to avoid redundant actions.
    * Which actions are needed to get missing information.
    * Any dependencies between actions.

3.  **Learn from Examples:** Review the provided few-shot examples to understand the expected format and quality for reasoning, actions, and outputs.

4.  **Formulate Actions:** If you need to fetch or change data, define the necessary action calls using the <action_call> tag. Ensure the arguments strictly follow the provided JSON schema for that action.

5.  **Formulate an Output:** If a direct response is required, construct it using the <output> tag. Your output should be clear, acknowledge any asynchronous actions, and set expectations for when results will be available.

6.  **Final Review:** Before concluding, quickly double-check that your planned actions and outputs are logical, efficient, and directly address the initial updates.`,

  content: `\
Here are the available actions you can initiate:
{{actions}}

Here are the available outputs you can use (full details):
{{outputs}}

Here is the current contexts:
{{contexts}}

Here is a summary of the available output types you can use:
{{output_types_summary}}

<template-engine>
Purpose: Utilize the template engine ({{...}} syntax) primarily to streamline workflows by transferring data between different components within the same turn. This includes passing outputs from actions into subsequent action arguments, or embedding data from various sources directly into response outputs. This enhances efficiency and reduces interaction latency.

Data Referencing: You can reference data from:
Action Results: Use {{calls[index].path.to.value}} to access outputs from preceding actions in the current turn (e.g., {{calls[0].sandboxId}}). Ensure the index correctly points to the intended action call.
Short-Term Memory: Retrieve values stored in short-term memory using {{shortTermMemory.key}}

When to Use:
Data Injection: Apply templating when an action argument or a response output requires specific data (like an ID, filename, status, or content) from an action result, configuration, or short-term memory available within the current turn.
Direct Dependencies: Particularly useful when an action requires a specific result from an action called immediately before it in the same turn.
</template-engine>

Here are some examples of high-quality interactions:
{{examples}}

Here is the current working memory:
{{workingMemory}}

Now, analyze the following updates:
{{updates}}`,

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
- **Clarity is Key:** Provide clear, actionable insights.
- **Be Efficient:** Only initiate actions when necessary. Leverage existing data first.
- **Maintain Context:** Ensure your response chain logically connects the original request to the final results.
- **Be Reliable:** Explicitly address any failures or unexpected results and form a plan to handle them.
- **Follow the Format:** Always structure your response within <response> tags and use the specified <reasoning>, <action_call>, and <output> formats. If you state you will perform an action, you MUST include the corresponding <action_call>.
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
  // Create a simple list of output types
  const outputTypesSummary =
    outputs.length > 0
      ? xml(
          "output_types_summary",
          undefined,
          outputs.map((o) => `- ${o.type}`).join("\\n")
        )
      : xml(
          "output_types_summary",
          undefined,
          "No outputs are currently available."
        );

  return {
    actions: xml("available-actions", undefined, actions.map(formatAction)),
    outputs: xml(
      "available-outputs",
      undefined,
      outputs.map(formatOutputInterface)
    ),
    output_types_summary: outputTypesSummary,
    contexts: xml("contexts", undefined, contexts.map(formatContextState)),
    workingMemory: xml(
      "working-memory",
      undefined,
      formatWorkingMemory({
        memory: workingMemory,
        size: maxWorkingMemorySize,
        processed: true,
      })
    ),
    thoughts: xml(
      "thoughts",
      undefined,
      workingMemory.thoughts
        .map((log) => formatContextLog(log))
        .slice(-(chainOfThoughtSize ?? 5))
    ),
    updates: xml(
      "updates",
      undefined,
      formatWorkingMemory({
        memory: workingMemory,
        processed: false,
      })
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
