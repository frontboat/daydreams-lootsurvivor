#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { config } from "dotenv";
import { deployCommand } from "./commands/deploy.js";
import { listCommand } from "./commands/list.js";
import { deleteCommand } from "./commands/delete.js";
import { logsCommand } from "./commands/logs.js";

config();

const program = new Command();

program
  .name("daydreams-deploy")
  .description("Deploy Daydreams agents to Google Cloud")
  .version("0.1.0");

program
  .command("deploy")
  .description("Deploy an agent to Google Cloud Run")
  .option("-n, --name <name>", "Agent name (becomes subdomain)")
  .option("-f, --file <path>", "Entry file", "server.ts")
  .option("-p, --project <id>", "GCP project ID")
  .option("-r, --region <region>", "GCP region", "us-central1")
  .option("--env <file>", "Environment variables file")
  .option("--memory <size>", "Memory allocation", "256Mi")
  .option("--max-instances <n>", "Max scaling", "100")
  .option("--min-instances <n>", "Min scaling", "0")
  .option("--port <port>", "Container port", "8080")
  .option("--timeout <seconds>", "Request timeout", "60")
  .option("--domain <domain>", "Custom domain", "agent.daydreams.systems")
  .option("--no-build", "Skip building, use existing image")
  .option("--dry-run", "Show what would be deployed without deploying")
  .action(deployCommand);

program
  .command("list")
  .description("List all deployed agents")
  .option("-p, --project <id>", "GCP project ID")
  .option("-r, --region <region>", "GCP region", "us-central1")
  .action(listCommand);

program
  .command("delete <name>")
  .description("Delete a deployed agent")
  .option("-p, --project <id>", "GCP project ID")
  .option("-r, --region <region>", "GCP region", "us-central1")
  .option("-y, --yes", "Skip confirmation")
  .action(deleteCommand);

program
  .command("logs <name>")
  .description("View logs for a deployed agent")
  .option("-p, --project <id>", "GCP project ID")
  .option("-r, --region <region>", "GCP region", "us-central1")
  .option("-f, --follow", "Follow log output")
  .option("-l, --lines <n>", "Number of lines to show", "100")
  .action(logsCommand);

program.parse(process.argv);
