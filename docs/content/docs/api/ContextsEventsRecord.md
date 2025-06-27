---
title: "ContextsEventsRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsEventsRecord

# Type Alias: ContextsEventsRecord\<T\>

> **ContextsEventsRecord**\<`T`\> = `{ [K in keyof T]: T[K]["schema"] }`

Defined in: [packages/core/src/types.ts:1072](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L1072)

Maps event definitions to their schema types

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`EventDef`](./EventDef.md)\>

Record of event definitions
