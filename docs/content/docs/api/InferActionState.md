---
title: "InferActionState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferActionState

# Type Alias: InferActionState\<TMemory\>

> **InferActionState**\<`TMemory`\> = `TMemory` *extends* [`ActionState`](./ActionState.md)\<infer Data\> ? `Data` : `never`

Defined in: [packages/core/src/memory/types.ts:577](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/memory/types.ts#L577)

Extracts the data type from a Memory type

## Type Parameters

### TMemory

`TMemory` *extends* [`ActionState`](./ActionState.md)\<`any`\>

Memory type to extract data from
