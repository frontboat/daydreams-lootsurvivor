import * as readline from "readline/promises";
import { context } from "../context";
import * as z from "zod/v4";
import { extension, input, output } from "../utils";
import { formatMsg } from "../formatters";
import { type AnyAgent } from "../types";
import { service } from "../serviceProvider";

const cliContext = context({
  type: "cli",
  key: ({ user }) => user.toString(),
  schema: z.object({ user: z.string() }),
});

const readlineService = service({
  register(container) {
    container.singleton("readline", () =>
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
    );
  },
});

export const cli = extension({
  name: "cli",
  services: [readlineService],
  contexts: {
    cli: cliContext,
  },
  inputs: {
    // Handle incoming messages
    "cli:message": input({
      schema: z.object({
        user: z.string(),
        text: z.string(),
      }),
      format: ({ data }) =>
        formatMsg({
          role: "user",
          content: data.text,
          user: data.user,
        }),
      // Subscribe to CLI input
      async subscribe(send, { container }: AnyAgent) {
        const rl = container.resolve<readline.Interface>("readline");

        const controller = new AbortController();

        new Promise<void>(async (resolve) => {
          while (!controller.signal.aborted) {
            const question = await rl.question("> ");
            if (question === "exit") {
              break;
            }
            console.log("User:", question);
            send(
              cliContext,
              { user: "admin" },
              {
                user: "admin",
                text: question,
              }
            );
          }

          resolve();
        });

        return () => {
          controller.abort();
        };
      },
    }),
  },
  outputs: {
    "cli:message": output({
      description: "Send messages to the user",
      schema: z.string().describe("The message to send"),
      handler({ content }) {
        console.log("Agent:", { content });
        return {
          data: content,
          timestamp: Date.now(),
        };
      },
    }),
  },
});
