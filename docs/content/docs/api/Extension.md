---
title: "Extension"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Extension

# Type Alias: Extension\<TContext, Contexts, Inputs\>

> **Extension**\<`TContext`, `Contexts`, `Inputs`\> = `Pick`\<[`Config`](./Config.md)\<`TContext`\>, `"inputs"` \| `"outputs"` \| `"actions"` \| `"services"` \| `"events"`\> & `object`

Defined in: [packages/core/src/types.ts:1345](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L1345)

## Type declaration

### contexts?

> `optional` **contexts**: `Contexts`

### inputs

> **inputs**: `Inputs`

### install()?

> `optional` **install**: (`agent`) => `Promise`\<`void`\> \| `void`

#### Parameters

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`void`\> \| `void`

### name

> **name**: `string`

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### Contexts

`Contexts` *extends* `Record`\<`string`, [`AnyContext`](./AnyContext.md)\> = `Record`\<`string`, [`AnyContext`](./AnyContext.md)\>

### Inputs

`Inputs` *extends* `Record`\<`string`, [`InputConfig`](./InputConfig.md)\<`any`, `any`\>\> = `Record`\<`string`, [`InputConfig`](./InputConfig.md)\<`any`, `any`\>\>
