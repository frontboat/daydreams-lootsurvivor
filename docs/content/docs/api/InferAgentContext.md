---
title: "InferAgentContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentContext

# Type Alias: InferAgentContext\<TAgent\>

> **InferAgentContext**\<`TAgent`\> = `TAgent` *extends* [`Agent`](./Agent.md)\<infer Content\> ? `Content` : `never`

Defined in: [packages/core/src/types.ts:49](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L49)

Extracts the context type from an Agent type

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract context from
