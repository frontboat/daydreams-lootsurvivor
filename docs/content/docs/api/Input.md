---
title: "Input"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Input

# Type Alias: Input\<Schema, TContext, TAgent\>

> **Input**\<`Schema`, `TContext`, `TAgent`\> = `object`

Defined in: [packages/core/src/types.ts:352](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L352)

Represents an input handler with validation and subscription capability

## Template

Context type for input handling

## Type Parameters

### Schema

`Schema` *extends* `z.ZodObject` \| `z.ZodString` \| `z.ZodRawShape` = `z.ZodObject` \| `z.ZodString` \| `z.ZodRawShape`

Zod schema for input parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)

## Properties

### context?

> `optional` **context**: `TContext`

Defined in: [packages/core/src/types.ts:363](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L363)

***

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/types.ts:361](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L361)

***

### enabled()?

> `optional` **enabled**: (`state`) => `Promise`\<`boolean`\> \| `boolean`

Defined in: [packages/core/src/types.ts:366](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L366)

#### Parameters

##### state

[`AgentContext`](./AgentContext.md)\<`TContext`\>

#### Returns

`Promise`\<`boolean`\> \| `boolean`

***

### format()?

> `optional` **format**: (`ref`) => `string` \| `string`[] \| [`XMLElement`](./XMLElement.md)

Defined in: [packages/core/src/types.ts:372](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L372)

#### Parameters

##### ref

[`InputRef`](./InputRef.md)\<[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>\>

#### Returns

`string` \| `string`[] \| [`XMLElement`](./XMLElement.md)

***

### handler()?

> `optional` **handler**: (`data`, `ctx`, `agent`) => [`MaybePromise`](./MaybePromise.md)\<`Pick`\<[`InputRef`](./InputRef.md), `"params"` \| `"data"`\>\>

Defined in: [packages/core/src/types.ts:367](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L367)

#### Parameters

##### data

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>

##### ctx

[`AgentContext`](./AgentContext.md)\<`TContext`\>

##### agent

`TAgent`

#### Returns

[`MaybePromise`](./MaybePromise.md)\<`Pick`\<[`InputRef`](./InputRef.md), `"params"` \| `"data"`\>\>

***

### install()?

> `optional` **install**: (`agent`) => [`MaybePromise`](./MaybePromise.md)\<`void`\>

Defined in: [packages/core/src/types.ts:365](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L365)

#### Parameters

##### agent

`TAgent`

#### Returns

[`MaybePromise`](./MaybePromise.md)\<`void`\>

***

### schema?

> `optional` **schema**: `Schema`

Defined in: [packages/core/src/types.ts:362](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L362)

***

### subscribe()?

> `optional` **subscribe**: (`send`, `agent`) => () => `void` \| `void` \| `Promise`\<`void` \| () => `void`\>

Defined in: [packages/core/src/types.ts:375](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L375)

#### Parameters

##### send

\<`TContext`\>(`context`, `args`, `data`) => [`MaybePromise`](./MaybePromise.md)\<`void`\>

##### agent

`TAgent`

#### Returns

() => `void` \| `void` \| `Promise`\<`void` \| () => `void`\>

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:360](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L360)
