import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import path from "path";
import fs from "fs/promises";
import type { DeployConfig } from "../types.js";
import { GCloudService } from "../services/gcloud.js";
import { 
  generateDockerfile, 
  detectPackageManager, 
  writeDockerfile,
  createDockerignore 
} from "../utils/docker.js";

export async function deployCommand(options: any) {
  const spinner = ora();

  try {
    // Validate and prompt for missing options
    const config = await validateConfig(options);
    
    if (config.dryRun) {
      console.log(chalk.yellow("🔍 Dry run mode - showing what would be deployed:\n"));
      console.log(chalk.gray("Configuration:"));
      console.log(config);
      return;
    }

    // Step 1: Prepare Docker configuration
    spinner.start("Preparing Docker configuration...");
    
    const projectPath = process.cwd();
    const packageManager = await detectPackageManager(projectPath);
    
    const dockerConfig = {
      baseImage: packageManager === "bun" ? "oven/bun:latest" : "node:20-slim",
      workDir: "/app",
      port: parseInt(config.port),
      entryFile: config.file,
      packageManager,
    };

    const dockerfile = await generateDockerfile(dockerConfig);
    await writeDockerfile(projectPath, dockerfile);
    await createDockerignore(projectPath);
    
    spinner.succeed("Docker configuration prepared");

    // Step 2: Initialize Google Cloud service
    spinner.start("Initializing Google Cloud services...");
    
    const gcloud = new GCloudService(config.project);
    
    spinner.succeed("Google Cloud services initialized");

    // Step 3: Build container image
    if (!config.noBuild) {
      spinner.start(`Building container image for ${chalk.cyan(config.name)}...`);
      
      const imageUrl = await gcloud.buildContainer(
        projectPath,
        config.name,
        config.project,
        config.region
      );
      
      spinner.succeed(`Container image built: ${chalk.gray(imageUrl)}`);
      
      // Step 4: Deploy to Cloud Run
      spinner.start(`Deploying to Cloud Run in ${chalk.cyan(config.region)}...`);
      
      const deployment = await gcloud.deployToCloudRun(config, imageUrl);
      
      spinner.succeed("Deployed to Cloud Run");

      // Success message
      console.log("\n" + chalk.green("✨ Deployment successful!\n"));
      console.log(chalk.bold("Service Details:"));
      console.log(`  Name: ${chalk.cyan(deployment.name)}`);
      console.log(`  URL: ${chalk.blue(deployment.url)}`);
      console.log(`  Custom Domain: ${chalk.blue(`https://${deployment.customDomain}`)}`);
      console.log(`  Region: ${deployment.region}`);
      console.log(`  Memory: ${deployment.config.memory}`);
      console.log(`  Scaling: ${deployment.config.minInstances}-${deployment.config.maxInstances} instances`);
      
      console.log("\n" + chalk.gray("Note: Custom domain may take a few minutes to become available."));
      console.log(chalk.gray("If using a custom domain, ensure DNS records are configured properly.\n"));

      // Clean up temporary files
      await fs.unlink(path.join(projectPath, "Dockerfile.daydreams")).catch(() => {});
      await fs.unlink(path.join(projectPath, ".dockerignore")).catch(() => {});
    }

  } catch (error) {
    spinner.fail("Deployment failed");
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("\n❌ Error:"), errorMessage);
    
    if (error instanceof Error && error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

async function validateConfig(options: any): Promise<DeployConfig> {
  const responses = await prompts([
    {
      type: options.name ? null : "text",
      name: "name",
      message: "Agent name (becomes subdomain):",
      validate: (value) => {
        if (!value) return "Name is required";
        if (!/^[a-z0-9-]+$/.test(value)) {
          return "Name must contain only lowercase letters, numbers, and hyphens";
        }
        if (value.length > 30) return "Name must be 30 characters or less";
        return true;
      },
    },
    {
      type: options.project ? null : "text",
      name: "project",
      message: "Google Cloud project ID:",
      validate: (value) => value ? true : "Project ID is required",
    },
  ], {
    onCancel: () => {
      console.log(chalk.red("\n✖ Deployment cancelled"));
      process.exit(0);
    },
  });

  // Check if entry file exists
  const entryFile = options.file || "server.ts";
  const entryPath = path.join(process.cwd(), entryFile);
  
  try {
    await fs.access(entryPath);
  } catch {
    // Try .js extension
    const jsPath = entryPath.replace(/\.ts$/, ".js");
    try {
      await fs.access(jsPath);
      options.file = entryFile.replace(/\.ts$/, ".js");
    } catch {
      console.error(chalk.red(`✖ Entry file not found: ${entryFile}`));
      console.log(chalk.gray(`  Looked in: ${entryPath}`));
      process.exit(1);
    }
  }

  return {
    name: options.name || responses.name,
    file: options.file || "server.ts",
    project: options.project || responses.project,
    region: options.region || "us-central1",
    env: options.env,
    memory: options.memory || "256Mi",
    maxInstances: options.maxInstances || "100",
    minInstances: options.minInstances || "0",
    port: options.port || "8080",
    timeout: options.timeout || "60",
    domain: options.domain || "agent.daydreams.systems",
    noBuild: options.noBuild,
    dryRun: options.dryRun,
  };
}