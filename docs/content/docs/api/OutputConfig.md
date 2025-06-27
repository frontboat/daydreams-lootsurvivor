---
title: "OutputConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / OutputConfig

# Type Alias: OutputConfig\<Schema, Response, TContext, TAgent\>

> **OutputConfig**\<`Schema`, `Response`, `TContext`, `TAgent`\> = `Omit`\<[`Output`](./Output.md)\<`Schema`, `Response`, `TContext`, `TAgent`\>, `"type"`\>

Defined in: [packages/core/src/types.ts:933](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L933)

Configuration type for outputs without type field

## Type Parameters

### Schema

`Schema` *extends* [`OutputSchema`](./OutputSchema.md) = [`OutputSchema`](./OutputSchema.md)

### Response

`Response` *extends* [`OutputRefResponse`](./OutputRefResponse.md) = [`OutputRefResponse`](./OutputRefResponse.md)

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)
