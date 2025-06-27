---
title: "InferContextOptions"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextOptions

# Type Alias: InferContextOptions\<TContext\>

> **InferContextOptions**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<`any`, `any`, infer Options, `any`, `any`\> ? `Options` : `never`

Defined in: [packages/core/src/types.ts:989](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L989)

Extracts the Context type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Ctx from
