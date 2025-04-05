import { action, context, extension } from "@daydreamsai/core";
import { Sandbox, SandboxInfo } from "@e2b/code-interpreter";
import { z } from "zod";

export const sandbox = extension({
  name: "sanddox",
});

export const sandboxContext = context({
  type: "sandbox",
  description: "Access a Linux sandbox environment with internet connection",
  instructions: `\
<command_rules>
- You must wait for the sandboxId to start using commands
- Only run commands using the sandboxIds from this context state
- Avoid commands requiring confirmation; actively use -y or -f flags for automatic confirmation
- Avoid commands with excessive output; save to files when necessary
- Chain multiple commands with && operator to minimize interruptions
- Use pipe operator to pass command outputs, simplifying operations
</command_rules>
<file_rules>
- Use file tools for reading, writing, appending, and editing to avoid string escape issues in shell commands
- Actively save intermediate results and store different types of reference information in separate files
- When merging text files, must use append mode of file writing tool to concatenate content to target file
</file_rules>
`,
  schema: z.object({ user: z.string() }),
  key: ({ user }) => user,
  async setup(args, agent) {
    // get key by user
    return {
      apiKey: import.meta.env.VITE_EB2_API_KEY,
    };
  },
  create({}): { sandboxes: SandboxInfo[] } {
    return {
      sandboxes: [],
    };
  },
  async loader({ memory, options }) {
    memory.sandboxes = await Sandbox.list({ apiKey: options.apiKey });
  },
}).setActions([
  action({
    name: "sandbox.list",
    schema: undefined,
    handler: async ({ context, options }) => {
      return Sandbox.list({
        apiKey: options.apiKey,
      });
    },
  }),
  action({
    name: "sandbox.create",
    instructions: "Use this to create a sandbox it will return a sandboxId",
    schema: {
      timeoutMins: z
        .number()
        .max(60)
        .default(5)
        .describe("The timeout of the sandbox in minutes"),
    },
    handler: async ({ timeoutMins }, { options }) => {
      const timeoutMs = timeoutMins * 60 * 1000;
      const sbx = await Sandbox.create({
        apiKey: options.apiKey,
        timeoutMs,
      });
      return {
        sandboxId: sbx.sandboxId,
        timeout: new Date(Date.now() + timeoutMs).toISOString(),
      };
    },
  }),
  action({
    name: "sandbox.setTimeout",
    schema: {
      sandboxId: z.string(),
      timeoutMins: z
        .number()
        .max(60)
        .describe("The timeout of the sandbox in minutes"),
    },
    description:
      "Set the timeout of the specified sandbox. After the timeout expires the sandbox will be automatically killed.",
    instructions: `\
This method can extend or reduce the sandbox timeout set when creating the sandbox or from the last call to sandbox.setTimeout.
Maximum time a sandbox can be kept alive is 1 hour`,
    handler: async ({ sandboxId, timeoutMins }, { options }) => {
      await Sandbox.setTimeout(sandboxId, timeoutMins * 60 * 1000, {
        apiKey: options.apiKey,
      });
      return { success: true };
    },
  }),
  action({
    name: "sandbox.kill",
    schema: {
      sandboxId: z.string(),
    },
    handler: async ({ sandboxId }, { context, options }) => {
      console.log({ context });
      const success = await Sandbox.kill(sandboxId, { apiKey: options.apiKey });
      return { success };
    },
  }),
]);
