---
title: "ContextRefArray"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextRefArray

# Type Alias: ContextRefArray\<T\>

> **ContextRefArray**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1252](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1252)

Array of context references

## Type Parameters

### T

`T` *extends* [`AnyContext`](./AnyContext.md)[] = [`AnyContext`](./AnyContext.md)[]

Array of context types
