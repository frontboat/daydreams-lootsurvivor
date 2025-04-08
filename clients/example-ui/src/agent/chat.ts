import {
  action,
  context,
  ContextRef,
  extension,
  formatContextLog2,
  formatInput,
  formatWorkingMemory,
  formatXml,
  getWorkingMemoryLogs,
  input,
  Optional,
  output,
  xml,
} from "@daydreamsai/core";
import { z } from "zod";
import { artifact } from "./outputs";
import { planner } from "./planner";
import { sandboxContext } from "./sandbox";
import { serverTools } from "./serverTools";
import { mcpContext } from "./mcp";

export const chatContext = context({
  type: "chat",
  schema: { chatId: z.string() },
  key: (args) => args.chatId,
  create(): { title: string | undefined } {
    return {
      title: undefined,
    };
  },

  events: {
    "chat:title:updated": {},
  },

  render({ memory }) {
    const date = new Date();
    return `\
Chat title: ${memory.title}
Current ISO time is: ${date.toISOString()}, timestamp: ${date.getTime()}
  `;
  },
  maxSteps: 20,
  maxWorkingMemorySize: 100,
}).setActions([
  action({
    name: "chat.setTitle",
    description: "Sets the chat title",
    instructions: `\
The assistant should set the chat title if its undefined.
ensure it is not more than 80 characters long
the title should be a summary of the user's message
do not use quotes or colons
`,
    schema: z.object({ title: z.string() }),
    handler: ({ title }, { memory, emit }) => {
      memory.title = title;
      emit("chat:title:updated", {});
      return "Success";
    },
    onSuccess(result) {
      result.processed = true;
    },
    onError(err) {
      console.log(err);
    },
  }),
]);

export const chat = extension({
  name: "chat",
  contexts: {
    chat: chatContext,
  },
  inputs: {
    message: input({
      schema: { user: z.string(), content: z.string() },
      handler({ user, content }) {
        return {
          params: { user },
          data: content,
        };
      },
    }),
  },
  outputs: {
    message: output({
      required: true,
      schema: z.string(),
      instructions: "use markdown text",
      handler(data) {
        return {
          data: data,
          timestamp: Date.now(),
        };
      },
      examples: [
        `<output type="message">Hello! How can I assist you today?</output>`,
      ],
    }),
    artifact,
  },
});

const episodeSchema = z.object({
  id: z.string().describe("Unique identifier"),
  title: z.string().describe("Concise title"),
  start: z.number().describe("start timestamp"),
  end: z.number().describe("end timestamp"),
  summary: z.object({
    brief: z
      .string()
      .describe("Short, auto-generated or user-provided summary"),
    detailed: z
      .string()
      .optional()
      .describe("Optional longer, potentially abstractive summary"),
    confidence: z
      .number()
      .describe("AI's confidence in the summary accuracy (0.0 to 1.0)"),
  }),
  entities: z
    .array(
      z.object({ name: z.string(), type: z.string(), confidence: z.number() })
    )
    .optional()
    .describe("list of entites like people, places, etc"),
  keywords: z
    .array(z.object({ term: z.string(), relevance: z.number() }))
    .describe("Searchable keywords"),
  documents: z
    .array(z.string())
    .optional()
    .describe("documents used in this episode"),
  actionsUsed: z
    .array(z.string())
    .optional()
    .describe("actions used in this episode"),
  contextLinks: z
    .record(z.any())
    .optional()
    .describe("links to related contexts"),
  relationships: z
    .object({
      parent_episode_id: z.string().optional().nullable(),
      relation_type: z
        .string()
        .optional()
        .describe(
          "Describes the relationship (e.g., 'follow-up', 'sub-task', 'alternative')"
        ),
      related_episode_ids: z
        .array(z.string())
        .optional()
        .describe("Links to other relevant episodes (e.g., follow-ups)"),
    })
    .optional(),
  // content: z.string().describe("the memory of this episode"),
});

type EpisodeSchema = typeof episodeSchema;
type Episode = Optional<z.infer<EpisodeSchema>, "end">;

