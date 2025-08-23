# Daydreams Core — Architecture Overview (Doc v0.1.0)

- Library: `@daydreamsai/core`
- Library Version (package.json): 0.3.20
- Document Version: v0.1.0
- Status: Draft
- Date: 2025-08-22

This document summarizes the architecture and usage of the `packages/core`
library. It’s intended as a stable reference while we work on abstraction and
further modularization.

## Table of Contents

- What It Is
- Key Exports & Modules
- Core Concepts
- Run Lifecycle
- Engine & Handlers
- Prompting & Streaming
- Memory System
- Task Runner & Concurrency
- Logging & Tracking
- Types & Validation
- Persistence & Contexts
- HTTP & Providers
- Error Handling
- Extensibility
- Gotchas / Notes
- Next Steps (Abstraction)
- Appendix: Paths & Files
- Changelog (Doc)

---

## What It Is

- Purpose: Framework to build stateful, type-safe AI agents with contexts,
  persistent/working memory, actions, streaming and export capabilities.
- Entrypoint: `packages/core/src/index.ts` re-exports contexts, memory, actions,
  prompts, engine runners, and utilities.

## Key Exports & Modules

- Agent factory: `createDreams` (`src/dreams.ts`)
- Context API: `context`, context state helpers (`src/context.ts`)
- Action/Input/Output helpers: `action`, `input`, `output` (`src/utils.ts`)
- Memory system: `MemorySystem` + providers (`src/memory`)
- Runner tasks: `runAgentContext`, `runGenerate`, `runAction`
  (`src/tasks/index.ts`)
- Prompting & streaming: `mainPrompt`, `wrapStream`, `handleStream`
  (`src/prompts/main.ts`, `src/streaming.ts`)
- Prompt builder API: `PromptBuilder`, `defaultPromptBuilder` (`src/types.ts`,
  `src/prompts/default-builder.ts`)
- Logger & analytics: `Logger`, `SimpleTracker` (`src/logger.ts`,
  `src/simple-tracker.ts`)
- HTTP/providers utils: `http`, `fetchGraphQL` (`src/http.ts`,
  `src/providers/api.ts`)
- Types: rich TS types for contexts/actions/IO/logs/memory (`src/types.ts`)

## Core Concepts

- Agent: Created via `createDreams(config)`. Manages registry
  (contexts/actions/IO/ext), DI container, memory, logger, task runner, and
  export manager.
- Context: Typed unit of state + behavior with schema, setup/load/save/render,
  lifecycle hooks (`onRun`, `onStep`, `onError`, `shouldContinue`), and optional
  `episodeHooks`.
- Inputs/Outputs: Typed I/O with optional `install`, `handler`, `format`, and
  Zod/AI SDK schema validation.
- Actions: Typed tools with schema/returns, `handler`, enablement, `actionState`
  (KV-backed), queueing, `onSuccess`/`onError`, and template resolution for
  arguments.

## Run Lifecycle

1. Start: `agent.start()` → initializes memory, boots services, installs
   extensions/inputs/outputs/actions, restores saved contexts, sets agent
   context if provided.
2. Execute: `agent.run({ context, args, ... })` enqueues `runAgentContext`
   (context-specific queue). Streams model output and converts to logs.
3. Send: `agent.send({ input: {type, data}, ... })` wraps input as `InputRef`
   then calls `run`.
4. Per-step: Build `mainPrompt`, stream/model → parse into `<reasoning>`,
   `<action_call>`, `<output>`; resolve actions/outputs; mark pending as
   processed; save working memory/state; continue if warranted.

## Engine & Handlers

- Engine (`src/engine.ts`): routes logs →
  - input → `handleInput`
  - `action_call` → `prepareActionCall` + `handleActionCall`
  - output → `prepareOutputRef` + `handleOutput`
  - manages subscribers and chunk streaming; pushes to working memory; emits
    error events.
- Handlers (`src/handlers.ts`):
  - Inputs: validate/parse input; optional handler; retrieve `relevantMemories`
    via vector recall.
  - Actions: resolve target action (by name + optional context key); parse
    JSON/XML content; resolve `{{...}}` templates (`calls[n].path`,
    `shortTermMemory.key`); validate via Zod/AI Schema; enqueue `runAction`.
  - Outputs: resolve output interface; validate; invoke handler; format; yield
    `OutputRef`(s).
  - Context prep: compose contexts; aggregate context-specific
    inputs/outputs/actions and agent-level overrides.

## Prompting & Streaming

- Prompt: Developers supply a `PromptBuilder` via `createDreams({ prompt })`.
  The builder receives rich context (`PromptBuildContext`) and returns
  `{ prompt }`.
  - Default: `defaultPromptBuilder` wraps the legacy `mainPrompt` for backward
    compatibility.
  - `PromptBuildContext`:
    `{ contexts, actions, outputs, workingMemory, settings?, chainOfThoughtSize?, agent? }`.
  - `PromptBuildResult`: `{ prompt: string; metadata?: Record<string, any> }`.
  - Legacy: `mainPrompt` remains available (`src/prompts/main.ts`).
