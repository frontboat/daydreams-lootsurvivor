---
title: "EntityExtractionConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EntityExtractionConfig

# Interface: EntityExtractionConfig

Defined in: [packages/core/src/memory/knowledge-schema.ts:6](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L6)

Configuration for automatic entity extraction

## Properties

### contextClues?

> `optional` **contextClues**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:12](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L12)

Context clues that suggest this entity

***

### indicators?

> `optional` **indicators**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:10](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L10)

Keywords that indicate this entity type

***

### minConfidence?

> `optional` **minConfidence**: `number`

Defined in: [packages/core/src/memory/knowledge-schema.ts:14](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L14)

Minimum confidence threshold (0-1)

***

### patterns?

> `optional` **patterns**: `RegExp`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:8](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L8)

Regex patterns to match entities in text
