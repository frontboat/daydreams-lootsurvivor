---
title: "Relationship"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Relationship

# Interface: Relationship

Defined in: [packages/core/src/memory/types.ts:301](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L301)

## Extended by

- [`SemanticRelationship`](./SemanticRelationship.md)

## Properties

### from

> **from**: `string`

Defined in: [packages/core/src/memory/types.ts:303](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L303)

***

### id

> **id**: `string`

Defined in: [packages/core/src/memory/types.ts:302](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L302)

***

### properties?

> `optional` **properties**: `Record`\<`string`, `unknown`\>

Defined in: [packages/core/src/memory/types.ts:306](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L306)

***

### semantics?

> `optional` **semantics**: `object`

Defined in: [packages/core/src/memory/types.ts:309](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L309)

Semantic metadata for this relationship

#### confidence?

> `optional` **confidence**: `number`

Confidence in this relationship (0-1)

#### context?

> `optional` **context**: `string`

Context where this relationship applies

#### inferred?

> `optional` **inferred**: `boolean`

Whether this relationship was inferred vs explicit

#### inverseVerb?

> `optional` **inverseVerb**: `string`

Inverse verb (e.g., "works_for" inverse is "employs")

#### strength?

> `optional` **strength**: `number`

Relationship strength (0-1) - can override top-level strength

#### temporal?

> `optional` **temporal**: `object`

Temporal information

##### temporal.duration?

> `optional` **duration**: `number`

##### temporal.end?

> `optional` **end**: `Date`

##### temporal.start?

> `optional` **start**: `Date`

#### verb

> **verb**: `string`

Human-readable verb describing the relationship

***

### strength?

> `optional` **strength**: `number`

Defined in: [packages/core/src/memory/types.ts:307](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L307)

***

### to

> **to**: `string`

Defined in: [packages/core/src/memory/types.ts:304](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L304)

***

### type

> **type**: `string`

Defined in: [packages/core/src/memory/types.ts:305](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L305)
