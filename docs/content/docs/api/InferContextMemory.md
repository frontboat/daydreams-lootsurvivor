---
title: "InferContextMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextMemory

# Type Alias: InferContextMemory\<TContext\>

> **InferContextMemory**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<infer TMemory, `any`, `any`, `any`, `any`\> ? `TMemory` : `never`

Defined in: [packages/core/src/types.ts:982](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L982)

Extracts the Memory type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Memory from
