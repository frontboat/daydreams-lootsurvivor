---
title: "Optional"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Optional

# Type Alias: Optional\<T, K\>

> **Optional**\<`T`, `K`\> = `Omit`\<`T`, `K`\> & `Partial`\<`Pick`\<`T`, `K`\>\>

Defined in: [packages/core/src/types.ts:27](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L27)

Makes specified keys optional in a type

## Type Parameters

### T

`T`

The type to modify

### K

`K` *extends* keyof `T`

The keys to make optional
