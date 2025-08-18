---
title: "GraphProvider"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / GraphProvider

# Interface: GraphProvider

Defined in: [packages/core/src/memory/types.ts:145](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L145)

Graph storage provider

## Extends

- [`MemoryProvider`](./MemoryProvider.md)

## Methods

### addEdge()

> **addEdge**(`edge`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:153](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L153)

#### Parameters

##### edge

[`GraphEdge`](./GraphEdge.md)

#### Returns

`Promise`\<`string`\>

***

### addNode()

> **addNode**(`node`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:147](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L147)

#### Parameters

##### node

[`GraphNode`](./GraphNode.md)

#### Returns

`Promise`\<`string`\>

***

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:71](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L71)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`close`](MemoryProvider.md#close)

***

### deleteEdge()

> **deleteEdge**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:158](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L158)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### deleteNode()

> **deleteNode**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:150](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L150)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### findNodes()

> **findNodes**(`filter`): `Promise`\<[`GraphNode`](./GraphNode.md)[]\>

Defined in: [packages/core/src/memory/types.ts:161](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L161)

#### Parameters

##### filter

[`GraphFilter`](./GraphFilter.md)

#### Returns

`Promise`\<[`GraphNode`](./GraphNode.md)[]\>

***

### getEdges()

> **getEdges**(`nodeId`, `direction?`): `Promise`\<[`GraphEdge`](./GraphEdge.md)[]\>

Defined in: [packages/core/src/memory/types.ts:154](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L154)

#### Parameters

##### nodeId

`string`

##### direction?

`"out"` | `"in"` | `"both"`

#### Returns

`Promise`\<[`GraphEdge`](./GraphEdge.md)[]\>

***

### getNode()

> **getNode**(`id`): `Promise`\<`null` \| [`GraphNode`](./GraphNode.md)\>

Defined in: [packages/core/src/memory/types.ts:148](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L148)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`null` \| [`GraphNode`](./GraphNode.md)\>

***

### health()

> **health**(): `Promise`\<[`HealthStatus`](./HealthStatus.md)\>

Defined in: [packages/core/src/memory/types.ts:72](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L72)

#### Returns

`Promise`\<[`HealthStatus`](./HealthStatus.md)\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`health`](MemoryProvider.md#health)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:70](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L70)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`initialize`](MemoryProvider.md#initialize)

***

### shortestPath()

> **shortestPath**(`from`, `to`): `Promise`\<`null` \| [`GraphPath`](./GraphPath.md)\>

Defined in: [packages/core/src/memory/types.ts:163](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L163)

#### Parameters

##### from

`string`

##### to

`string`

#### Returns

`Promise`\<`null` \| [`GraphPath`](./GraphPath.md)\>

***

### traverse()

> **traverse**(`traversal`): `Promise`\<[`GraphPath`](./GraphPath.md)[]\>

Defined in: [packages/core/src/memory/types.ts:162](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L162)

#### Parameters

##### traversal

[`GraphTraversal`](./GraphTraversal.md)

#### Returns

`Promise`\<[`GraphPath`](./GraphPath.md)[]\>

***

### updateNode()

> **updateNode**(`id`, `updates`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:149](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L149)

#### Parameters

##### id

`string`

##### updates

`Partial`\<[`GraphNode`](./GraphNode.md)\>

#### Returns

`Promise`\<`void`\>
