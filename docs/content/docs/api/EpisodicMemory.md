---
title: "EpisodicMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EpisodicMemory

# Interface: EpisodicMemory

Defined in: [packages/core/src/memory/episodic-memory.ts:32](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L32)

Episodic Memory - manages conversational episodes and experiences

## Methods

### clearContext()

> **clearContext**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:61](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L61)

Clear all episodes for a context

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

***

### createFromLogs()

> **createFromLogs**(`contextId`, `logs`, `contextState`, `agent`): `Promise`\<[`Episode`](./Episode.md)\>

Defined in: [packages/core/src/memory/episodic-memory.ts:50](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L50)

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

***

### delete()

> **delete**(`episodeId`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:58](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L58)

Delete episode

#### Parameters

##### episodeId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### findSimilar()

> **findSimilar**(`contextId`, `query`, `limit?`): `Promise`\<[`Episode`](./Episode.md)[]\>

Defined in: [packages/core/src/memory/episodic-memory.ts:37](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L37)

Find episodes similar to a query

#### Parameters

##### contextId

`string`

##### query

`string`

##### limit?

`number`

#### Returns

`Promise`\<[`Episode`](./Episode.md)[]\>

***

### get()

> **get**(`episodeId`): `Promise`\<`null` \| [`Episode`](./Episode.md)\>

Defined in: [packages/core/src/memory/episodic-memory.ts:44](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L44)

Get episode by ID

#### Parameters

##### episodeId

`string`

#### Returns

`Promise`\<`null` \| [`Episode`](./Episode.md)\>

***

### getByContext()

> **getByContext**(`contextId`, `limit?`): `Promise`\<[`Episode`](./Episode.md)[]\>

Defined in: [packages/core/src/memory/episodic-memory.ts:47](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L47)

Get all episodes for a context

#### Parameters

##### contextId

`string`

##### limit?

`number`

#### Returns

`Promise`\<[`Episode`](./Episode.md)[]\>

***

### store()

> **store**(`episode`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/episodic-memory.ts:34](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/episodic-memory.ts#L34)

Store an episode

#### Parameters

##### episode

[`Episode`](./Episode.md)

#### Returns

`Promise`\<`string`\>
