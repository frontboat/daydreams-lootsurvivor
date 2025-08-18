---
title: "ExtractionResult"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ExtractionResult

# Interface: ExtractionResult

Defined in: [packages/core/src/memory/knowledge-schema.ts:170](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L170)

Complete extraction result

## Properties

### entities

> **entities**: [`ExtractedEntity`](./ExtractedEntity.md)[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:172](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L172)

Extracted entities

***

### metadata

> **metadata**: `object`

Defined in: [packages/core/src/memory/knowledge-schema.ts:178](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L178)

Processing metadata

#### model?

> `optional` **model**: `string`

LLM model used (if any)

#### processingTime

> **processingTime**: `number`

Time taken to extract

#### schemaName

> **schemaName**: `string`

Schema used for extraction

#### sourceText

> **sourceText**: `string`

Text that was processed

***

### overallConfidence

> **overallConfidence**: `number`

Defined in: [packages/core/src/memory/knowledge-schema.ts:176](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L176)

Overall confidence in extraction

***

### relationships

> **relationships**: [`ExtractedRelationship`](./ExtractedRelationship.md)[]

Defined in: [packages/core/src/memory/knowledge-schema.ts:174](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-schema.ts#L174)

Extracted relationships
