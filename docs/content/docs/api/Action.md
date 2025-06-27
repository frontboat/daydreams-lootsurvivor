---
title: "Action"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Action

# Interface: Action\<Schema, Result, TError, TContext, TAgent, TState\>

Defined in: [packages/core/src/types.ts:168](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L168)

Represents an action that can be executed with typed parameters

## Template

Context type for the action execution

## Type Parameters

### Schema

`Schema` *extends* [`ActionSchema`](./ActionSchema.md) = [`ActionSchema`](./ActionSchema.md)

Zod schema defining parameter types

### Result

`Result` = `any`

Return type of the action

### TError

`TError` = `unknown`

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)

### TState

`TState` *extends* [`ActionState`](./ActionState.md) = [`ActionState`](./ActionState.md)

## Properties

### actionState?

> `optional` **actionState**: `TState`

Defined in: [packages/core/src/types.ts:184](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L184)

***

### attributes?

> `optional` **attributes**: [`ActionSchema`](./ActionSchema.md)

Defined in: [packages/core/src/types.ts:182](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L182)

***

### callFormat?

> `optional` **callFormat**: `"json"` \| `"xml"`

Defined in: [packages/core/src/types.ts:231](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L231)

***

### context?

> `optional` **context**: `TContext`

Defined in: [packages/core/src/types.ts:200](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L200)

***

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/types.ts:177](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L177)

***

### enabled()?

> `optional` **enabled**: (`ctx`) => `boolean`

Defined in: [packages/core/src/types.ts:188](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L188)

#### Parameters

##### ctx

[`ActionContext`](./ActionContext.md)\<`TContext`, [`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>, `TState`\>

#### Returns

`boolean`

***

### evaluator?

> `optional` **evaluator**: [`Evaluator`](./Evaluator.md)\<`Result`, [`AgentContext`](./AgentContext.md)\<`TContext`\>, `TAgent`\>

Defined in: [packages/core/src/types.ts:198](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L198)

Optional evaluator for this specific action

***

### examples?

> `optional` **examples**: `string`[]

Defined in: [packages/core/src/types.ts:227](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L227)

***

### format()?

> `optional` **format**: (`result`) => `string` \| `string`[]

Defined in: [packages/core/src/types.ts:196](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L196)

#### Parameters

##### result

[`ActionResult`](./ActionResult.md)\<`Result`\>

#### Returns

`string` \| `string`[]

***

### handler

> **handler**: [`ActionHandler`](./ActionHandler.md)\<`Schema`, `Result`, `TContext`, `TAgent`, `TState`\>

Defined in: [packages/core/src/types.ts:192](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L192)

***

### install()?

> `optional` **install**: (`agent`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:186](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L186)

#### Parameters

##### agent

`TAgent`

#### Returns

`void` \| `Promise`\<`void`\>

***

### instructions?

> `optional` **instructions**: `string`

Defined in: [packages/core/src/types.ts:178](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L178)

***

### name

> **name**: `string`

Defined in: [packages/core/src/types.ts:176](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L176)

***

### onError()?

> `optional` **onError**: (`err`, `ctx`, `agent`) => `any`

Defined in: [packages/core/src/types.ts:210](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L210)

#### Parameters

##### err

`TError`

##### ctx

[`ActionCallContext`](./ActionCallContext.md)\<`Schema`, `TContext`, [`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>, `TState`\>

##### agent

`TAgent`

#### Returns

`any`

***

### onSuccess()?

> `optional` **onSuccess**: (`result`, `ctx`, `agent`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:202](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L202)

#### Parameters

##### result

[`ActionResult`](./ActionResult.md)\<`Result`\>

##### ctx

[`ActionCallContext`](./ActionCallContext.md)\<`Schema`, `TContext`, [`InferAgentContext`](./InferAgentContext.md)\<`TAgent`\>, `TState`\>

##### agent

`TAgent`

#### Returns

`void` \| `Promise`\<`void`\>

***

### parser()?

> `optional` **parser**: (`ref`) => [`InferActionArguments`](./InferActionArguments.md)\<`Schema`\>

Defined in: [packages/core/src/types.ts:229](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L229)

#### Parameters

##### ref

[`ActionCall`](./ActionCall.md)

#### Returns

[`InferActionArguments`](./InferActionArguments.md)\<`Schema`\>

***

### queueKey?

> `optional` **queueKey**: `string` \| (`ctx`) => `string`

Defined in: [packages/core/src/types.ts:216](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L216)

***

### retry?

> `optional` **retry**: `number` \| `boolean` \| (`failureCount`, `error`) => `boolean`

Defined in: [packages/core/src/types.ts:208](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L208)

***

### returns?

> `optional` **returns**: [`ActionSchema`](./ActionSchema.md)

Defined in: [packages/core/src/types.ts:194](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L194)

***

### schema

> **schema**: `Schema`

Defined in: [packages/core/src/types.ts:180](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L180)

***

### templateResolver?

> `optional` **templateResolver**: `boolean` \| (`key`, `path`, `ctx`) => [`MaybePromise`](./MaybePromise.md)\<`string`\>

Defined in: [packages/core/src/types.ts:233](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L233)
