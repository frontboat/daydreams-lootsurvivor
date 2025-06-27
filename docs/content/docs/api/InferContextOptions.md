---
title: "InferContextOptions"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferContextOptions

# Type Alias: InferContextOptions\<TContext\>

> **InferContextOptions**\<`TContext`\> = `TContext` *extends* [`Context`](./Context.md)\<`any`, `any`, infer Options, `any`, `any`\> ? `Options` : `never`

Defined in: [packages/core/src/types.ts:989](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L989)

Extracts the Context type from a Context type

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The Context type to extract Ctx from
