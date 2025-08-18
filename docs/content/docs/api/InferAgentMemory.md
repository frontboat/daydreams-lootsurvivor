---
title: "InferAgentMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentMemory

# Type Alias: InferAgentMemory\<TAgent\>

> **InferAgentMemory**\<`TAgent`\> = [`InferContextMemory`](./InferContextMemory.md)\<[`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>\>

Defined in: [packages/core/src/types.ts:58](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L58)

Extracts the memory type from an Agent by inferring its context

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract memory from
