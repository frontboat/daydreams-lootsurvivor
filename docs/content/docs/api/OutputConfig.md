---
title: "OutputConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / OutputConfig

# Type Alias: OutputConfig\<Schema, Response, TContext, TAgent\>

> **OutputConfig**\<`Schema`, `Response`, `TContext`, `TAgent`\> = `Omit`\<[`Output`](./Output.md)\<`Schema`, `Response`, `TContext`, `TAgent`\>, `"type"`\>

Defined in: [packages/core/src/types.ts:923](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L923)

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
