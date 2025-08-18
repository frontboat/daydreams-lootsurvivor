---
title: "GraphMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / GraphMemory

# Interface: GraphMemory

Defined in: [packages/core/src/memory/types.ts:283](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L283)

Graph Memory - stores entity relationships

## Methods

### addEntity()

> **addEntity**(`entity`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:284](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L284)

#### Parameters

##### entity

[`Entity`](./Entity.md)

#### Returns

`Promise`\<`string`\>

***

### addRelationship()

> **addRelationship**(`relationship`): `Promise`\<`string`\>

Defined in: [packages/core/src/memory/types.ts:285](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L285)

#### Parameters

##### relationship

[`Relationship`](./Relationship.md)

#### Returns

`Promise`\<`string`\>

***

### findPath()

> **findPath**(`from`, `to`): `Promise`\<[`Entity`](./Entity.md)[]\>

Defined in: [packages/core/src/memory/types.ts:288](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L288)

#### Parameters

##### from

`string`

##### to

`string`

#### Returns

`Promise`\<[`Entity`](./Entity.md)[]\>

***

### findRelated()

> **findRelated**(`entityId`, `relationshipType?`): `Promise`\<[`Entity`](./Entity.md)[]\>

Defined in: [packages/core/src/memory/types.ts:287](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L287)

#### Parameters

##### entityId

`string`

##### relationshipType?

`string`

#### Returns

`Promise`\<[`Entity`](./Entity.md)[]\>

***

### getEntity()

> **getEntity**(`id`): `Promise`\<`null` \| [`Entity`](./Entity.md)\>

Defined in: [packages/core/src/memory/types.ts:286](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L286)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`null` \| [`Entity`](./Entity.md)\>

***

### removeEntity()

> **removeEntity**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:290](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L290)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### updateEntity()

> **updateEntity**(`id`, `updates`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:289](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L289)

#### Parameters

##### id

`string`

##### updates

`Partial`\<[`Entity`](./Entity.md)\>

#### Returns

`Promise`\<`void`\>
