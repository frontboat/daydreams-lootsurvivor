---
title: "KeyValueProvider"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / KeyValueProvider

# Interface: KeyValueProvider

Defined in: [packages/core/src/memory/types.ts:84](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L84)

Key-Value storage provider

## Extends

- [`MemoryProvider`](./MemoryProvider.md)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:71](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L71)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`MemoryProvider`](./MemoryProvider.md).[`close`](MemoryProvider.md#close)

***

### count()

> **count**(`pattern?`): `Promise`\<`number`\>

Defined in: [packages/core/src/memory/types.ts:90](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L90)

#### Parameters

##### pattern?

`string`

#### Returns

`Promise`\<`number`\>

***

### delete()

> **delete**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:87](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L87)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### deleteBatch()

> **deleteBatch**(`keys`): `Promise`\<`number`\>

Defined in: [packages/core/src/memory/types.ts:96](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L96)

#### Parameters

##### keys

`string`[]

#### Returns

`Promise`\<`number`\>

***

### exists()

> **exists**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:88](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L88)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [packages/core/src/memory/types.ts:85](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L85)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| `T`\>

***

### getBatch()

> **getBatch**\<`T`\>(`keys`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/core/src/memory/types.ts:94](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L94)

#### Type Parameters

##### T

`T`

#### Parameters

##### keys

`string`[]

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

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

### keys()

> **keys**(`pattern?`): `Promise`\<`string`[]\>

Defined in: [packages/core/src/memory/types.ts:89](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L89)

#### Parameters

##### pattern?

`string`

#### Returns

`Promise`\<`string`[]\>

***

### scan()

> **scan**(`pattern?`): `AsyncIterator`\<\[`string`, `unknown`\]\>

Defined in: [packages/core/src/memory/types.ts:91](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L91)

#### Parameters

##### pattern?

`string`

#### Returns

`AsyncIterator`\<\[`string`, `unknown`\]\>

***

### set()

> **set**\<`T`\>(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:86](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L86)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### value

`T`

##### options?

[`SetOptions`](./SetOptions.md)

#### Returns

`Promise`\<`void`\>

***

### setBatch()

> **setBatch**\<`T`\>(`entries`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:95](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L95)

#### Type Parameters

##### T

`T`

#### Parameters

##### entries

`Map`\<`string`, `T`\>

##### options?

[`SetOptions`](./SetOptions.md)

#### Returns

`Promise`\<`void`\>
