---
title: "RelationshipSemantics"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / RelationshipSemantics

# Interface: RelationshipSemantics

Defined in: [packages/core/src/memory/knowledge-schema.ts:34](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L34)

Semantic metadata for relationships

## Properties

### bidirectional?

> `optional` **bidirectional**: `boolean`

Defined in: [packages/core/src/memory/knowledge-schema.ts:46](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L46)

Whether this relationship is bidirectional

***

### context?

> `optional` **context**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:42](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L42)

Context where this relationship applies

***

### inferred?

> `optional` **inferred**: `boolean`

Defined in: [packages/core/src/memory/knowledge-schema.ts:44](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L44)

Whether this relationship was inferred vs explicit

***

### inverseVerb?

> `optional` **inverseVerb**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:38](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L38)

Inverse verb (e.g., "works_for" inverse is "employs")

***

### strength?

> `optional` **strength**: `number`

Defined in: [packages/core/src/memory/knowledge-schema.ts:40](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L40)

Relationship strength (0-1)

***

### temporal?

> `optional` **temporal**: `object`

Defined in: [packages/core/src/memory/knowledge-schema.ts:48](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L48)

Temporal information

#### duration?

> `optional` **duration**: `number`

#### end?

> `optional` **end**: `Date`

#### start?

> `optional` **start**: `Date`

***

### verb

> **verb**: `string`

Defined in: [packages/core/src/memory/knowledge-schema.ts:36](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L36)

Human-readable verb describing the relationship
