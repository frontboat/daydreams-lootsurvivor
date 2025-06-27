---
title: "Registry"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Registry

# Type Alias: Registry

> **Registry** = `object`

Defined in: [packages/core/src/types.ts:600](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L600)

Central registry for all agent components and resources

## Properties

### actions

> **actions**: `Map`\<`string`, [`AnyAction`](./AnyAction.md)\>

Defined in: [packages/core/src/types.ts:604](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L604)

Map of registered action types

***

### contexts

> **contexts**: `Map`\<`string`, [`AnyContext`](./AnyContext.md)\>

Defined in: [packages/core/src/types.ts:602](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L602)

Map of registered context types

***

### extensions

> **extensions**: `Map`\<`string`, [`Extension`](./Extension.md)\>

Defined in: [packages/core/src/types.ts:610](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L610)

Map of registered extensions

***

### inputs

> **inputs**: `Map`\<`string`, [`Input`](./Input.md)\>

Defined in: [packages/core/src/types.ts:606](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L606)

Map of registered input types

***

### models

> **models**: `Map`\<`string`, [`LanguageModelV1`](./LanguageModelV1.md)\>

Defined in: [packages/core/src/types.ts:614](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L614)

Map of registered language models

***

### outputs

> **outputs**: `Map`\<`string`, [`Output`](./Output.md)\>

Defined in: [packages/core/src/types.ts:608](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L608)

Map of registered output types

***

### prompts

> **prompts**: `Map`\<`string`, `string`\>

Defined in: [packages/core/src/types.ts:612](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L612)

Map of registered prompt templates
