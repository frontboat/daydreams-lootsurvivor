---
title: "InputConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InputConfig

# Type Alias: InputConfig\<Schema, TContext, TAgent\>

> **InputConfig**\<`Schema`, `TContext`, `TAgent`\> = `Omit`\<[`Input`](./Input.md)\<`Schema`, `TContext`, `TAgent`\>, `"type"`\>

Defined in: [packages/core/src/types.ts:923](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L923)

Configuration type for inputs without type field

## Type Parameters

### Schema

`Schema` *extends* `z.ZodObject` \| `z.ZodString` \| `z.ZodRawShape` = `z.ZodObject` \| `z.ZodString` \| `z.ZodRawShape`

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)
