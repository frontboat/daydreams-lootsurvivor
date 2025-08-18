---
title: "IWorkingMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / IWorkingMemory

# Interface: IWorkingMemory

Defined in: [packages/core/src/memory/types.ts:203](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L203)

Working Memory - manages current session state

## Methods

### clear()

> **clear**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:214](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L214)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

***

### create()

> **create**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/types.ts:204](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L204)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

***

### get()

> **get**(`contextId`): `Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

Defined in: [packages/core/src/memory/types.ts:205](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L205)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<[`WorkingMemoryData`](./WorkingMemoryData.md)\>

***

### push()

> **push**\<`TContext`\>(`contextId`, `entry`, `ctx`, `agent`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:207](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L207)

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

Defined in: [packages/core/src/memory/types.ts:206](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L206)

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

Defined in: [packages/core/src/memory/types.ts:215](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L215)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`string`\>
