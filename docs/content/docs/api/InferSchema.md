---
title: "InferSchema"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferSchema

# Type Alias: InferSchema\<T\>

> **InferSchema**\<`T`\> = `T` *extends* `object` ? `z.infer`\<`S`\> : `unknown`

Defined in: [packages/core/src/types.ts:39](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L39)

Infers the schema type from an object with an optional schema property

## Type Parameters

### T

`T`

The object type that may have a schema
