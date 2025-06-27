---
title: "MemoryConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / MemoryConfig

# Interface: MemoryConfig

Defined in: [packages/core/src/memory/types.ts:51](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L51)

Memory system configuration

## Properties

### middleware?

> `optional` **middleware**: [`MemoryMiddleware`](./MemoryMiddleware.md)[]

Defined in: [packages/core/src/memory/types.ts:57](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L57)

***

### options?

> `optional` **options**: [`MemoryOptions`](./MemoryOptions.md)

Defined in: [packages/core/src/memory/types.ts:58](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L58)

***

### providers

> **providers**: `object`

Defined in: [packages/core/src/memory/types.ts:52](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L52)

#### graph

> **graph**: [`GraphProvider`](./GraphProvider.md)

#### kv

> **kv**: [`KeyValueProvider`](./KeyValueProvider.md)

#### vector

> **vector**: [`VectorProvider`](./VectorProvider.md)
