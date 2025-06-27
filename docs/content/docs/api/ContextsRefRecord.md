---
title: "ContextsRefRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsRefRecord

# Type Alias: ContextsRefRecord\<T\>

> **ContextsRefRecord**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1257](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L1257)

Record of context references mapped by key

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`AnyContext`](./AnyContext.md)\>

Record type mapping keys to context types
