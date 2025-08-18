---
title: "LogChunk"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / LogChunk

# Type Alias: LogChunk

> **LogChunk** = \{ `done`: `boolean`; `log`: [`AnyRef`](./AnyRef.md); `type`: `"log"`; \} \| \{ `content`: `string`; `id`: `string`; `type`: `"content"`; \} \| \{ `data`: `any`; `id`: `string`; `type`: `"data"`; \} \| \{ `id`: `string`; `type`: `"done"`; \}

Defined in: [packages/core/src/types.ts:677](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L677)

Represents a chunk of streaming log data
