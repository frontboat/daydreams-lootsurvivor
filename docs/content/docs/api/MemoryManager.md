---
title: "MemoryManager"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / MemoryManager

# Interface: MemoryManager\<TContext\>

Defined in: [packages/core/src/memory/types.ts:238](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L238)

Memory manager for handling memory pressure

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

## Properties

### compress()?

> `optional` **compress**: (`ctx`, `entries`, `agent`) => `string` \| `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:255](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L255)

Called to compress/summarize old entries into a compact representation

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### entries

[`AnyRef`](./AnyRef.md)[]

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`string` \| `Promise`\<`string`\>

***

### maxSize?

> `optional` **maxSize**: `number`

Defined in: [packages/core/src/memory/types.ts:262](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L262)

Maximum number of entries before triggering memory management

***

### onMemoryPressure()?

> `optional` **onMemoryPressure**: (`ctx`, `workingMemory`, `agent`) => [`WorkingMemory`](./WorkingMemory.md) \| `Promise`\<[`WorkingMemory`](./WorkingMemory.md)\>

Defined in: [packages/core/src/memory/types.ts:240](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L240)

Called when memory needs pruning due to size constraints

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### workingMemory

[`WorkingMemory`](./WorkingMemory.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

[`WorkingMemory`](./WorkingMemory.md) \| `Promise`\<[`WorkingMemory`](./WorkingMemory.md)\>

***

### preserve?

> `optional` **preserve**: `object`

Defined in: [packages/core/src/memory/types.ts:268](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L268)

Whether to preserve certain types of entries during pruning

#### actionNames?

> `optional` **actionNames**: `string`[]

Always keep action calls with these names

#### custom()?

> `optional` **custom**: (`entry`, `ctx`) => `boolean`

Custom preservation logic

##### Parameters

###### entry

[`AnyRef`](./AnyRef.md)

###### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### Returns

`boolean`

#### recentInputs?

> `optional` **recentInputs**: `number`

Always keep the last N inputs

#### recentOutputs?

> `optional` **recentOutputs**: `number`

Always keep the last N outputs

***

### shouldPrune()?

> `optional` **shouldPrune**: (`ctx`, `workingMemory`, `newEntry`, `agent`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:247](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L247)

Called before adding new entries to determine if pruning is needed

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### workingMemory

[`WorkingMemory`](./WorkingMemory.md)

##### newEntry

[`AnyRef`](./AnyRef.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

***

### strategy?

> `optional` **strategy**: `"fifo"` \| `"lru"` \| `"smart"` \| `"custom"`

Defined in: [packages/core/src/memory/types.ts:265](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L265)

Memory management strategy
