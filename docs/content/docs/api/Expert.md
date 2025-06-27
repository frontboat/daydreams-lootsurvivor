---
title: "Expert"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Expert

# Type Alias: Expert

> **Expert** = `object`

Defined in: [packages/core/src/types.ts:558](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L558)

Represents an expert system with specialized knowledge and capabilities

## Properties

### actions?

> `optional` **actions**: [`AnyAction`](./AnyAction.md)[]

Defined in: [packages/core/src/types.ts:568](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L568)

Optional actions available to this expert

***

### description

> **description**: `string`

Defined in: [packages/core/src/types.ts:562](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L562)

Description of the expert's domain and capabilities

***

### instructions

> **instructions**: `string`

Defined in: [packages/core/src/types.ts:564](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L564)

Detailed instructions for the expert's behavior

***

### model?

> `optional` **model**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:566](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L566)

Optional language model specific to this expert

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:560](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L560)

Unique identifier for the expert type
