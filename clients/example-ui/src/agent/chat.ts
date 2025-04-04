import {
  action,
  context,
  ContextRef,
  extension,
  input,
  output,
} from "@daydreamsai/core";
import { z } from "zod";
import { artifact } from "./outputs";
import { planner } from "./planner";
import { sandboxContext } from "./sandbox";
import { serverTools } from "./serverTools";

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
      format(params) {
        return {
          tag: "input",
          params: { type: "message", user: params.user },
          children: params.content,
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
    context: sandboxContext,
    args: { user },
  },
  {
    context: serverTools,
    args: { id: "server-1", url: "/proxy/tools-server" },
  },
];
