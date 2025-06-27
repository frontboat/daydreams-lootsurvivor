---
title: "InferAgentMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentMemory

# Type Alias: InferAgentMemory\<TAgent\>

> **InferAgentMemory**\<`TAgent`\> = [`InferContextMemory`](./InferContextMemory.md)\<[`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>\>

Defined in: [packages/core/src/types.ts:59](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L59)

Extracts the memory type from an Agent by inferring its context

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract memory from
