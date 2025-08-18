---
title: "KnowledgeExtractor"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / KnowledgeExtractor

# Class: KnowledgeExtractor

Defined in: [packages/core/src/memory/knowledge-extractor.ts:30](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-extractor.ts#L30)

Knowledge extractor that combines LLM and pattern-based extraction

## Constructors

### Constructor

> **new KnowledgeExtractor**(`model?`, `config?`): `KnowledgeExtractor`

Defined in: [packages/core/src/memory/knowledge-extractor.ts:31](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-extractor.ts#L31)

#### Parameters

##### model?

`LanguageModel`

##### config?

`ExtractionConfig` = `{}`

#### Returns

`KnowledgeExtractor`

## Methods

### extract()

> **extract**(`text`, `schema`, `contextId?`): `Promise`\<[`ExtractionResult`](./ExtractionResult.md)\>

Defined in: [packages/core/src/memory/knowledge-extractor.ts:39](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/knowledge-extractor.ts#L39)

Extract entities and relationships from text using the provided schema

#### Parameters

##### text

`string`

##### schema

[`KnowledgeSchema`](./KnowledgeSchema.md)

##### contextId?

`string`

#### Returns

`Promise`\<[`ExtractionResult`](./ExtractionResult.md)\>
