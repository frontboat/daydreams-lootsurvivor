---
title: "IWorkingMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / IWorkingMemory

# Interface: IWorkingMemory

Defined in: [packages/core/src/memory/types.ts:213](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L213)

Working Memory - manages current session state

## Methods

### clear()

> **clear**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:224](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L224)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

***

### create()

> **create**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/types.ts:214](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L214)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

***

### get()

> **get**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/types.ts:215](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L215)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

***

### push()

> **push**\<`TContext`\>(`contextId`, `entry`, `ctx`, `agent`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:217](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L217)

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

***

### set()

> **set**(`contextId`, `data`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:216](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L216)

#### Parameters

##### contextId

`string`

##### data

[`WorkingMemoryData`](./WorkingMemoryData.md)

#### Returns

`Promise`\<`void`\>

***

### summarize()

> **summarize**(`contextId`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:225](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/memory/types.ts#L225)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`string`\>
