---
title: "InferAgentContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentContext

# Type Alias: InferAgentContext\<TAgent\>

> **InferAgentContext**\<`TAgent`\> = `TAgent` *extends* [`Agent`](./Agent.md)\<infer Content\> ? `Content` : `never`

Defined in: [packages/core/src/types.ts:49](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L49)

Extracts the context type from an Agent type

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract context from
