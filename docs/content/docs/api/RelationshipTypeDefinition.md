---
title: "RelationshipTypeDefinition"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / RelationshipTypeDefinition

# Interface: RelationshipTypeDefinition

Defined in: [packages/core/src/memory/knowledge-schema.ts:85](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L85)

Relationship type definition in knowledge schema

## Properties

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:91](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L91)

Description of this relationship

***

### displayName?

> `optional` **displayName**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:89](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L89)

Human-readable display name

***

### extraction?

> `optional` **extraction**: [`RelationshipExtractionConfig`](./RelationshipExtractionConfig.md)

Defined in: [packages/core/src/memory/knowledge-schema.ts:97](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L97)

Configuration for automatic extraction

***

### multiple?

> `optional` **multiple**: `boolean`

Defined in: [packages/core/src/memory/knowledge-schema.ts:99](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L99)

Whether multiple relationships of this type are allowed

***

### name

> **name**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:87](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L87)

Relationship type name

***

### semantics

> **semantics**: [`RelationshipSemantics`](./RelationshipSemantics.md)

Defined in: [packages/core/src/memory/knowledge-schema.ts:95](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L95)

Semantic information about this relationship

***

### targetEntityTypes

> **targetEntityTypes**: `string`[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:93](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L93)

Target entity types this relationship can connect to
