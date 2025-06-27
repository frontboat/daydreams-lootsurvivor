---
title: "InferContextMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextMemory

# Type Alias: InferContextMemory\<TContext\>

> **InferContextMemory**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<infer TMemory, `any`, `any`, `any`, `any`\> ? `TMemory` : `never`

Defined in: [packages/core/src/types.ts:982](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L982)

Extracts the Memory type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Memory from
