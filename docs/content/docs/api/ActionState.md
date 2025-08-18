---
title: "ActionState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ActionState

# Type Alias: ActionState\<Data\>

> **ActionState**\<`Data`\> = `object`

Defined in: [packages/core/src/memory/types.ts:412](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L412)

Represents a memory configuration for storing data

## Type Parameters

### Data

`Data` = `any`

Type of data stored in memory

## Properties

### create()

> **create**: () => `Promise`\<`Data`\> \| `Data`

Defined in: [packages/core/src/memory/types.ts:416](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L416)

Function to initialize memory data

#### Returns

`Promise`\<`Data`\> \| `Data`

***

### key

> **key**: `string`

Defined in: [packages/core/src/memory/types.ts:414](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L414)

Unique identifier for this memory
