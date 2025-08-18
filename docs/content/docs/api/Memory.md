---
title: "Memory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Memory

# Interface: Memory

Defined in: [packages/core/src/memory/types.ts:25](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L25)

Core Memory interface - simplified for basic storage

## Properties

### episodes?

> `optional` **episodes**: [`EpisodicMemory`](./EpisodicMemory.md)

Defined in: [packages/core/src/memory/types.ts:31](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L31)

***

### graph

> **graph**: [`GraphMemory`](./GraphMemory.md)

Defined in: [packages/core/src/memory/types.ts:30](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L30)

***

### kv

> **kv**: [`KeyValueMemory`](./KeyValueMemory.md)

Defined in: [packages/core/src/memory/types.ts:28](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L28)

***

### vector

> **vector**: [`VectorMemory`](./VectorMemory.md)

Defined in: [packages/core/src/memory/types.ts:29](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L29)

***

### working

> **working**: [`IWorkingMemory`](./IWorkingMemory.md)

Defined in: [packages/core/src/memory/types.ts:27](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L27)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:40](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L40)

#### Returns

`Promise`\<`void`\>

***

### forget()

> **forget**(`criteria`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:36](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L36)

#### Parameters

##### criteria

[`ForgetCriteria`](./ForgetCriteria.md)

#### Returns

`Promise`\<`void`\>

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:39](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L39)

#### Returns

`Promise`\<`void`\>

***

### recall()

> **recall**(`query`, `options?`): `Promise`\<[`MemoryResult`](./MemoryResult.md)[]\>

Defined in: [packages/core/src/memory/types.ts:35](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L35)

#### Parameters

##### query

`string`

##### options?

[`RecallOptions`](./RecallOptions.md)

#### Returns

`Promise`\<[`MemoryResult`](./MemoryResult.md)[]\>

***

### remember()

> **remember**(`content`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:34](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L34)

#### Parameters

##### content

`unknown`

##### options?

[`RememberOptions`](./RememberOptions.md)

#### Returns

`Promise`\<`void`\>
