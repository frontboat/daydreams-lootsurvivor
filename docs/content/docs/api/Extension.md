---
title: "Extension"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Extension

# Type Alias: Extension\<TContext, Contexts, Inputs\>

> **Extension**\<`TContext`, `Contexts`, `Inputs`\> = `Pick`\<[`Config`](./Config.md)\<`TContext`\>, `"inputs"` \| `"outputs"` \| `"actions"` \| `"services"` \| `"events"`\> & `object`

Defined in: [packages/core/src/types.ts:1345](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1345)

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
