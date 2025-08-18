---
title: "Registry"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Registry

# Type Alias: Registry

> **Registry** = `object`

Defined in: [packages/core/src/types.ts:568](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L568)

Central registry for all agent components and resources

## Properties

### actions

> **actions**: `Map`\<`string`, [`AnyAction`](./AnyAction.md)\>

Defined in: [packages/core/src/types.ts:572](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L572)

Map of registered action types

***

### contexts

> **contexts**: `Map`\<`string`, [`AnyContext`](./AnyContext.md)\>

Defined in: [packages/core/src/types.ts:570](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L570)

Map of registered context types

***

### extensions

> **extensions**: `Map`\<`string`, [`Extension`](./Extension.md)\>

Defined in: [packages/core/src/types.ts:578](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L578)

Map of registered extensions

***

### inputs

> **inputs**: `Map`\<`string`, [`Input`](./Input.md)\>

Defined in: [packages/core/src/types.ts:574](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L574)

Map of registered input types

***

### models

> **models**: `Map`\<`string`, `LanguageModel`\>

Defined in: [packages/core/src/types.ts:582](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L582)

Map of registered language models

***

### outputs

> **outputs**: `Map`\<`string`, [`Output`](./Output.md)\>

Defined in: [packages/core/src/types.ts:576](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L576)

Map of registered output types

***

### prompts

> **prompts**: `Map`\<`string`, `string`\>

Defined in: [packages/core/src/types.ts:580](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L580)

Map of registered prompt templates
