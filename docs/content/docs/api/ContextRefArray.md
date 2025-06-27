---
title: "ContextRefArray"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextRefArray

# Type Alias: ContextRefArray\<T\>

> **ContextRefArray**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1265](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1265)

Array of context references

## Type Parameters

### T

`T` *extends* [`AnyContext`](./AnyContext.md)[] = [`AnyContext`](./AnyContext.md)[]

Array of context types
