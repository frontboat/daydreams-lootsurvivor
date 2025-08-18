---
title: "ContextSettings"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextSettings

# Type Alias: ContextSettings

> **ContextSettings** = `object`

Defined in: [packages/core/src/types.ts:1212](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1212)

Configuration settings for a context

## Properties

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [packages/core/src/types.ts:1216](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1216)

Maximum number of execution steps

***

### maxWorkingMemorySize?

> `optional` **maxWorkingMemorySize**: `number`

Defined in: [packages/core/src/types.ts:1218](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1218)

Maximum size of working memory

***

### model?

> `optional` **model**: `LanguageModel`

Defined in: [packages/core/src/types.ts:1214](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1214)

Language model to use for this context

***

### modelSettings?

> `optional` **modelSettings**: `object`

Defined in: [packages/core/src/types.ts:1220](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1220)

Model-specific settings

#### Index Signature

\[`key`: `string`\]: `any`

#### maxTokens?

> `optional` **maxTokens**: `number`

#### providerOptions?

> `optional` **providerOptions**: `Record`\<`string`, `any`\>

#### stopSequences?

> `optional` **stopSequences**: `string`[]

#### temperature?

> `optional` **temperature**: `number`

#### topK?

> `optional` **topK**: `number`

#### topP?

> `optional` **topP**: `number`
