---
title: "Optional"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Optional

# Type Alias: Optional\<T, K\>

> **Optional**\<`T`, `K`\> = `Omit`\<`T`, `K`\> & `Partial`\<`Pick`\<`T`, `K`\>\>

Defined in: [packages/core/src/types.ts:26](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L26)

Makes specified keys optional in a type

## Type Parameters

### T

`T`

The type to modify

### K

`K` *extends* keyof `T`

The keys to make optional
