---
title: "Pretty"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Pretty

# Type Alias: Pretty\<type\>

> **Pretty**\<`type`\> = `{ [key in keyof type]: type[key] }` & `unknown`

Defined in: [packages/core/src/types.ts:504](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L504)

Utility type to flatten and preserve type information for better TypeScript inference

## Type Parameters

### type

`type`

The type to make pretty
