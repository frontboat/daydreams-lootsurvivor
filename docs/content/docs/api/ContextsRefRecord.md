---
title: "ContextsRefRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsRefRecord

# Type Alias: ContextsRefRecord\<T\>

> **ContextsRefRecord**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1244](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1244)

Record of context references mapped by key

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`AnyContext`](./AnyContext.md)\>

Record type mapping keys to context types
