---
title: "KnowledgeSchema"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / KnowledgeSchema

# Interface: KnowledgeSchema

Defined in: [packages/core/src/memory/knowledge-schema.ts:105](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L105)

Complete knowledge graph schema definition

## Properties

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:111](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L111)

Human-readable description

***

### entityTypes

> **entityTypes**: `Record`\<`string`, [`EntityTypeDefinition`](./EntityTypeDefinition.md)\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:113](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L113)

Entity type definitions

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [packages/core/src/memory/knowledge-schema.ts:117](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L117)

Schema metadata

#### author?

> `optional` **author**: `string`

Schema author/organization

#### createdAt?

> `optional` **createdAt**: `Date`

When schema was created

#### domain?

> `optional` **domain**: `string`

Domain this schema applies to

#### tags?

> `optional` **tags**: `string`[]

Tags for categorization

#### updatedAt?

> `optional` **updatedAt**: `Date`

Last modified timestamp

***

### name

> **name**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:107](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L107)

Schema name/identifier

***

### relationshipTypes

> **relationshipTypes**: `Record`\<`string`, [`RelationshipTypeDefinition`](./RelationshipTypeDefinition.md)\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:115](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L115)

Global relationship type definitions

***

### version

> **version**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:109](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L109)

Schema version for migration support
