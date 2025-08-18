---
title: "defineSchema"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / defineSchema

# Function: defineSchema()

> **defineSchema**(`config`): [`KnowledgeSchema`](./KnowledgeSchema.md)

Defined in: [packages/core/src/memory/knowledge-schema.ts:193](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L193)

Factory function to create a knowledge schema

## Parameters

### config

#### description?

`string`

#### domain?

`string`

#### entityTypes

`Record`\<`string`, `Omit`\<[`EntityTypeDefinition`](./EntityTypeDefinition.md), `"name"`\>\>

#### name

`string`

#### relationshipTypes?

`Record`\<`string`, `Omit`\<[`RelationshipTypeDefinition`](./RelationshipTypeDefinition.md), `"name"`\>\>

#### version?

`string`

## Returns

[`KnowledgeSchema`](./KnowledgeSchema.md)
