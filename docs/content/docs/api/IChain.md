---
title: "IChain"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / IChain

# Interface: IChain

Defined in: [packages/core/src/types.ts:955](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L955)

## Properties

### chainId

> **chainId**: `string`

Defined in: [packages/core/src/types.ts:959](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L959)

A unique identifier for the chain (e.g., "starknet", "ethereum", "solana", etc.)

## Methods

### read()

> **read**(`call`): `Promise`\<`any`\>

Defined in: [packages/core/src/types.ts:965](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L965)

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

Defined in: [packages/core/src/types.ts:970](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L970)

Write (execute a transaction) on this chain, typically requiring signatures, etc.

#### Parameters

##### call

`unknown`

#### Returns

`Promise`\<`any`\>
