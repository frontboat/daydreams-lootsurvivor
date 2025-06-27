---
title: "ActionState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ActionState

# Type Alias: ActionState\<Data\>

> **ActionState**\<`Data`\> = `object`

Defined in: [packages/core/src/memory/types.ts:566](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L566)

Represents a memory configuration for storing data

## Type Parameters

### Data

`Data` = `any`

Type of data stored in memory

## Properties

### create()

> **create**: () => `Promise`\<`Data`\> \| `Data`

Defined in: [packages/core/src/memory/types.ts:570](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L570)

Function to initialize memory data

#### Returns

`Promise`\<`Data`\> \| `Data`

***

### key

> **key**: `string`

Defined in: [packages/core/src/memory/types.ts:568](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L568)

Unique identifier for this memory
