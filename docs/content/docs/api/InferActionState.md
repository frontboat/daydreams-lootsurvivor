---
title: "InferActionState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferActionState

# Type Alias: InferActionState\<TMemory\>

> **InferActionState**\<`TMemory`\> = `TMemory` *extends* [`ActionState`](./ActionState.md)\<infer Data\> ? `Data` : `never`

Defined in: [packages/core/src/memory/types.ts:423](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L423)

Extracts the data type from a Memory type

## Type Parameters

### TMemory

`TMemory` *extends* [`ActionState`](./ActionState.md)\<`any`\>

Memory type to extract data from
