---
title: "ExtractedEntity"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ExtractedEntity

# Interface: ExtractedEntity

Defined in: [packages/core/src/memory/knowledge-schema.ts:134](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L134)

Result of entity extraction from text

## Properties

### confidence

> **confidence**: `number`

Defined in: [packages/core/src/memory/knowledge-schema.ts:138](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L138)

Confidence score (0-1)

***

### entity

> **entity**: `Omit`\<[`Entity`](./Entity.md), `"id"`\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:136](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L136)

Entity details

***

### extractionMethod

> **extractionMethod**: `"pattern"` \| `"indicator"` \| `"llm"` \| `"manual"`

Defined in: [packages/core/src/memory/knowledge-schema.ts:146](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L146)

How this entity was extracted

***

### textSpan?

> `optional` **textSpan**: `object`

Defined in: [packages/core/src/memory/knowledge-schema.ts:140](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L140)

Text span that matched

#### end

> **end**: `number`

#### start

> **start**: `number`

#### text

> **text**: `string`
