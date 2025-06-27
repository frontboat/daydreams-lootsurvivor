---
title: "Output"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Output

# Type Alias: Output\<Schema, Response, TContext, TAgent\>

> **Output**\<`Schema`, `Response`, `TContext`, `TAgent`\> = `object`

Defined in: [packages/core/src/types.ts:301](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L301)

## Type Parameters

### Schema

`Schema` *extends* [`OutputSchema`](./OutputSchema.md) = [`OutputSchema`](./OutputSchema.md)

### Response

`Response` *extends* [`OutputRefResponse`](./OutputRefResponse.md) = [`OutputRefResponse`](./OutputRefResponse.md)

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)

## Properties

### attributes?

> `optional` **attributes**: [`OutputSchema`](./OutputSchema.md)

Defined in: [packages/core/src/types.ts:312](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L312)

***

### context?

> `optional` **context**: `TContext`

Defined in: [packages/core/src/types.ts:313](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L313)

***

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/types.ts:308](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L308)

***

### enabled()?

> `optional` **enabled**: (`ctx`) => `boolean`

Defined in: [packages/core/src/types.ts:315](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L315)

#### Parameters

##### ctx

[`ContextState`](./ContextState.md)\<`TContext`\>

#### Returns

`boolean`

***

### evaluator?

> `optional` **evaluator**: [`Evaluator`](./Evaluator.md)\<[`OutputResponse`](./OutputResponse.md), [`AgentContext`](./AgentContext.md)\<[`Context`](./Context.md)\>, `TAgent`\>

Defined in: [packages/core/src/types.ts:325](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L325)

Optional evaluator for this specific output

***

### examples?

> `optional` **examples**: `string`[]

Defined in: [packages/core/src/types.ts:327](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L327)

***

### format()?

> `optional` **format**: (`res`) => `string` \| `string`[] \| [`XMLElement`](./XMLElement.md)

Defined in: [packages/core/src/types.ts:323](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L323)

#### Parameters

##### res

[`OutputRef`](./OutputRef.md)\<`Response`\[`"data"`\]\>

#### Returns

`string` \| `string`[] \| [`XMLElement`](./XMLElement.md)

***

### handler()?

> `optional` **handler**: (`data`, `ctx`, `agent`) => [`MaybePromise`](./MaybePromise.md)\<`Response` \| `Response`[]\>

Defined in: [packages/core/src/types.ts:316](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L316)

#### Parameters

##### data

`InferOutputSchemaParams`\<`Schema`\>

##### ctx

[`ContextState`](./ContextState.md)\<`TContext`\> & `object`

##### agent

`TAgent`

#### Returns

[`MaybePromise`](./MaybePromise.md)\<`Response` \| `Response`[]\>

***

### install()?

> `optional` **install**: (`agent`) => [`MaybePromise`](./MaybePromise.md)\<`void`\>

Defined in: [packages/core/src/types.ts:314](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L314)

#### Parameters

##### agent

`TAgent`

#### Returns

[`MaybePromise`](./MaybePromise.md)\<`void`\>

***

### instructions?

> `optional` **instructions**: `string`

Defined in: [packages/core/src/types.ts:309](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L309)

***

### required?

> `optional` **required**: `boolean`

Defined in: [packages/core/src/types.ts:310](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L310)

***

### schema?

> `optional` **schema**: `Schema`

Defined in: [packages/core/src/types.ts:311](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L311)

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:307](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L307)
