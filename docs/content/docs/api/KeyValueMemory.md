---
title: "KeyValueMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / KeyValueMemory

# Interface: KeyValueMemory

Defined in: [packages/core/src/memory/types.ts:334](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L334)

Key-Value Memory interface

## Methods

### count()

> **count**(`pattern?`): `Promise`\<`number`\>

Defined in: [packages/core/src/memory/types.ts:340](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L340)

#### Parameters

##### pattern?

`string`

#### Returns

`Promise`\<`number`\>

***

### delete()

> **delete**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:337](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L337)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### deleteBatch()

> **deleteBatch**(`keys`): `Promise`\<`number`\>

Defined in: [packages/core/src/memory/types.ts:346](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L346)

#### Parameters

##### keys

`string`[]

#### Returns

`Promise`\<`number`\>

***

### exists()

> **exists**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/memory/types.ts:338](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L338)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [packages/core/src/memory/types.ts:335](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L335)

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

Defined in: [packages/core/src/memory/types.ts:344](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L344)

#### Type Parameters

##### T

`T`

#### Parameters

##### keys

`string`[]

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

***

### keys()

> **keys**(`pattern?`): `Promise`\<`string`[]\>

Defined in: [packages/core/src/memory/types.ts:339](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L339)

#### Parameters

##### pattern?

`string`

#### Returns

`Promise`\<`string`[]\>

***

### scan()

> **scan**(`pattern?`): `AsyncIterator`\<\[`string`, `unknown`\]\>

Defined in: [packages/core/src/memory/types.ts:341](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L341)

#### Parameters

##### pattern?

`string`

#### Returns

`AsyncIterator`\<\[`string`, `unknown`\]\>

***

### set()

> **set**\<`T`\>(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/types.ts:336](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L336)

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

Defined in: [packages/core/src/memory/types.ts:345](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L345)

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
