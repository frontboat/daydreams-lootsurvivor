---
title: "InferSchema"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferSchema

# Type Alias: InferSchema\<T\>

> **InferSchema**\<`T`\> = `T` *extends* `object` ? `z.infer`\<`S`\> : `unknown`

Defined in: [packages/core/src/types.ts:38](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L38)

Infers the schema type from an object with an optional schema property

## Type Parameters

### T

`T`

The object type that may have a schema
