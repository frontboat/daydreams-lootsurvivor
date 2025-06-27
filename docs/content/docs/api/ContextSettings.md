---
title: "ContextSettings"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextSettings

# Type Alias: ContextSettings

> **ContextSettings** = `object`

Defined in: [packages/core/src/types.ts:1225](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1225)

Configuration settings for a context

## Properties

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [packages/core/src/types.ts:1229](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1229)

Maximum number of execution steps

***

### maxWorkingMemorySize?

> `optional` **maxWorkingMemorySize**: `number`

Defined in: [packages/core/src/types.ts:1231](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1231)

Maximum size of working memory

***

### model?

> `optional` **model**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:1227](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1227)

Language model to use for this context

***

### modelSettings?

> `optional` **modelSettings**: `object`

Defined in: [packages/core/src/types.ts:1233](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1233)

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
