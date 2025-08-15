import { ServicesClient } from "@google-cloud/run";
import { CloudBuildClient } from "@google-cloud/cloudbuild";
import { DNS } from "@google-cloud/dns";
import { Storage } from "@google-cloud/storage";
import type { DeployConfig, AgentDeployment } from "../types.js";
import chalk from "chalk";

export class GCloudService {
  private run: ServicesClient;
  private build: CloudBuildClient;
  private dns: DNS;
  private storage: Storage;

  constructor(projectId: string) {
    this.run = new ServicesClient({
      projectId,
    });
    this.build = new CloudBuildClient({
      projectId,
    });
    this.dns = new DNS({
      projectId,
    });
    this.storage = new Storage({
      projectId,
    });
  }

  async deployToCloudRun(
    config: DeployConfig,
    imageUrl: string
  ): Promise<AgentDeployment> {
    const serviceName = `agent-${config.name}`;
    const customDomain = `${config.name}.${config.domain}`;
    const parent = `projects/${config.project}/locations/${config.region}`;
    const servicePath = `${parent}/services/${serviceName}`;

    // Build the service configuration for Cloud Run v2 API
    const serviceConfig: any = {
      name: servicePath,
      template: {
        scaling: {
          maxInstanceCount: parseInt(config.maxInstances),
          minInstanceCount: parseInt(config.minInstances),
        },
        timeout: {
          seconds: parseInt(config.timeout),
        },
        containers: [
          {
            image: imageUrl,
            ports: [
              {
                containerPort: parseInt(config.port),
              },
            ],
            resources: {
              limits: {
                memory: config.memory,
                cpu: "1",
              },
            },
            env: await this.loadEnvVars(config.env),
          },
        ],
      },
      ingress: "INGRESS_TRAFFIC_ALL",
    };

    try {
      // Try to update existing service first
      const [operation] = await this.run.updateService({
        service: serviceConfig,
        allowMissing: true, // Create if doesn't exist
      });

      // Wait for deployment to complete
      await this.waitForOperation(operation);
    } catch (error) {
      // If update fails, try creating a new service
      const [operation] = await this.run.createService({
        parent,
        serviceId: serviceName,
        service: serviceConfig,
      });

      await this.waitForOperation(operation);
    }

    // Get service details
    const [service] = await this.run.getService({
      name: servicePath,
    });

    const url = service.uri || "";

    // Make service publicly accessible (no auth required)
    if (!config.dryRun) {
      await this.makeServicePublic(serviceName, config.region, config.project);
    }

    // Set up custom domain mapping
    if (!config.dryRun) {
      await this.setupDomainMapping(
        serviceName,
        config.name,
        config.domain,
        config.region,
        config.project
      );
    }

    return {
      name: config.name,
      url,
      customDomain,
      service: serviceName,
      region: config.region,
      project: config.project,
      image: imageUrl,
      status: "READY",
      createdAt: service.createTime ? new Date(service.createTime as any) : new Date(),
      updatedAt: service.updateTime ? new Date(service.updateTime as any) : new Date(),
      config: {
        memory: config.memory,
        maxInstances: parseInt(config.maxInstances),
        minInstances: parseInt(config.minInstances),
        port: parseInt(config.port),
        timeout: parseInt(config.timeout),
      },
    };
  }

  async buildContainer(
    projectPath: string,
    agentName: string,
    projectId: string,
    region: string
  ): Promise<string> {
    const imageName = `gcr.io/${projectId}/daydreams-agent-${agentName}`;
    const tag = `${Date.now()}`;
    const imageUrl = `${imageName}:${tag}`;

    // Create build configuration
    const buildConfig = {
      source: {
        storageSource: {
          bucket: `${projectId}-daydreams-builds`,
          object: `${agentName}-${tag}.tar.gz`,
        },
      },
      steps: [
        {
          name: "gcr.io/cloud-builders/docker",
          args: ["build", "-t", imageUrl, "-f", "Dockerfile.daydreams", "."],
        },
        {
          name: "gcr.io/cloud-builders/docker",
          args: ["push", imageUrl],
        },
      ],
      images: [imageUrl],
      options: {
        logging: "CLOUD_LOGGING_ONLY" as const,
      },
    };

    // Upload source code to GCS
    await this.uploadSourceToGCS(projectPath, projectId, agentName, tag);

    // Start build
    const [operation] = await this.build.createBuild({
      projectId,
      build: buildConfig,
    });

    // Wait for build to complete
    await this.waitForBuildOperation(operation);

    return imageUrl;
  }

  private async uploadSourceToGCS(
    projectPath: string,
    projectId: string,
    agentName: string,
    tag: string
  ): Promise<void> {
    const bucketName = `${projectId}-daydreams-builds`;
    const fileName = `${agentName}-${tag}.tar.gz`;

    // Ensure bucket exists
    const bucket = this.storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
      await this.storage.createBucket(bucketName, {
        location: "US",
        storageClass: "STANDARD",
      });
    }

