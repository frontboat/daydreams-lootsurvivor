---
title: "InferSchemaArguments"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferSchemaArguments

# Type Alias: InferSchemaArguments\<Schema\>

> **InferSchemaArguments**\<`Schema`\> = `Schema` *extends* `ZodRawShape` ? `z.infer`\<`ZodObject`\<`Schema`\>\> : `Schema` *extends* `z.ZodTypeAny` ? `z.infer`\<`Schema`\> : `never`

Defined in: [packages/core/src/types.ts:991](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L991)

Infers the argument type from a schema definition

## Type Parameters

### Schema

`Schema` = `undefined`

The schema to infer arguments from
