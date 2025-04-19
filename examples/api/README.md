# Take an API schema from a URL, and give it to the agent nicely under the hood

> TODO: Be able to define more than 1 schema URL in our env, so that when we
> build the extension in the agent, the context expands for all data source
> schemas listed.

**TLDR:**

1. Add variable to .env:

```bash
API_SCHEMA_URL=https://raw.githubusercontent.com/open-meteo/open-meteo/refs/heads/main/openapi.yml
```

2. Install extra deps:

```bash
cd examples/api
bun i
```

> Need to test from fresh still but should be ok

3. Run the agent and ask about the weather somewhere

```bash
bun run examples/api/apiAgent.ts
```

## Overview

The agent uses a dynamically built extension (`apiExtension.ts`) that parses an
OpenAPI specification provided via a URL. It creates Daydream `action`s for each
API endpoint found in the specification, allowing the agent (and the user
interacting with it) to call these APIs.

- `apiAgent.ts`: The main script that sets up and starts the Daydream agent.
- `apiExtension.ts`: Contains the logic (`buildApiExtension`) to fetch and parse
  an OpenAPI schema (v2 or v3) and generate corresponding actions.
- `package.json`: Defines dependencies and scripts for the example. The only
  additional dep we're using here is `@apidevtools/swagger-parser` and maybe
  `node-fetch`.

## Prerequisites

- [Bun](https://bun.sh/) (used for running the example and managing
  dependencies)

## Setup

1.  **Navigate to the workspace root directory** (if you aren't already there).

2.  **Install dependencies:**

    Make sure all dependencies for the workspace (including this example) are
    installed. Run from the **workspace root**:

    ```bash
    bun install
    ```

## Configuration

The agent requires the URL of an OpenAPI specification file to be set as an
environment variable, and of course you'll need an api key from your provider of
choice.

I chose to use GPT, as seen with `import { openai } from "@ai-sdk/openai";` and
`model: openai("gpt-4o"),`.

If you'd like to use a different one, let's say Claude, simply change to
`import { anthropic } from "@ai-sdk/anthropic` and
`model: anthropic("claude-3-7-sonnet-latest"),`.

In your .env in the root (the regular one) make sure you have whatever key you
need for whatever provider you chose. I have `OPENAI_API_KEY=sk-proj-123`. You
might have `ANTHROPIC_API_KEY=sk-ant-123`.

Next up, add this API schema URL variable to your .env. This is what we fetch
upon initializing the agent to do some handy work to make it available to our
agent.

- **`API_SCHEMA_URL`**: The URL pointing to the OpenAPI (v2 Swagger or v3)
  specification file (e.g., `.json` or `.yaml`).

Set this variable in your environment. If you are using a `.env` file in the
workspace root, add the line there:

```dotenv
# .env file in workspace root
API_SCHEMA_URL="https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml"
```

Alternatively, export it in your shell session:

```bash
# Example using Open-Meteo weather API (OpenAPI v3)
export API_SCHEMA_URL="https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml"

# Example using CoinGecko crypto API (Swagger v2)
# export API_SCHEMA_URL="https://www.coingecko.com/api/documentations/v3/swagger.json"
```

## Running the Agent

**Important:** Run the agent from the **workspace root directory**. This is
necessary so that it can correctly load the `.env` file from the root if you are
using one.

Once dependencies are installed and the `API_SCHEMA_URL` environment variable is
set, you can start the agent from the root:

```bash
# Standard start
bun run examples/api/apiAgent.ts
```

The agent will start, parse the API schema specified by `API_SCHEMA_URL`, and
create actions for the available endpoints. Its initial goal is "Help the user
query information using the API.", and it will wait for user input.

You can then ask the agent to perform tasks using the API, for example:

```
> Get the weather forecast for Berlin
> Get the current price of ethereum in usd
```

The agent will attempt to use the generated actions (like `GET /v1/forecast` or
`GET /simple/price`) to fulfill your request.

## TROUBLESHOOT

If you're running this example after cloning the daydreams repo, go through
these steps:

1. Build core package located at `packages/core`:

```bash
cd packages/core/
bun run build
```

and also build the cli package located at `packages/cli`:

```bash
cd packages/cli
bun run build
```

then from root, to start the agent:

```bash
bun run examples/api/apiAgent.ts
```
