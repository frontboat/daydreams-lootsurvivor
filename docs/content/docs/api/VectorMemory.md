---
title: "VectorMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / VectorMemory

# Interface: VectorMemory

Defined in: [packages/core/src/memory/types.ts:352](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L352)

Vector Memory interface

## Methods

### delete()

> **delete**(`ids`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:355](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L355)

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### index()

> **index**(`documents`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:353](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L353)

#### Parameters

##### documents

[`VectorDocument`](./VectorDocument.md)[]

#### Returns

`Promise`\<`void`\>

***

### search()

> **search**(`query`): `Promise`\<[`VectorResult`](./VectorResult.md)[]\>

Defined in: [packages/core/src/memory/types.ts:354](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L354)

#### Parameters

##### query

[`VectorQuery`](./VectorQuery.md)

#### Returns

`Promise`\<[`VectorResult`](./VectorResult.md)[]\>
