---
title: "InferAgentContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferAgentContext

# Type Alias: InferAgentContext\<TAgent\>

> **InferAgentContext**\<`TAgent`\> = `TAgent` *extends* [`Agent`](./Agent.md)\<infer Content\> ? `Content` : `never`

Defined in: [packages/core/src/types.ts:48](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L48)

Extracts the context type from an Agent type

## Type Parameters

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md)

The agent type to extract context from
