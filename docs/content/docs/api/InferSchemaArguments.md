---
title: "InferSchemaArguments"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / InferSchemaArguments

# Type Alias: InferSchemaArguments\<Schema\>

> **InferSchemaArguments**\<`Schema`\> = `Schema` *extends* `ZodRawShape` ? `z.infer`\<`ZodObject`\<`Schema`\>\> : `Schema` *extends* `z.ZodTypeAny` ? `z.infer`\<`Schema`\> : `never`

Defined in: [packages/core/src/types.ts:1004](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1004)

Infers the argument type from a schema definition

## Type Parameters

### Schema

`Schema` = `undefined`

The schema to infer arguments from
