---
title: "ExtractedRelationship"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ExtractedRelationship

# Interface: ExtractedRelationship

Defined in: [packages/core/src/memory/knowledge-schema.ts:152](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L152)

Result of relationship extraction from text

## Properties

### confidence

> **confidence**: `number`

Defined in: [packages/core/src/memory/knowledge-schema.ts:156](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L156)

Confidence score (0-1)

***

### extractionMethod

> **extractionMethod**: `"pattern"` \| `"llm"` \| `"manual"` \| `"verb"`

Defined in: [packages/core/src/memory/knowledge-schema.ts:164](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L164)

How this relationship was extracted

***

### relationship

> **relationship**: `Omit`\<[`SemanticRelationship`](./SemanticRelationship.md), `"id"`\>

Defined in: [packages/core/src/memory/knowledge-schema.ts:154](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L154)

Relationship details

***

### textSpan?

> `optional` **textSpan**: `object`

Defined in: [packages/core/src/memory/knowledge-schema.ts:158](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L158)

Text span that suggested this relationship

#### end

> **end**: `number`

#### start

> **start**: `number`

#### text

> **text**: `string`
