---
title: "IChain"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / IChain

# Interface: IChain

Defined in: [packages/core/src/types.ts:942](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L942)

## Properties

### chainId

> **chainId**: `string`

Defined in: [packages/core/src/types.ts:946](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L946)

A unique identifier for the chain (e.g., "starknet", "ethereum", "solana", etc.)

## Methods

### read()

> **read**(`call`): `Promise`\<`any`\>

Defined in: [packages/core/src/types.ts:952](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L952)

Read (call) a contract or perform a query on this chain.
The `call` parameter can be chain-specific data.

#### Parameters

##### call

`unknown`

#### Returns

`Promise`\<`any`\>

***

### write()

> **write**(`call`): `Promise`\<`any`\>

Defined in: [packages/core/src/types.ts:957](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L957)

Write (execute a transaction) on this chain, typically requiring signatures, etc.

#### Parameters

##### call

`unknown`

#### Returns

`Promise`\<`any`\>