const t = episodeSchema
  .omit({
    start: true,
    end: true,
  })
  .extend({
    start: z.number().optional(),
  });

type z = z.infer<typeof t>;

const episodicMemory = context({
  type: "episodicMemory",
  schema: { id: z.string() },
  key: ({ id }) => id,
  create(): { episodes: Episode[] } {
    return {
      episodes: [],
    };
  },
  instructions: `\
**Episodic Memory Context Instructions:**

This context stores records of significant interactions, tasks, or events ('episodes') that occur during your conversations. Its purpose is to build a structured history that aids recall, understanding context over longer periods, and learning from past interactions.

**Key Principles:**
*   **Automatic & Manual Capture:** While the system may attempt to automatically identify episode boundaries based on conversation flow and task changes, you should use the \`episodicMemory\` actions to explicitly define important segments.
*   **Rich Context:** Aim to capture not just *what* happened, but also *why* (goals), *how* (actions, sentiment), and *outcomes*. Link episodes to relevant goals, artifacts, and other episodes.
*   **Structure & Relationships:** Utilize fields like \`relationships\` to build connections between episodes, creating a more coherent narrative of complex tasks or projects.
*   **Review & Refine:** Periodically review episodes. Use \`updateEpisode\` to correct inaccuracies, add detail, or adjust status. Encourage user feedback for refinement.

**When to Create/Manage Episodes:**
*   Starting a distinct new task or goal requested by the user.
*   Significant shifts in conversation topic.
*   Debugging sessions or complex problem-solving sequences.
*   Collaborative content creation phases (e.g., writing code, drafting documents).
*   Upon completion or failure of a significant task.
*   When summarizing a past interaction that wasn't captured live.`,
}).setActions([
  action({
    name: "episodicMemory.startEpisode",
    schema: episodeSchema
      .omit({
        start: true,
        end: true,
      })
      .extend({
        start: z.number().optional(),
      }),
    handler: (episode, { memory }) => {
      memory.episodes.push({
        ...episode,
        start: episode.start ?? Date.now(),
      });
      console.log({ episode });
      return "Saved";
    },
  }),
  action({
    name: "episodicMemory.endEpisode",
    schema: episodeSchema
      .omit({
        start: true,
        end: true,
      })
      .extend({
        end: z.number().optional(),
      }),
    handler: (data, { memory }) => {
      const episode = memory.episodes.find(
        (episode) => episode.id === data.id
      )!;
      Object.assign(episode, {
        ...data,
        end: data.end ?? Date.now(),
      });

      return "Saved";
    },
  }),
  action({
    name: "episodicMemory.createEpisode",
    schema: episodeSchema,
    handler: (args, { memory }) => {
      memory.episodes.push(args);
      console.log({ args });
      return "Saved";
    },
  }),
  action({
    name: "episodicMemory.updateEpisode",
    schema: episodeSchema,
    handler: (args, { memory }) => {
      const episode = memory.episodes.find(
        (episode) => episode.id === args.id
      )!;
      Object.assign(episode, args);
      return "Saved";
    },
  }),
]);

