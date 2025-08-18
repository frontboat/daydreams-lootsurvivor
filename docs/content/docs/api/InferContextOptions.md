---
title: "InferContextOptions"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextOptions

# Type Alias: InferContextOptions\<TContext\>

> **InferContextOptions**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<`any`, `any`, infer Options, `any`, `any`\> ? `Options` : `never`

Defined in: [packages/core/src/types.ts:976](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L976)

Extracts the Context type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Ctx from
