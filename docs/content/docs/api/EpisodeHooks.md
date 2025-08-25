---
title: "EpisodeHooks"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EpisodeHooks

# Interface: EpisodeHooks<TContext>

Episode detection and creation hooks for contexts. Hooks let you define when an episode starts/ends, how to build its content, and what extra metadata to attach — while the system handles normalization, storage, and vector indexing.

By default, stored episodes are indexed with both summary and logs (chunked), and logs exclude infrastructure refs and “thoughts” unless you opt in.

## Type Parameters

- TContext extends AnyContext = AnyContext

## Methods

### shouldStartEpisode?
- (ref, workingMemory, contextState, agent) => boolean | Promise<boolean>
- Decide when to begin collecting an episode.

### shouldEndEpisode?
- (ref, workingMemory, contextState, agent) => boolean | Promise<boolean>
- Decide when to finalize and store an episode.

### createEpisode?
- (logs, contextState, agent) => CreateEpisodeResult | Episode | undefined | Promise<...>
- Return partial details for the episode. The system normalizes and fills gaps:
  - If you provide `logs`, they will be sanitized and stored.
  - If you omit `summary`, a summary will be auto-generated from logs.
  - If you return a full `Episode`, it is used as-is (with sanitization applied to logs).

### classifyEpisode?
- (episodeData, contextState) => string
- Return a type/classification string for the episode (e.g., "learning", "extended").

### extractMetadata?
- (episodeData, logs, contextState) => Record<string, any>
- Attach additional metadata to the stored episode.

## Additional Options (EpisodeHooks)

- includeRefs?: Array<'input' | 'output' | 'thought' | 'action_call' | 'action_result' | 'event' | 'step' | 'run'>
  - Controls which log refs are stored in episodes. Default excludes 'thought'.
- maxActionResultBytes?: number (default: 4096)
  - Truncates large action_result payloads; stores a small stub { __truncated, __bytes, __keys }.
- actionResultRedactor?: (data: any) => any
  - Custom redactor for action_result data. Overrides size-based truncation.

## Storage + Indexing Behavior (Summary)

- Hooks decide when/how to build episode content. The system then:
  - Sanitizes logs according to includeRefs and redaction rules.
  - Persists a full Episode in KV for durability.
  - Indexes vector docs by default with contentMode: 'summary+logs' and chunking (size 1200, overlap 200) under `episodes:<contextId>`.
  - During recall, the handler decorates content with timestamps and does not require KV reads.

## CreateEpisodeResult

```ts
type CreateEpisodeResult = {
  type?: string;
  summary?: string;      // optional; auto-generated if omitted and logs exist
  logs?: AnyRef[];       // optional; defaults to the collected logs
  input?: any;
  output?: any;
  context?: string;
  metadata?: Record<string, any>;
}
```

## Example: Minimal, Actionable Episodes

```ts
const hooks: EpisodeHooks = {
  shouldStartEpisode: (ref) => ref.ref === 'input' && ref.type === 'text',
  shouldEndEpisode: (ref) => ref.ref === 'output' && ref.processed,

  // Provide a minimal shape; system will auto-summarize and sanitize logs
  createEpisode: (logs, ctx) => ({
    // optional: summary; otherwise auto-generated
    summary: `Session: ${logs.filter(l => l.ref==='input').length} inputs`,
  }),

  classifyEpisode: (data) => 'standard',

  extractMetadata: (data, logs, ctx) => ({
    userId: ctx.args?.userId,
    interactionCount: logs.filter(l => l.ref==='input').length,
  }),

  // Exclude thoughts; keep episodes actionable
  includeRefs: ['input','output','action_call','action_result','event'],
  // Ensure heavy results don't pollute memory
  maxActionResultBytes: 2048,
}
```

## Example: Opt-in Thoughts & Custom Result Redaction

```ts
const hooks: EpisodeHooks = {
  includeRefs: ['input','output','thought','action_call','action_result','event'],
  actionResultRedactor: (data) => ({
    ok: !!data,
    keys: Object.keys(data || {})
  }),
  createEpisode: (logs) => ({ logs }),
}
```

## Notes

- Logs are sanitized before storage: infra refs (e.g., 'step','run') are excluded by default; sensitive fields (prompt/instructions/system/template/xml) in log.data are redacted.
- The vector transcript is built from sanitized logs (no JSON blobs), using simple role-prefixed lines.
- If you want to completely bypass sanitization, return a full Episode and set includeRefs to match your needs; consider a custom redactor for large action results.
