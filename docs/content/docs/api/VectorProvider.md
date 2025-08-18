---
title: "VectorProvider"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / VectorProvider

# Interface: VectorProvider

Defined in: [packages/core/src/memory/types.ts:108](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L108)

Vector storage provider

## Extends

- [`MemoryProvider`](./MemoryProvider.md)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:71](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L71)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`close`](MemoryProvider.md#close)

***

### count()

> **count**(`namespace?`): `Promise`\<`number`\>

Defined in: [packages/core/src/memory/types.ts:113](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L113)

#### Parameters

##### namespace?

`string`

#### Returns

`Promise`\<`number`\>

***

### delete()

> **delete**(`ids`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:111](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L111)

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### health()

> **health**(): `Promise`\<[`HealthStatus`](./HealthStatus.md)\>

Defined in: [packages/core/src/memory/types.ts:72](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L72)

#### Returns

`Promise`\<[`HealthStatus`](./HealthStatus.md)\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`health`](MemoryProvider.md#health)

***

### index()

> **index**(`documents`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:109](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L109)

#### Parameters

##### documents

[`VectorDocument`](./VectorDocument.md)[]

#### Returns

`Promise`\<`void`\>

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:70](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L70)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`initialize`](MemoryProvider.md#initialize)

***

### search()

> **search**(`query`): `Promise`\<[`VectorResult`](./VectorResult.md)[]\>

Defined in: [packages/core/src/memory/types.ts:110](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L110)

#### Parameters

##### query

[`VectorQuery`](./VectorQuery.md)

#### Returns

`Promise`\<[`VectorResult`](./VectorResult.md)[]\>

***

### update()

> **update**(`id`, `updates`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:112](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L112)

#### Parameters

##### id

`string`

##### updates

`Partial`\<[`VectorDocument`](./VectorDocument.md)\>

#### Returns

`Promise`\<`void`\>
