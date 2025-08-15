export interface DeployConfig {
  name: string;
  file: string;
  project: string;
  region: string;
  env?: string;
  memory: string;
  maxInstances: string;
  minInstances: string;
  port: string;
  timeout: string;
  domain: string;
  noBuild?: boolean;
  dryRun?: boolean;
}

export interface AgentDeployment {
  name: string;
  url: string;
  customDomain?: string;
  service: string;
  region: string;
  project: string;
  image: string;
  status: "DEPLOYING" | "READY" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
  config: {
    memory: string;
    maxInstances: number;
    minInstances: number;
    port: number;
    timeout: number;
  };
}

export interface BuildConfig {
  projectPath: string;
  agentName: string;
  entryFile: string;
  projectId: string;
  region: string;
  registry?: string;
}

export interface DockerConfig {
  baseImage: string;
  workDir: string;
  port: number;
  entryFile: string;
  packageManager: "npm" | "pnpm" | "bun" | "yarn";
}