const shortTermMemory = context({
  type: "shortTermMemory",
  schema: { id: z.string() },
  key: ({ id }) => id,
  create(): Record<string, any> {
    return {};
  },
  //   instructions: `\
  // The short-term memory context is a record where you can save information that needs to be readily available. It's designed to be used as a temporary storage space for:

  // - **Thoughts and Ideas:** Capture fleeting thoughts or ideas that might be relevant later in the conversation.
  // - **Intermediate Results:** Store the outcomes of actions or calculations that will be needed in subsequent steps.
  // - **Contextual Information:** Save any information necessary to understand the current state or goal of the interaction.

  // You, as the assistant, are responsible for managing this memory. This includes deciding what information to store, when to update it, and when to remove it. The goal is to keep the memory relevant and avoid cluttering it with unnecessary details. Use the \`shortTermMemory.set\` action to store information, \`shortTermMemory.delete\` to remove it, and the context state to access stored information.
  // `,
  instructions: `\  
The short-term memory context is a vital record where you can save information that needs to be readily available throughout the current interaction. Think of it as your scratchpad for the conversation.

**Why use it?** As conversations progress, the primary working memory (containing the chat history and recent actions) has limitations. Information from earlier in the conversation might scroll out of view and become inaccessible. Short-term memory is the designated place to **persist key information** you anticipate needing later.

**Use it for:**
- **Intermediate Results:** Store the outcomes of actions (e.g., file IDs, search results, calculated values) that will be needed for subsequent steps or final outputs.
- **Contextual Information:** Save crucial details necessary to understand the current state, goals, or constraints of the interaction (e.g., user preferences specified earlier, configuration settings).
- **Fleeting Thoughts & Plans:** Capture brief ideas or steps in a plan that you need to keep track of.
- **Key Data Points:** Hold onto specific facts or figures extracted or generated that are central to the user's request.

**Management:** You, as the assistant, are responsible for managing this memory. This includes:
- **Deciding what to store:** Be selective; store only what's likely needed later to avoid clutter.
- **Updating:** Keep stored information current if it changes.
- **Deleting:** Remove information once it's no longer relevant using \`shortTermMemory.delete\`.

Use the \`shortTermMemory.set\` action to store information, \`shortTermMemory.delete\` to remove it, and access the current state via the context to retrieve stored information. Effective use of short-term memory ensures you don't lose track of important details during longer or more complex tasks.`,
}).setActions([
  action({
    name: "shortTermMemory.set",
    schema: {
      key: z.string().describe("key"),
      value: z.any().describe("value"),
    },
    handler: ({ key, value }, { memory }) => {
      memory[key] = value;
      return "Saved";
    },
  }),
  action({
    name: "shortTermMemory.delete",
    schema: {
      key: z.string().describe("key"),
    },
    handler: ({ key }, { memory }) => {
      delete memory[key];
      return "Saved";
    },
  }),
]);

const chatReview = context({
  type: "chat-logs",
  schema: { chatId: z.string() },
  // description: "this a context showing you the data from a chat context",
  instructions: "you are now reviewing a chat logs",
  async create({ args }, agent) {
    const chatState = await agent.getContext({
      context: chatContext,
      args: { chatId: args.chatId },
    });
    const workingMemory = await agent.getWorkingMemory(chatState.id);
    return {
      id: chatState.id,
      title: chatState.memory.title,
      workingMemory,
    };
  },

  async loader({ args, memory }, agent) {
    memory.workingMemory = await agent.getWorkingMemory(memory.id);
  },

  async save() {},

  render(state) {
    return formatXml(
      xml(
        "logs",
        undefined,
        getWorkingMemoryLogs(state.memory.workingMemory, false).map((t) =>
          formatContextLog2(t)
        )
      )
    );
  },
});

export const createChatSubContexts = ({
  chatId,
  user,
}: {
  chatId: string;
  user: string;
}): ContextRef[] => [
  {
    context: planner,
    args: { id: chatId },
  },
  {
    context: shortTermMemory,
    args: { id: chatId },
  },
  {
    context: episodicMemory,
    args: { id: chatId },
  },
  {
    context: sandboxContext,
    args: { user },
  },
  {
    context: mcpContext,
    args: { id: "main" },
  },
  {
    context: serverTools,
    args: { id: "server-1", url: "/proxy/tools-server" },
  },
];

export const systemContext = context({
  type: "system",
  schema: { id: z.string() },
  key: (args) => args.id,
  instructions: "",
  maxSteps: 20,
  maxWorkingMemorySize: 100,
  inputs: {
    instructions: {},
  },
});

export const createChatReviewSubContexts = ({
  chatId,
  user,
}: {
  chatId: string;
  user: string;
}): ContextRef[] => [
  {
    context: chatReview,
    args: { chatId },
  },
  {
    context: chatContext,
    args: { chatId },
  },
  {
    context: shortTermMemory,
    args: { id: chatId },
  },
  {
    context: episodicMemory,
    args: { id: chatId },
  },
  {
    context: planner,
    args: { id: chatId },
  },
  {
    context: sandboxContext,
    args: { user },
  },
  {
    context: serverTools,
    args: { id: "server-1", url: "/proxy/tools-server" },
  },
];
