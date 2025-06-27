---
title: "ContextsEventsRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsEventsRecord

# Type Alias: ContextsEventsRecord\<T\>

> **ContextsEventsRecord**\<`T`\> = `{ [K in keyof T]: T[K]["schema"] }`

Defined in: [packages/core/src/types.ts:1072](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1072)

Maps event definitions to their schema types

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`EventDef`](./EventDef.md)\>

Record of event definitions
