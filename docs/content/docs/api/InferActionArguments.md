---
title: "InferActionArguments"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferActionArguments

# Type Alias: InferActionArguments\<TSchema\>

> **InferActionArguments**\<`TSchema`\> = `TSchema` *extends* `ZodRawShape` ? `z.infer`\<`ZodObject`\<`TSchema`\>\> : `TSchema` *extends* `z.ZodObject` ? `z.infer`\<`TSchema`\> : `TSchema` *extends* [`Schema`](./Schema.md) ? `TSchema`\[`"_type"`\] : `undefined`

Defined in: [packages/core/src/types.ts:98](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L98)

Infers the argument type from an action schema

## Type Parameters

### TSchema

`TSchema` = `undefined`

The schema type to infer from
