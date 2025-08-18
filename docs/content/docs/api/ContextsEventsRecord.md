---
title: "ContextsEventsRecord"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextsEventsRecord

# Type Alias: ContextsEventsRecord\<T\>

> **ContextsEventsRecord**\<`T`\> = `{ [K in keyof T]: T[K]["schema"] }`

Defined in: [packages/core/src/types.ts:1059](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1059)

Maps event definitions to their schema types

## Type Parameters

### T

`T` *extends* `Record`\<`string`, [`EventDef`](./EventDef.md)\>

Record of event definitions
