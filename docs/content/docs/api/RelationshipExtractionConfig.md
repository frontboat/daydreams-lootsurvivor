---
title: "RelationshipExtractionConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / RelationshipExtractionConfig

# Interface: RelationshipExtractionConfig

Defined in: [packages/core/src/memory/knowledge-schema.ts:20](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L20)

Configuration for automatic relationship extraction

## Properties

### bidirectional?

> `optional` **bidirectional**: `boolean`

Defined in: [packages/core/src/memory/knowledge-schema.ts:28](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L28)

Whether this relationship is bidirectional

***

### patterns?

> `optional` **patterns**: `RegExp`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:22](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L22)

Natural language patterns that indicate this relationship

***

### prepositions?

> `optional` **prepositions**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:26](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L26)

Prepositions that connect entities in this relationship

***

### verbs?

> `optional` **verbs**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:24](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L24)

Verbs that suggest this relationship
