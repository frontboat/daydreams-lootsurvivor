---
title: "Optional"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Optional

# Type Alias: Optional\<T, K\>

> **Optional**\<`T`, `K`\> = `Omit`\<`T`, `K`\> & `Partial`\<`Pick`\<`T`, `K`\>\>

Defined in: [packages/core/src/types.ts:27](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L27)

Makes specified keys optional in a type

## Type Parameters

### T

`T`

The type to modify

### K

`K` *extends* keyof `T`

The keys to make optional
