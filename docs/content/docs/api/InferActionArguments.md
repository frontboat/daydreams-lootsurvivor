---
title: "InferActionArguments"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferActionArguments

# Type Alias: InferActionArguments\<TSchema\>

> **InferActionArguments**\<`TSchema`\> = `TSchema` *extends* `ZodRawShape` ? `z.infer`\<`ZodObject`\<`TSchema`\>\> : `TSchema` *extends* `z.ZodObject` ? `z.infer`\<`TSchema`\> : `TSchema` *extends* [`Schema`](./Schema.md) ? `TSchema`\[`"_type"`\] : `undefined`

Defined in: [packages/core/src/types.ts:98](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L98)

Infers the argument type from an action schema

## Type Parameters

### TSchema

`TSchema` = `undefined`

The schema type to infer from
