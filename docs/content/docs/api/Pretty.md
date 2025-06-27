---
title: "Pretty"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Pretty

# Type Alias: Pretty\<type\>

> **Pretty**\<`type`\> = `{ [key in keyof type]: type[key] }` & `unknown`

Defined in: [packages/core/src/types.ts:535](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L535)

Utility type to flatten and preserve type information for better TypeScript inference

## Type Parameters

### type

`type`

The type to make pretty
