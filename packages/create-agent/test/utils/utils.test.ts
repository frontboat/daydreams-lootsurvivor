import { describe, it, expect, vi, beforeEach } from "vitest";
import { execa } from "execa";
import {
  generateTemplateContent,
  createEnvVariables,
  createReadme,
} from "../../src/utils";

vi.mock("execa");

describe("Utility Functions", () => {
  describe("generateTemplateContent", () => {
    const templateContent = `/**
 * {{MODEL_NAME}} template for a Daydreams agent
 * This template includes context for goals and tasks, and actions for managing them
 */
import { {{MODEL_IMPORT_FUNCTION}} } from "{{MODEL_IMPORT_PATH}}";
import {
    createDreams,
    context,
    render,
    action,
    validateEnv,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { string, z } from "zod";

// Initialize {{MODEL_NAME}} client
const env = validateEnv(
    z.object({
        {{ENV_VAR_KEY}}: z.string().min(1, "{{ENV_VAR_KEY}} is required"),
    })
);

// Initialize {{MODEL_NAME}} client
const {{MODEL_VARIABLE}} = {{MODEL_IMPORT_FUNCTION}}({
    apiKey: env.{{ENV_VAR_KEY}}!,
});

const template = \`
Goal: {{goal}} 
\`;

type GoalMemory = {
    goal: string;
};

const goalContexts = context({
    type: "goal",
    schema: z.object({
        id: string(),
    }),

    key({ id }: { id: string }) {
        return id;
    },

    create(state) {
        return {
            id: state.args.id,
        };
    },

    render({ memory }: { memory: GoalMemory }) {
        return render(template, {
            goal: memory.goal,
        });
    },
});

createDreams({
    model: {{MODEL_VARIABLE}}("{{MODEL_VERSION}}"),
    extensions: [cliExtension],
    context: goalContexts,
    actions: [
        action({
            name: "addTask",
            description: "Add a task to the goal",
            schema: z.object({ task: z.string() }),
            handler(call, ctx, agent) {
              const agentMemory = ctx.agentMemory as GoalMemory;
              agentMemory.goal = call.data.task;
              return {};
            },
          }),
    ],
}).start({ id: "test" });`;

    it("should replace model-specific placeholders correctly", () => {
      const modelConfig = {
        MODEL_NAME: "OpenAI",
        MODEL_IMPORT_FUNCTION: "createOpenAI",
        MODEL_IMPORT_PATH: "@ai-sdk/openai",
        ENV_VAR_KEY: "OPENAI_API_KEY",
        MODEL_VARIABLE: "openai",
        MODEL_VERSION: "gpt-4o",
      };

      const result = generateTemplateContent(templateContent, modelConfig);

      expect(result).toContain('import { createOpenAI } from "@ai-sdk/openai"');
      expect(result).toContain("const openai = createOpenAI({");
      expect(result).toContain("apiKey: env.OPENAI_API_KEY");
      expect(result).toContain('openai("gpt-4o")');
      expect(result).toContain("* Daydreams agent with");
      expect(result).toContain("* Using OpenAI as the model provider");
    });

    it("should include specified extensions in the template", () => {
      const modelConfig = {
        MODEL_NAME: "Groq",
        MODEL_IMPORT_FUNCTION: "createGroq",
        MODEL_IMPORT_PATH: "@ai-sdk/groq",
        ENV_VAR_KEY: "GROQ_API_KEY",
        MODEL_VARIABLE: "groq",
        MODEL_VERSION: "deepseek-r1-distill-llama-70b",
      };

      const extensionImports = [
        'import { cliExtension } from "@daydreamsai/cli";',
        'import { twitter } from "@daydreamsai/twitter";',
        'import { discord } from "@daydreamsai/discord";',
      ];

      const extensionsList = ["cliExtension", "twitter", "discord"];

      const result = generateTemplateContent(
        templateContent,
        modelConfig,
        extensionImports,
        extensionsList
      );

      expect(result).toContain(
        'import { cliExtension } from "@daydreamsai/cli";'
      );
      expect(result).toContain(
        'import { twitter } from "@daydreamsai/twitter";'
      );
      expect(result).toContain(
        'import { discord } from "@daydreamsai/discord";'
      );
      expect(result).toContain("extensions: [cliExtension]");
      expect(result).toContain(
        "* Daydreams agent with cliExtension, twitter, discord extension(s)"
      );
    });
  });

  describe("createEnvVariables", () => {
    it("should include model-specific environment variables", () => {
      const result = createEnvVariables("openai", []);

      expect(result).toContain("OPENAI_API_KEY=your_openai_api_key");
      expect(result).not.toContain("GROQ_API_KEY=your_groq_api_key");
    });

    it("should include Twitter configuration when selected", () => {
      const result = createEnvVariables("groq", ["twitter"]);

      expect(result).toContain("# Twitter Configuration");
      expect(result).toContain("TWITTER_USERNAME=your_twitter_username");
      expect(result).toContain("TWITTER_CONSUMER_KEY=your_consumer_key");
    });

    it("should include Discord configuration when selected", () => {
      const result = createEnvVariables("anthropic", ["discord"]);

      expect(result).toContain("# Discord Configuration");
      expect(result).toContain("DISCORD_TOKEN=your_discord_token");
    });

    it("should include Telegram configuration when selected", () => {
      const result = createEnvVariables("google", ["telegram"]);

      expect(result).toContain("# Telegram Configuration");
      expect(result).toContain("TELEGRAM_TOKEN=your_telegram_token");
    });

    it("should include all selected extension configurations", () => {
      const result = createEnvVariables("groq", [
        "cli",
        "twitter",
        "discord",
        "telegram",
      ]);

      expect(result).toContain("# Twitter Configuration");
      expect(result).toContain("# Discord Configuration");
      expect(result).toContain("# Telegram Configuration");
    });
  });

  describe("createReadme", () => {
    it("should generate README with correct project name", () => {
      const result = createReadme("test-agent", ["cli"], "openai");

      expect(result).toContain("# test-agent");
    });

    it("should list all selected extensions", () => {
      const result = createReadme(
        "my-agent",
        ["cli", "twitter", "discord"],
        "anthropic"
      );

      expect(result).toContain("- cli");
      expect(result).toContain("- twitter");
      expect(result).toContain("- discord");
    });

    it("should include the selected model", () => {
      const result = createReadme("agent-x", ["cli"], "groq");

      expect(result).toContain("Uses groq as the model provider");
    });
  });
});
