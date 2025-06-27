---
title: "WorkingMemoryImpl"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / WorkingMemoryImpl

# Class: WorkingMemoryImpl

Defined in: [packages/core/src/memory/working-memory.ts:10](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L10)

Working Memory - manages current session state

## Implements

- [`IWorkingMemory`](./IWorkingMemory.md)

## Constructors

### Constructor

> **new WorkingMemoryImpl**(`memory`): `WorkingMemoryImpl`

Defined in: [packages/core/src/memory/working-memory.ts:11](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L11)

#### Parameters

##### memory

[`Memory`](./Memory.md)

#### Returns

`WorkingMemoryImpl`

## Methods

### clear()

> **clear**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/working-memory.ts:111](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L111)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`clear`](IWorkingMemory.md#clear)

***

### create()

> **create**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/working-memory.ts:13](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L13)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`create`](IWorkingMemory.md#create)

***

### get()

> **get**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/working-memory.ts:29](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L29)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`get`](IWorkingMemory.md#get)

***

### push()

> **push**\<`TContext`\>(`contextId`, `entry`, `ctx`, `agent`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/working-memory.ts:46](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L46)

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

#### Parameters

##### contextId

`string`

##### entry

[`AnyRef`](./AnyRef.md)

##### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### agent

[`AnyAgent`](./AnyAgent.md)

##### options?

[`PushOptions`](./PushOptions.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`push`](IWorkingMemory.md#push)

***

### set()

> **set**(`contextId`, `data`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/working-memory.ts:42](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L42)

#### Parameters

##### contextId

`string`

##### data

[`WorkingMemoryData`](./WorkingMemoryData.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`set`](IWorkingMemory.md#set)

***

### summarize()

> **summarize**(`contextId`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/working-memory.ts:115](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/working-memory.ts#L115)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`IWorkingMemory`](./IWorkingMemory.md).[`summarize`](IWorkingMemory.md#summarize)