- Streaming: `wrapStream` and `xmlStreamParser` convert model stream into
  structured chunks. Tags: `think|reasoning`, `action_call`, `output`, enclosed
  by `<response>…</response>`.
- Model configs: `src/configs.ts` sets per-model quirks (prefix/think tags;
  “reasoning models”).

## Memory System

- `MemorySystem` (`src/memory/memory-system.ts`) composes:
  - KV: arbitrary object storage, batch ops, scanning.
  - Vector: index/search with basic similarity + filters.
  - Graph: entities/relationships; related traversal; shortest path.
  - Working memory: per-context rolling log store with locking
    (`WorkingMemoryImpl`).
  - Episodic memory: simple episode construction/indexing over logs; optional
    custom hooks (`episode-hooks.ts`).
- Default providers are in-memory (`src/memory/providers/in-memory.ts`).

## Task Runner & Concurrency

- `TaskRunner` (`src/task.ts`): multiple queues, concurrency per queue,
  priorities, retries, timeouts, abort propagation.
- Queues: per-context queue (keyed `context:<id>`) and shared `llm` queue for
  model calls.
- Access: `agent.getTaskConfig()`, `agent.getPriorityLevels()`.

## Logging & Tracking

- Logger (`src/logger.ts`): transports (console/file/http/stream), themes,
  structured events (`AGENT_*`, `MODEL_*`, `ACTION_*`, `CONTEXT_*`, `MEMORY_*`,
  `REQUEST_*`).
- SimpleTracker (`src/simple-tracker.ts`): listens to logger events; tracks
  per-request metrics (tokens, cost, durations), aggregates, and summaries.

## Types & Validation

- Schemas: Zod, raw shapes, or AI SDK JSON Schema for actions/outputs/inputs.
- Strong types: `Context`, `ContextState`, `Agent`, `Action`, `Output`, `Input`,
  `WorkingMemory`, `AnyRef`
  (Input/Output/Thought/ActionCall/ActionResult/Event/Step/Run), `LogChunk`,
  etc. (`src/types.ts`).

## Persistence & Contexts

- Context IDs: `type` or `type:key(args)` using optional `context.key(args)`.
- State saving: snapshot → `context:${id}`; memory → `memory:${id}`; working
  memory → `working-memory:${id}`; index of contexts in `contexts` key.
- Lazy load: `agent.getContextById` reconstructs state from snapshot when
  needed.

## HTTP & Providers

- `http.ts`: fetch with retries/backoff, JSON helpers, JSON-RPC, GraphQL
  helpers.
- `providers/api.ts`: `fetchRest` and `fetchGraphQL` with consistent error
  handling.

## Error Handling

- `NotFoundError`: unknown action/input/output.
- `ParsingError`: failed schema/JSON/XML parse (pretty Zod errors included).
- Engine resilience: logs error events and continues where sensible; contexts
  can implement `onError`.

## Extensibility

- Extensions: bundle inputs/outputs/actions/contexts/services; optional
  `install` hook (`Extension` type).
- Services: simple lifecycle via `service-provider.ts`.
- Template resolvers: customize `{{...}}` resolution for action arguments.

## Gotchas / Notes

- Model required to run: ensure `agent.model` or a context-level override.
- Streaming correctness: `wrapStream` avoids emitting duplicate `</response>`.
- Memory size: use `trimWorkingMemory` and `maxWorkingMemorySize` to keep
  prompts within limits.
- Template indices: `{{calls[n]...}}` refer to results from the current turn.

## Next Steps (Abstraction)

- Define clear interfaces for replaceable subsystems (memory providers, engine
  router, prompt builder, stream parser).
- Separate “core” protocols from default in-memory implementations.
- Introduce optional packages for advanced providers (e.g., Redis KV, pg/vector
  DBs, Neo4j, etc.).
- Formalize streaming grammar (XML schema) and consider alternatives (JSON
  mode + tools) behind a pluggable parser.
- Stabilize extension API and context composition semantics.
- Elaborate a migration guide for incremental adoption of abstractions.

## Appendix: Paths & Files

- Entrypoint: `packages/core/src/index.ts`
- Agent: `packages/core/src/dreams.ts`
- Engine: `packages/core/src/engine.ts`
- Handlers: `packages/core/src/handlers.ts`
- Tasks: `packages/core/src/tasks/index.ts`
- Contexts: `packages/core/src/context.ts`
- Memory (system/providers/types): `packages/core/src/memory/`
- Prompt & formatting: `packages/core/src/prompts/main.ts`,
  `packages/core/src/formatters.ts`, `packages/core/src/prompt.ts`
- Streaming: `packages/core/src/streaming.ts`, `packages/core/src/xml.ts`
- Logger & tracker: `packages/core/src/logger.ts`,
  `packages/core/src/simple-tracker.ts`
- Utilities: `packages/core/src/utils.ts`, `packages/core/src/http.ts`,
  `packages/core/src/providers/api.ts`
- Types: `packages/core/src/types.ts`

## Changelog (Doc)

- v0.1.0 — Initial architecture overview aligned with
  `@daydreamsai/core@0.3.16`.
