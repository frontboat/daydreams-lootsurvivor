---
title: "MemorySystem"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / MemorySystem

# Class: MemorySystem

Defined in: [packages/core/src/memory/memory-system.ts:24](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L24)

Simplified Memory System - basic storage only

## Implements

- [`Memory`](./Memory.md)

## Constructors

### Constructor

> **new MemorySystem**(`config`): `MemorySystem`

Defined in: [packages/core/src/memory/memory-system.ts:35](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L35)

#### Parameters

##### config

[`MemoryConfig`](./MemoryConfig.md)

#### Returns

`MemorySystem`

## Properties

### episodes

> **episodes**: [`EpisodicMemory`](./EpisodicMemory.md)

Defined in: [packages/core/src/memory/memory-system.ts:29](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L29)

#### Implementation of

[`Memory`](./Memory.md).[`episodes`](Memory.md#episodes)

***

### graph

> **graph**: [`GraphMemory`](./GraphMemory.md)

Defined in: [packages/core/src/memory/memory-system.ts:28](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L28)

#### Implementation of

[`Memory`](./Memory.md).[`graph`](Memory.md#graph)

***

### kv

> **kv**: [`KeyValueMemory`](./KeyValueMemory.md)

Defined in: [packages/core/src/memory/memory-system.ts:26](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L26)

#### Implementation of

[`Memory`](./Memory.md).[`kv`](Memory.md#kv)

***

### vector

> **vector**: [`VectorMemory`](./VectorMemory.md)

Defined in: [packages/core/src/memory/memory-system.ts:27](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L27)

#### Implementation of

[`Memory`](./Memory.md).[`vector`](Memory.md#vector)

***

### working

> **working**: [`IWorkingMemory`](./IWorkingMemory.md)

Defined in: [packages/core/src/memory/memory-system.ts:25](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L25)

#### Implementation of

[`Memory`](./Memory.md).[`working`](Memory.md#working)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/memory-system.ts:76](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L76)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Memory`](./Memory.md).[`close`](Memory.md#close)

***

### forget()

> **forget**(`criteria`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/memory-system.ts:138](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L138)

#### Parameters

##### criteria

[`ForgetCriteria`](./ForgetCriteria.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Memory`](./Memory.md).[`forget`](Memory.md#forget)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/memory-system.ts:49](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L49)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Memory`](./Memory.md).[`initialize`](Memory.md#initialize)

***

### recall()

> **recall**(`query`, `options?`): `Promise`\<[`MemoryResult`](./MemoryResult.md)[]\>

Defined in: [packages/core/src/memory/memory-system.ts:113](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L113)

#### Parameters

##### query

`string`

##### options?

[`RecallOptions`](./RecallOptions.md)

#### Returns

`Promise`\<[`MemoryResult`](./MemoryResult.md)[]\>

#### Implementation of

[`Memory`](./Memory.md).[`recall`](Memory.md#recall)

***

### remember()

> **remember**(`content`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/memory-system.ts:89](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/memory-system.ts#L89)

#### Parameters

##### content

`unknown`

##### options?

[`RememberOptions`](./RememberOptions.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Memory`](./Memory.md).[`remember`](Memory.md#remember)
