---
title: "TaskConfiguration"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / TaskConfiguration

# Type Alias: TaskConfiguration

> **TaskConfiguration** = `object`

Defined in: [packages/core/src/types.ts:869](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L869)

Configuration for task execution behavior

## Properties

### concurrency?

> `optional` **concurrency**: `object`

Defined in: [packages/core/src/types.ts:870](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L870)

#### default?

> `optional` **default**: `number`

Default concurrency for TaskRunner main queue (default: 3)

#### llm?

> `optional` **llm**: `number`

Max concurrent LLM calls across all contexts (default: 3)

***

### priority?

> `optional` **priority**: `object`

Defined in: [packages/core/src/types.ts:876](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L876)

#### default?

> `optional` **default**: `number`

Default priority for agent runs (default: 10)

#### high?

> `optional` **high**: `number`

High priority for urgent operations

#### low?

> `optional` **low**: `number`

Low priority for background tasks
