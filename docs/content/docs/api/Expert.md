---
title: "Expert"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Expert

# Type Alias: Expert

> **Expert** = `object`

Defined in: [packages/core/src/types.ts:527](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L527)

Represents an expert system with specialized knowledge and capabilities

## Properties

### actions?

> `optional` **actions**: [`AnyAction`](./AnyAction.md)[]

Defined in: [packages/core/src/types.ts:537](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L537)

Optional actions available to this expert

***

### description

> **description**: `string`

Defined in: [packages/core/src/types.ts:531](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L531)

Description of the expert's domain and capabilities

***

### instructions

> **instructions**: `string`

Defined in: [packages/core/src/types.ts:533](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L533)

Detailed instructions for the expert's behavior

***

### model?

> `optional` **model**: `LanguageModel`

Defined in: [packages/core/src/types.ts:535](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L535)

Optional language model specific to this expert

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:529](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L529)

Unique identifier for the expert type
