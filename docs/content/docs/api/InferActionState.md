---
title: "InferActionState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferActionState

# Type Alias: InferActionState\<TMemory\>

> **InferActionState**\<`TMemory`\> = `TMemory` *extends* [`ActionState`](./ActionState.md)\<infer Data\> ? `Data` : `never`

Defined in: [packages/core/src/memory/types.ts:577](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L577)

Extracts the data type from a Memory type

## Type Parameters

### TMemory

`TMemory` *extends* [`ActionState`](./ActionState.md)\<`any`\>

Memory type to extract data from
