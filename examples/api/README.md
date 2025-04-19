# API Agent using Generic Fetch Action

This directory demonstrates a Daydreams agent (`example-api-schema.ts`) that
interacts with APIs dynamically using a single, generic fetch action
(`fetchAction.ts`).

## Overview

> TODO: add in rendering api contexts tool call for injection into state when
> needed.

This agent uses a modern, flexible approach to interacting with APIs:

- **No Pre-loading:** It does **not** require an API schema URL to be set as an
  environment variable beforehand.
- **Generic `fetchAction`:** It utilizes `fetchAction.ts`, a reusable action
  that can make arbitrary HTTP requests based on parameters provided by the
  agent (URL, method, headers, params, body, responseType). It uses
  `@daydreamsai/core`'s built-in `http` utility and handles optional JSON
  parsing and structured success/error responses.
- **Dynamic Workflow:** The agent's initial goal prompts it to first ask the
  user for an OpenAPI schema URL. It then uses the `fetch` action (with
  `responseType: 'text'`) to retrieve the schema content. After analyzing the
  schema text, it waits for user API requests. When a request comes in (e.g.,
  "Get weather in Berlin"), it uses the `fetch` action again, constructing the
  necessary parameters (like URL, query params based on the schema, and setting
  `responseType: 'json'` if appropriate) to call the target API.

- `example-api-schema.ts`: The main script for the agent.
- `fetchAction.ts`: Defines the generic `fetch` action.

**TLDR:**

1.  Add necessary LLM API keys (e.g., `OPENAI_API_KEY`) to your `.env` file in
    the workspace root.
2.  Install deps (run from workspace root):
    ```bash
    bun install
    ```
3.  Run the agent (from workspace root):
    ```bash
    bun run examples/api/example-api-schema.ts
    ```
    (The agent will ask you for a schema URL first)

---

## Prerequisites & Setup

- [Bun](https://bun.sh/) (used for running the example and managing
  dependencies)
- LLM API Key (e.g., OpenAI, Anthropic) set in a `.env` file in the workspace
  root.

1.  **Navigate to the workspace root directory** (if you aren't already there).

2.  **Install dependencies:**

    Make sure all dependencies for the workspace (including this example) are
    installed. Run from the **workspace root**:

    ```bash
    bun install
    ```

## Configuration

This agent only requires the standard LLM provider API key (e.g.,
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) in your root `.env` file.

## Running the Agent

**Important:** Run the agent from the **workspace root directory**. This is
necessary so that it can correctly load the `.env` file from the root.

```bash
bun run examples/api/example-api-schema.ts
```

The agent will start. Right now\* it works by user providing a URL to a schema.
(e.g., the Open-Meteo URL:
`https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml`).
After fetching and analyzing it, you can ask API-related questions:

```
> Use the schema at https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml
> Get the weather forecast for Berlin
```

## Troubleshooting

If you're running this example after cloning the daydreams repo, you might need
to build the core packages first.

1. Build core package located at `packages/core`:

```bash
cd packages/core/
bun run build
```

2. Build the cli package located at `packages/cli`:

```bash
cd packages/cli
bun run build
```

Then return to the workspace root to run the agent as described above.
