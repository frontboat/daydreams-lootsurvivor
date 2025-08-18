---
title: "MemoryConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / MemoryConfig

# Interface: MemoryConfig

Defined in: [packages/core/src/memory/types.ts:46](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L46)

Memory system configuration

## Properties

### knowledge?

> `optional` **knowledge**: `object`

Defined in: [packages/core/src/memory/types.ts:53](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L53)

#### enabled?

> `optional` **enabled**: `boolean`

#### extraction?

> `optional` **extraction**: `object`

##### extraction.maxTokens?

> `optional` **maxTokens**: `number`

##### extraction.minConfidence?

> `optional` **minConfidence**: `number`

##### extraction.temperature?

> `optional` **temperature**: `number`

##### extraction.usePatternFallback?

> `optional` **usePatternFallback**: `boolean`

#### model?

> `optional` **model**: `LanguageModel`

#### schema?

> `optional` **schema**: [`KnowledgeSchema`](./KnowledgeSchema.md)

***

### logger?

> `optional` **logger**: `any`

Defined in: [packages/core/src/memory/types.ts:52](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L52)

***

### providers

> **providers**: `object`

Defined in: [packages/core/src/memory/types.ts:47](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L47)

#### graph

> **graph**: [`GraphProvider`](./GraphProvider.md)

#### kv

> **kv**: [`KeyValueProvider`](./KeyValueProvider.md)

#### vector

> **vector**: [`VectorProvider`](./VectorProvider.md)