    // Create tar archive and upload
    const tar = await import("tar");
    const stream = tar.create(
      {
        gzip: true,
        cwd: projectPath,
      },
      ["."]
    );

    const file = bucket.file(fileName);
    await new Promise((resolve, reject) => {
      stream
        .pipe(file.createWriteStream())
        .on("error", reject)
        .on("finish", resolve);
    });
  }

  private async makeServicePublic(
    serviceName: string,
    region: string,
    projectId: string
  ): Promise<void> {
    try {
      // Make the service publicly accessible
      const policy = {
        bindings: [
          {
            role: "roles/run.invoker",
            members: ["allUsers"],
          },
        ],
      };

      await this.run.setIamPolicy({
        resource: `projects/${projectId}/locations/${region}/services/${serviceName}`,
        policy,
      });

      console.log(chalk.green(`✓ Service made publicly accessible`));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not make service public automatically`));
      console.log(chalk.gray(`  Run this command to make it public:`));
      console.log(
        chalk.gray(
          `  gcloud run services add-iam-policy-binding ${serviceName} --region=${region} --member="allUsers" --role="roles/run.invoker"`
        )
      );
    }
  }

  private async setupDomainMapping(
    serviceName: string,
    agentName: string,
    domain: string,
    region: string,
    projectId: string
  ): Promise<void> {
    try {
      // Try to create domain mapping via gcloud command
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const command = `gcloud run domain-mappings create --service=${serviceName} --domain=${agentName}.${domain} --region=${region} --project=${projectId}`;
      
      console.log(chalk.gray(`Creating domain mapping...`));
      await execAsync(command);
      console.log(chalk.green(`✓ Domain mapping created: ${agentName}.${domain}`));
    } catch (error) {
      // Fallback to manual instructions
      console.log(
        chalk.yellow(`\n⚠ Domain mapping needs manual setup:`)
      );
      console.log(
        chalk.gray(
          `  Run this command to complete setup:`
        )
      );
      console.log(
        chalk.gray(
          `  gcloud run domain-mappings create --service=${serviceName} --domain=${agentName}.${domain} --region=${region}`
        )
      );
    }
  }

  private async loadEnvVars(
    envFile?: string
  ): Promise<Array<{ name: string; value: string }>> {
    const envVars: Array<{ name: string; value: string }> = [];

    if (envFile) {
      const { config } = await import("dotenv");
      const result = config({ path: envFile });

      if (result.parsed) {
        for (const [name, value] of Object.entries(result.parsed)) {
          envVars.push({ name, value });
        }
      }
    }

    // Add default environment variables
    envVars.push(
      { name: "NODE_ENV", value: "production" },
      { name: "PORT", value: "8080" }
    );

    return envVars;
  }

  private async waitForOperation(operation: any): Promise<void> {
    // Wait for long-running operation to complete
    if (operation && operation.promise) {
      await operation.promise();
    } else {
      // Fallback delay if operation doesn't have promise
      return new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }

  private async waitForBuildOperation(operation: any): Promise<void> {
    // Wait for Cloud Build operation
    if (operation && operation.promise) {
      await operation.promise();
    } else {
      return new Promise((resolve) => {
        setTimeout(resolve, 10000);
      });
    }
  }

  async listDeployments(
    projectId: string,
    region: string
  ): Promise<AgentDeployment[]> {
    const parent = `projects/${projectId}/locations/${region}`;
    const deployments: AgentDeployment[] = [];

    // Use async iterator for pagination
    const servicesIterable = this.run.listServicesAsync({
      parent,
    });

    for await (const service of servicesIterable) {
      const serviceName = service.name?.split("/").pop() || "";
      if (serviceName.startsWith("agent-")) {
        const name = serviceName.replace("agent-", "");
        const container = service.template?.containers?.[0];

        deployments.push({
          name,
          url: service.uri || "",
          customDomain: `${name}.agent.daydreams.systems`,
          service: serviceName,
          region,
          project: projectId,
          image: container?.image || "",
          status: service.reconciling ? "DEPLOYING" : "READY",
          createdAt: service.createTime ? new Date(service.createTime as any) : new Date(),
          updatedAt: service.updateTime ? new Date(service.updateTime as any) : new Date(),
          config: {
            memory: container?.resources?.limits?.memory || "256Mi",
            maxInstances: service.template?.scaling?.maxInstanceCount || 100,
            minInstances: service.template?.scaling?.minInstanceCount || 0,
            port: container?.ports?.[0]?.containerPort || 8080,
            timeout: typeof service.template?.timeout?.seconds === 'number' 
              ? service.template.timeout.seconds 
              : 60,
          },
        });
      }
    }

    return deployments;
  }

  async deleteDeployment(
    name: string,
    projectId: string,
    region: string
  ): Promise<void> {
    const serviceName = `agent-${name}`;
    const servicePath = `projects/${projectId}/locations/${region}/services/${serviceName}`;

    const [operation] = await this.run.deleteService({
      name: servicePath,
    });

    await this.waitForOperation(operation);
  }
}
