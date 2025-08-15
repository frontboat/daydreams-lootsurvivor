# @daydreamsai/deploy

Deploy Daydreams agents to Google Cloud Run with custom domains.

## Installation

```bash
pnpm add @daydreamsai/deploy
```

## CLI Usage

The package provides a CLI tool for deploying agents:

```bash
# Deploy an agent
daydreams-deploy deploy --name my-agent --project my-gcp-project

# List all deployed agents
daydreams-deploy list --project my-gcp-project

# View logs
daydreams-deploy logs my-agent --project my-gcp-project

# Delete an agent
daydreams-deploy delete my-agent --project my-gcp-project
```

## Deploy Command Options

- `--name <name>` - Agent name (becomes subdomain)
- `--file <path>` - Entry file (default: server.ts)
- `--project <id>` - GCP project ID
- `--region <region>` - GCP region (default: us-central1)
- `--env <file>` - Environment variables file
- `--memory <size>` - Memory allocation (default: 256Mi)
- `--max-instances <n>` - Max scaling (default: 100)
- `--min-instances <n>` - Min scaling (default: 0)
- `--port <port>` - Container port (default: 8080)
- `--timeout <seconds>` - Request timeout (default: 60)
- `--domain <domain>` - Custom domain (default: agent.daydreams.systems)
- `--no-build` - Skip building, use existing image
- `--dry-run` - Show what would be deployed without deploying

## Prerequisites

1. Google Cloud Project with billing enabled
2. Enable required APIs:

   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     containerregistry.googleapis.com \
     dns.googleapis.com
   ```

3. Authenticate with Google Cloud:

   ```bash
   gcloud auth application-default login
   ```

4. Configure DNS for wildcard domain:
   - Add wildcard A/AAAA records for `*.agent.daydreams.systems`
   - Point to Google Cloud Load Balancer IP

## Example Agent

```typescript
// server.ts
import { createDreams, context } from "@daydreamsai/core";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const agent = createDreams({
  // ... agent configuration
});

const app = new Hono();

app.post("/chat", async (c) => {
  const { message } = await c.req.json();
  const result = await agent.send({
    input: { type: "text", data: message },
  });
  return c.json({ response: result });
});

serve({ fetch: app.fetch, port: 8080 });
```

Deploy with:

```bash
daydreams-deploy deploy --name my-bot --project my-project
```

Your agent will be available at:

- `https://my-bot.agent.daydreams.systems`

## Architecture

The deployment process:

1. **Build Phase**

   - Generates optimized Dockerfile
   - Detects package manager (npm/pnpm/bun/yarn)
   - Creates production-ready container image

2. **Deploy Phase**

   - Pushes image to Google Container Registry
   - Deploys to Cloud Run with auto-scaling
   - Configures custom domain mapping

3. **DNS Setup**
   - Maps subdomain to Cloud Run service
   - Automatic SSL certificate provisioning
   - Global load balancing

## Programmatic API

```typescript
import { deployCommand } from "@daydreamsai/deploy";

await deployCommand({
  name: "my-agent",
  project: "my-gcp-project",
  file: "server.ts",
  region: "us-central1",
  memory: "512Mi",
  maxInstances: "50",
});
```

## Environment Variables

Create `.env.production` file:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

Deploy with:

```bash
daydreams-deploy deploy --name my-agent --env .env.production
```

## Monitoring

View real-time logs:

```bash
daydreams-deploy logs my-agent --follow
```

View metrics in Google Cloud Console:

- CPU usage
- Memory usage
- Request count
- Latency percentiles
- Error rate

## Cost Optimization

Cloud Run pricing:

- Pay only for actual usage
- Free tier: 2 million requests/month
- Auto-scales to zero when idle
- Configurable min/max instances

## Security

- Each agent runs in isolated container
- Automatic HTTPS with managed certificates
- Environment variables stored securely
- Service account with minimal permissions

## Troubleshooting

### Domain not accessible

- DNS propagation can take up to 48 hours
- Verify wildcard DNS records are configured
- Check Cloud Run domain mapping status

### Build failures

- Ensure Dockerfile.daydreams is valid
- Check Cloud Build logs for errors
- Verify all dependencies are installable

### Authentication errors

- Run `gcloud auth application-default login`
- Verify project has billing enabled
- Check required APIs are enabled

gcloud dns managed-zones create daydreams-labs-staging \
 --dns-name="agent.daydreams.systems." \
 --description="Zone for Daydreams agent deployments"

    gcloud compute addresses create daydreams-labs-staging \
    --global \
    --ip-version=IPV4

gcloud compute addresses describe daydreams-labs-staging --global

gcloud dns record-sets create "\*.agent.daydreams.systems." \
 --zone="daydreams-labs-staging" \
 --type="A" \
 --ttl="300" \
 --rrdatas="34.160.205.45"

NAME TYPE TTL DATA \*.agent.daydreams.systems. A 300 34.160.205.45

gcloud dns managed-zones describe daydreams-labs-staging

dnsName: agent.daydreams.systems. id: '3963925729438153797' kind:
dns#managedZone name: daydreams-labs-staging nameServers:

- ns-cloud-d1.googledomains.com.
- ns-cloud-d2.googledomains.com.
- ns-cloud-d3.googledomains.com.
- ns-cloud-d4.googledomains.com.
