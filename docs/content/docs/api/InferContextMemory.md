---
title: "InferContextMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextMemory

# Type Alias: InferContextMemory\<TContext\>

> **InferContextMemory**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<infer TMemory, `any`, `any`, `any`, `any`\> ? `TMemory` : `never`

Defined in: [packages/core/src/types.ts:969](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L969)

Extracts the Memory type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Memory from
