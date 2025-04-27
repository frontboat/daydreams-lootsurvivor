import path from "path";
import fs from "fs-extra";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import prompts from "prompts";
import { fileURLToPath } from "url";
import {
  generateTemplateContent,
  createEnvVariables,
  createReadme,
} from "./utils.js";

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the CLI program
const program = new Command()
  .name("create-agent")
  .description("Bootstrap a new Daydreams agent")
  .version("0.1.0")
  .argument("[directory]", "Directory to create the agent in")
  .option("--twitter", "Include Twitter extension")
  .option("--discord", "Include Discord extension")
  .option("--cli", "Include CLI extension")
  .option("--telegram", "Include Telegram extension")
  .option("--all", "Include all extensions")
  .option(
    "--model <model>",
    "Specify the model to use (openai, groq, anthropic, google)",
    "groq"
  );

// Export the main function for testing purposes
export async function main(
  testArgs?: string[],
  testOpts?: Record<string, any>,
  testTemplateContent?: string // Add template content parameter for testing
) {
  // Parse arguments and options only if not in test mode
  if (!testArgs && !testOpts) {
    program.parse(process.argv);
  }

  const options = testOpts || program.opts();
  const targetDir = (testArgs && testArgs[0]) || program.args[0] || ".";
  const cwd = process.cwd();
  const targetPath = path.resolve(cwd, targetDir);

  // Check if target directory exists and is not empty
  if (fs.existsSync(targetPath)) {
    const files = await fs.readdir(targetPath);
    if (files.length > 0) {
      const { proceed } = await prompts({
        type: "confirm",
        name: "proceed",
        message: `Directory ${chalk.cyan(targetPath)} is not empty. Continue?`,
        initial: false,
      });

      if (!proceed) {
        console.log(chalk.red("Aborted."));
        return;
      }
    }
  } else {
    await fs.mkdir(targetPath, { recursive: true });
  }

  console.log();
  console.log(chalk.bold("Creating a new Daydreams agent..."));
  console.log();

  // Determine selected extensions
  const availableExtensions = ["cli", "twitter", "discord", "telegram"];
  let selectedExtensions = [];

  if (options.all) {
    selectedExtensions = [...availableExtensions];
  } else {
    // Collect extensions from command line options
    selectedExtensions = availableExtensions.filter((ext) => options[ext]);

    // If no extensions were selected via flags, prompt the user
    if (selectedExtensions.length === 0) {
      const { extensions } = await prompts({
        type: "multiselect",
        name: "extensions",
        message: "Select extensions to include",
        choices: [
          { title: "CLI", value: "cli" },
          { title: "Twitter", value: "twitter" },
          { title: "Discord", value: "discord" },
          { title: "Telegram", value: "telegram" },
        ],
      });

      if (!extensions || extensions.length === 0) {
        console.log(
          chalk.yellow(
            "No extensions selected. Including CLI extension by default."
          )
        );
        selectedExtensions = ["cli"];
      } else {
        selectedExtensions = extensions;
      }
    }
  }

  // Determine the model to use
  const validModels = ["openai", "groq", "anthropic", "google"];
  let selectedModel = options.model || "groq";

  if (!validModels.includes(selectedModel)) {
    const { model } = await prompts({
      type: "select",
      name: "model",
      message: "Select the model provider to use",
      choices: [
        { title: "Groq", value: "groq" },
        { title: "OpenAI", value: "openai" },
        { title: "Anthropic", value: "anthropic" },
        { title: "Google", value: "google" },
      ],
      initial: 0,
    });
    selectedModel = model;
  }

  // Create package.json
  const spinner = ora("Creating package.json").start();
  const packageJson: {
    name: string;
    version: string;
    type: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  } = {
    name: path.basename(targetPath),
    version: "0.1.0",
    type: "module",
    scripts: {
      start: "bun run index.ts",
      build: "tsc",
    },
    dependencies: {
      "@daydreamsai/core": "^0.2.13",
      "@ai-sdk/anthropic": "^1.1.6",
      "@ai-sdk/google": "^1.1.16",
      "@ai-sdk/groq": "^1.1.7",
      "@ai-sdk/openai": "^1.1.14",
      "@openrouter/ai-sdk-provider": "^0.2.1",
      ai: "^4.1.25",
      chalk: "^5.4.1",
      "discord.js": "^14.17.3",
      telegraf: "^4.16.3",
      typescript: "^5.3.3",
      zod: "^3.24.1",
    },
  };

  // Add extension-specific dependencies
  if (selectedExtensions.includes("discord")) {
    packageJson.dependencies["discord.js"] = "^14.14.1";
  }

  await fs.writeFile(
    path.join(targetPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  spinner.succeed("Created package.json");

  // Create tsconfig.json
  spinner.start("Creating tsconfig.json");
  const tsconfigJson = {
    compilerOptions: {
      target: "ES2020",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      outDir: "dist",
    },
    include: ["*.ts"],
    exclude: ["node_modules"],
  };

  await fs.writeFile(
    path.join(targetPath, "tsconfig.json"),
    JSON.stringify(tsconfigJson, null, 2)
  );
  spinner.succeed("Created tsconfig.json");

  // Copy template file based on selected model
  spinner.start(
    `Creating agent with ${selectedModel} model and selected extensions`
  );

  // Read template content - either from test parameter or from file
  let templateContent: string;

  if (testTemplateContent) {
    // Use the provided test template content
    templateContent = testTemplateContent;
  } else {
    // Get the template file path
    const templateFile = path.join(
      __dirname,
      "..",
      "templates",
      "basic",
      "template.ts"
    );

    if (!fs.existsSync(templateFile)) {
      spinner.fail(`Template file not found: ${templateFile}`);
      console.error(
        chalk.red(
          `Error: Template file not found. Please check your installation.`
        )
      );
      return;
    }

    // Read the template file
    templateContent = await fs.readFile(templateFile, "utf-8");
  }

  // Define model-specific replacements
  const modelConfig = {
    groq: {
      MODEL_NAME: "Groq",
      MODEL_IMPORT_FUNCTION: "createGroq",
      MODEL_IMPORT_PATH: "@ai-sdk/groq",
      ENV_VAR_KEY: "GROQ_API_KEY",
      MODEL_VARIABLE: "groq",
      MODEL_VERSION: "deepseek-r1-distill-llama-70b",
    },
    openai: {
      MODEL_NAME: "OpenAI",
      MODEL_IMPORT_FUNCTION: "createOpenAI",
      MODEL_IMPORT_PATH: "@ai-sdk/openai",
      ENV_VAR_KEY: "OPENAI_API_KEY",
      MODEL_VARIABLE: "openai",
      MODEL_VERSION: "gpt-4o",
    },
    anthropic: {
      MODEL_NAME: "Anthropic",
      MODEL_IMPORT_FUNCTION: "createAnthropic",
      MODEL_IMPORT_PATH: "@ai-sdk/anthropic",
      ENV_VAR_KEY: "ANTHROPIC_API_KEY",
      MODEL_VARIABLE: "anthropic",
      MODEL_VERSION: "claude-3-opus-20240229",
    },
    google: {
      MODEL_NAME: "Google",
      MODEL_IMPORT_FUNCTION: "createGoogle",
      MODEL_IMPORT_PATH: "@ai-sdk/google",
      ENV_VAR_KEY: "GOOGLE_API_KEY",
      MODEL_VARIABLE: "google",
      MODEL_VERSION: "gemini-1.5-pro",
    },
  };

  // Replace placeholders with model-specific values
  const config = modelConfig[selectedModel as keyof typeof modelConfig];

  // Prepare extension imports and extension list for template generation
  const extensionImports: string[] = [];
  const extensionsList: string[] = [];

  for (const ext of selectedExtensions) {
    if (ext === "cli") {
      extensionImports.push(
        `import { cli } from "@daydreamsai/core/extensions";`
      );
      extensionsList.push("cli");
    } else if (ext === "twitter") {
      extensionImports.push(
        `import { twitter } from "@daydreamsai/core/extensions";`
      );
      extensionsList.push("twitter");
    } else if (ext === "discord") {
      extensionImports.push(
        `import { discord } from "@daydreamsai/core/extensions";`
      );
      extensionsList.push("discord");
    } else if (ext === "telegram") {
      extensionImports.push(
        `import { telegram } from "@daydreamsai/core/extensions";`
      );
      extensionsList.push("telegram");
    }
  }

  // Generate the template content with all replacements
  const processedContent = generateTemplateContent(
    templateContent,
    config,
    extensionImports,
    extensionsList
  );

  // Write the modified template to the target directory
  await fs.writeFile(path.join(targetPath, "index.ts"), processedContent);
  spinner.succeed(
    `Created agent with ${selectedModel} model and extensions: ${selectedExtensions.join(", ")}`
  );

  // Create .env file with required environment variables
  spinner.start("Creating .env file");
  const envContent = createEnvVariables(selectedModel, selectedExtensions);
  await fs.writeFile(path.join(targetPath, ".env.example"), envContent);
  spinner.succeed("Created .env.example file");

  // Create README
  spinner.start("Creating README");
  const readmeContent = createReadme(
    path.basename(targetPath),
    selectedExtensions,
    selectedModel
  );
  await fs.writeFile(path.join(targetPath, "README.md"), readmeContent);
  spinner.succeed("Created README");

  // Install dependencies - simplified to directly use pnpm
  spinner.start("Installing dependencies with pnpm");
  try {
    await execa("pnpm", ["install"], { cwd: targetPath });

    // Verify node_modules exists
    const nodeModulesPath = path.join(targetPath, "node_modules");
    const nodeModulesExists = await fs.pathExists(nodeModulesPath);

    if (nodeModulesExists) {
      spinner.succeed("Installed dependencies using pnpm");
    } else {
      spinner.fail(
        "Dependencies installed but node_modules directory wasn't found"
      );
      console.log(
        chalk.yellow(
          "You can install dependencies manually by running 'pnpm install' in the project directory."
        )
      );
    }
  } catch (error: unknown) {
    spinner.fail("Failed to install dependencies");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    console.log(
      chalk.yellow(
        "You can install dependencies manually by running 'pnpm install' in the project directory."
      )
    );
  }

  console.log();
  console.log(
    chalk.green("✅ Your Daydreams agent has been created successfully!")
  );
  console.log();
  console.log(`To get started, run the following commands:`);

  if (targetDir !== ".") {
    console.log(`  cd ${targetDir}`);
  }

  console.log(`  cp .env.example .env`);
  console.log(`  # Fill in the required environment variables in .env`);
  console.log(`  npm start`);
  console.log();
}

// Directly run the main function when this file is executed directly
if (
  import.meta.url &&
  process.argv[1] &&
  (import.meta.url.endsWith(process.argv[1]) ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("create-agent"))
) {
  main().catch((error) => {
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  });
}
