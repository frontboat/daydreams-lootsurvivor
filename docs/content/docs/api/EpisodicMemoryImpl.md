---
title: "EpisodicMemoryImpl"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EpisodicMemoryImpl

# Class: EpisodicMemoryImpl

Defined in: [packages/core/src/memory/episodic-memory.ts:64](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L64)

Episodic Memory - manages conversational episodes and experiences

## Implements

- [`EpisodicMemory`](./EpisodicMemory.md)

## Constructors

### Constructor

> **new EpisodicMemoryImpl**(`memory`, `options`): `EpisodicMemoryImpl`

Defined in: [packages/core/src/memory/episodic-memory.ts:68](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L68)

#### Parameters

##### memory

[`Memory`](./Memory.md)

##### options

`EpisodicMemoryOptions` = `{}`

#### Returns

`EpisodicMemoryImpl`

## Methods

### addToCurrentEpisode()

> **addToCurrentEpisode**(`contextId`, `ref`): `void`

Defined in: [packages/core/src/memory/episodic-memory.ts:319](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L319)

Add log to current episode

#### Parameters

##### contextId

`string`

##### ref

[`AnyRef`](./AnyRef.md)

#### Returns

`void`

***

### clearContext()

> **clearContext**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:252](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L252)

Clear all episodes for a context

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`clearContext`](EpisodicMemory.md#clearcontext)

***

### createFromLogs()

> **createFromLogs**(`contextId`, `logs`, `contextState`, `agent`): `Promise`\<[`Episode`](./Episode.md)\>

Defined in: [packages/core/src/memory/episodic-memory.ts:173](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L173)

Create episode from logs

#### Parameters

##### contextId

`string`

##### logs

[`AnyRef`](./AnyRef.md)[]

##### contextState

[`ContextState`](./ContextState.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<[`Episode`](./Episode.md)\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`createFromLogs`](EpisodicMemory.md#createfromlogs)

***

### delete()

> **delete**(`episodeId`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:231](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L231)

Delete episode

#### Parameters

##### episodeId

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`delete`](EpisodicMemory.md#delete)

***

### finalizeCurrentEpisode()

> **finalizeCurrentEpisode**(`contextId`, `contextState`, `agent`): `Promise`\<`null` \| [`Episode`](./Episode.md)\>

Defined in: [packages/core/src/memory/episodic-memory.ts:329](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L329)

Finalize current episode

#### Parameters

##### contextId

`string`

##### contextState

[`ContextState`](./ContextState.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`null` \| [`Episode`](./Episode.md)\>

***

### findSimilar()

> **findSimilar**(`contextId`, `query`, `limit`): `Promise`\<[`Episode`](./Episode.md)[]\>

Defined in: [packages/core/src/memory/episodic-memory.ts:120](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L120)

Find episodes similar to a query

#### Parameters

##### contextId

`string`

##### query

`string`

##### limit

`number` = `5`

#### Returns

`Promise`\<[`Episode`](./Episode.md)[]\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`findSimilar`](EpisodicMemory.md#findsimilar)

***

### get()

> **get**(`episodeId`): `Promise`\<`null` \| [`Episode`](./Episode.md)\>

Defined in: [packages/core/src/memory/episodic-memory.ts:146](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L146)

Get episode by ID

#### Parameters

##### episodeId

`string`

#### Returns

`Promise`\<`null` \| [`Episode`](./Episode.md)\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`get`](EpisodicMemory.md#get)

***

### getByContext()

> **getByContext**(`contextId`, `limit`): `Promise`\<[`Episode`](./Episode.md)[]\>

Defined in: [packages/core/src/memory/episodic-memory.ts:151](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L151)

Get all episodes for a context

#### Parameters

##### contextId

`string`

##### limit

`number` = `20`

#### Returns

`Promise`\<[`Episode`](./Episode.md)[]\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`getByContext`](EpisodicMemory.md#getbycontext)

***

### shouldEndEpisode()

> **shouldEndEpisode**(`ref`, `contextId`, `contextState`, `agent`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:293](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L293)

Check if the current episode should be ended

#### Parameters

##### ref

[`AnyRef`](./AnyRef.md)

##### contextId

`string`

##### contextState

[`ContextState`](./ContextState.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`boolean`\>

***

### shouldStartEpisode()

> **shouldStartEpisode**(`ref`, `contextId`, `contextState`, `agent`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:267](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L267)

Check if a new episode should be started

#### Parameters

##### ref

[`AnyRef`](./AnyRef.md)

##### contextId

`string`

##### contextState

[`ContextState`](./ContextState.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`boolean`\>

***

### store()

> **store**(`episode`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:73](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L73)

Store an episode

#### Parameters

##### episode

[`Episode`](./Episode.md)

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`EpisodicMemory`](./EpisodicMemory.md).[`store`](EpisodicMemory.md#store)
