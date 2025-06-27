---
title: "ContextsRefRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsRefRecord

# Type Alias: ContextsRefRecord\<T\>

> **ContextsRefRecord**\<`T`\> = `{ [K in keyof T]: ContextRef<T[K]> }`

Defined in: [packages/core/src/types.ts:1257](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1257)

Record of context references mapped by key

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`AnyContext`](./AnyContext.md)\>

Record type mapping keys to context types
