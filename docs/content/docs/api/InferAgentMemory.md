---
title: "InferAgentMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentMemory

# Type Alias: InferAgentMemory\<TAgent\>

> **InferAgentMemory**\<`TAgent`\> = [`InferContextMemory`](./InferContextMemory.md)\<[`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>\>

Defined in: [packages/core/src/types.ts:59](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L59)

Extracts the memory type from an Agent by inferring its context

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract memory from
