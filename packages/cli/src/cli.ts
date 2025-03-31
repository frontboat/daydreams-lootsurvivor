import * as readline from "readline/promises";
import { service, context, input } from "@daydreamsai/core";
import { z } from "zod";

export const readlineService = service({
  register(container) {
    container.singleton("readline", () =>
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
    );
  },
});

export const cli = context({
  type: "cli",
  key: ({ user }) => user.toString(),
  schema: z.object({ user: z.string() }),
  inputs: {
    "cli:message": input({
      schema: z.string(),
      async subscribe(send, { container }) {
        const rl = container.resolve<readline.Interface>("readline");

        const controller = new AbortController();

        while (!controller.signal.aborted) {
          const question = await rl.question("> ");
          if (question === "exit") {
            break;
          }
          console.log("User:", question);
          send(cli, { user: "admin" }, question);
        }

        return () => {
          controller.abort();
        };
      },
    }),
  },
  outputs: {
    "cli:message": {
      description: "Send messages to the user",
      schema: z.string().describe("The message to send"),
    },
  },
});
