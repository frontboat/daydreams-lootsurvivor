---
title: "EntityTypeDefinition"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EntityTypeDefinition

# Interface: EntityTypeDefinition

Defined in: [packages/core/src/memory/knowledge-schema.ts:65](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L65)

Entity type definition in knowledge schema

## Properties

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:71](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L71)

Description of this entity type

***

### displayName?

> `optional` **displayName**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:69](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L69)

Human-readable display name

***

### extraction?

> `optional` **extraction**: [`EntityExtractionConfig`](./EntityExtractionConfig.md)

Defined in: [packages/core/src/memory/knowledge-schema.ts:77](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L77)

Configuration for automatic extraction

***

### name

> **name**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:67](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L67)

Entity type name

***

### optionalProperties?

> `optional` **optionalProperties**: `Record`\<`string`, `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"date"`\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:75](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L75)

Optional properties with their types

***

### relationships?

> `optional` **relationships**: `Record`\<`string`, [`RelationshipTypeDefinition`](./RelationshipTypeDefinition.md)\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:79](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L79)

Relationships this entity can have

***

### requiredProperties?

> `optional` **requiredProperties**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:73](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L73)

Required properties for this entity type
