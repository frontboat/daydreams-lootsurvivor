---
title: "SemanticRelationship"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / SemanticRelationship

# Interface: SemanticRelationship

Defined in: [packages/core/src/memory/knowledge-schema.ts:58](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L58)

Enhanced relationship with semantic properties

## Extends

- [`Relationship`](./Relationship.md)

## Properties

### from

> **from**: `string`

Defined in: [packages/core/src/memory/types.ts:303](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L303)

#### Inherited from

[`Relationship`](./Relationship.md).[`from`](Relationship.md#from)

***

### id

> **id**: `string`

Defined in: [packages/core/src/memory/types.ts:302](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L302)

#### Inherited from

[`Relationship`](./Relationship.md).[`id`](Relationship.md#id)

***

### properties?

> `optional` **properties**: `Record`\<`string`, `unknown`\>

Defined in: [packages/core/src/memory/types.ts:306](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L306)

#### Inherited from

[`Relationship`](./Relationship.md).[`properties`](Relationship.md#properties)

***

### semantics?

> `optional` **semantics**: [`RelationshipSemantics`](./RelationshipSemantics.md)

Defined in: [packages/core/src/memory/knowledge-schema.ts:59](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L59)

Semantic metadata for this relationship

#### Overrides

[`Relationship`](./Relationship.md).[`semantics`](Relationship.md#semantics)

***

### strength?

> `optional` **strength**: `number`

Defined in: [packages/core/src/memory/types.ts:307](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L307)

#### Inherited from

[`Relationship`](./Relationship.md).[`strength`](Relationship.md#strength)

***

### to

> **to**: `string`

Defined in: [packages/core/src/memory/types.ts:304](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L304)

#### Inherited from

[`Relationship`](./Relationship.md).[`to`](Relationship.md#to)

***

### type

> **type**: `string`

Defined in: [packages/core/src/memory/types.ts:305](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L305)

#### Inherited from

[`Relationship`](./Relationship.md).[`type`](Relationship.md#type)
