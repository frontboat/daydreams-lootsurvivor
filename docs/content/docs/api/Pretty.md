---
title: "Pretty"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Pretty

# Type Alias: Pretty\<type\>

> **Pretty**\<`type`\> = `{ [key in keyof type]: type[key] }` & `unknown`

Defined in: [packages/core/src/types.ts:535](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L535)

Utility type to flatten and preserve type information for better TypeScript inference

## Type Parameters

### type

`type`

The type to make pretty
