---
title: "LogChunk"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / LogChunk

# Type Alias: LogChunk

> **LogChunk** = \{ `done`: `boolean`; `log`: [`AnyRef`](./AnyRef.md); `type`: `"log"`; \} \| \{ `content`: `string`; `id`: `string`; `type`: `"content"`; \} \| \{ `data`: `any`; `id`: `string`; `type`: `"data"`; \} \| \{ `id`: `string`; `type`: `"done"`; \}

Defined in: [packages/core/src/types.ts:729](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L729)

Represents a chunk of streaming log data
