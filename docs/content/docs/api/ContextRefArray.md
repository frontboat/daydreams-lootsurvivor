---
title: "ContextRefArray"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextRefArray

# Type Alias: ContextRefArray\<T\>

> **ContextRefArray**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1265](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L1265)

Array of context references

## Type Parameters

### T

`T` *extends* [`AnyContext`](./AnyContext.md)[] = [`AnyContext`](./AnyContext.md)[]

Array of context types
