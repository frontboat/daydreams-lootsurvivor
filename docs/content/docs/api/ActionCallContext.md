---
title: "ActionCallContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ActionCallContext

# Interface: ActionCallContext\<Schema, TContext, AContext, ActionMemory\>

Defined in: [packages/core/src/types.ts:90](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L90)

API methods available on context state

## Extends

- [`ActionContext`](./ActionContext.md)\<`TContext`, `AContext`, `ActionMemory`\>.[`ContextStateApi`](./ContextStateApi.md)\<`TContext`\>

## Type Parameters

### Schema

`Schema` *extends* [`ActionSchema`](./ActionSchema.md) = `undefined`

The context type

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### AContext

`AContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### ActionMemory

`ActionMemory` *extends* [`ActionState`](./ActionState.md) = [`ActionState`](./ActionState.md)

## Properties

### \_\_getRunResults()

> **\_\_getRunResults**: () => `Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>[]

Defined in: [packages/core/src/types.ts:1306](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1306)

Get pending action results

#### Returns

`Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>[]

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`__getRunResults`](ContextStateApi.md#__getrunresults)

***

### abortSignal?

> `optional` **abortSignal**: `AbortSignal`

Defined in: [packages/core/src/types.ts:87](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L87)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`abortSignal`](ActionContext.md#abortsignal)

***

### actionMemory

> **actionMemory**: [`InferActionState`](./InferActionState.md)\<`ActionMemory`\>

Defined in: [packages/core/src/types.ts:85](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L85)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`actionMemory`](ActionContext.md#actionmemory-1)

***

### agentMemory

> **agentMemory**: `undefined` \| [`InferContextMemory`](./InferContextMemory.md)\<`AContext`\>

Defined in: [packages/core/src/types.ts:86](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L86)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`agentMemory`](ActionContext.md#agentmemory)

***

### args

> **args**: [`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Defined in: [packages/core/src/types.ts:543](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L543)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`args`](ActionContext.md#args)

***

### call

> **call**: [`ActionCall`](./ActionCall.md)\<[`InferActionArguments`](./InferActionArguments.md)\<`Schema`\>\>

Defined in: [packages/core/src/types.ts:97](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L97)

***

### callAction()

> **callAction**: (`call`, `options?`) => `Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>

Defined in: [packages/core/src/types.ts:1297](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1297)

Call an action with optional configuration

#### Parameters

##### call

[`ActionCall`](./ActionCall.md)

##### options?

`Partial`\<\{ `queueKey?`: `string`; `templateResolvers?`: `Record`\<`string`, [`TemplateResolver`](./TemplateResolver.md)\<`any`\>\>; \}\>

#### Returns

`Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`callAction`](ContextStateApi.md#callaction)

***

### context

> **context**: `TContext`

Defined in: [packages/core/src/types.ts:542](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L542)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`context`](ActionContext.md#context)

***

### emit

> **emit**: `ContextEventEmitter`\<`TContext`\>

Defined in: [packages/core/src/types.ts:1292](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1292)

Emit an event for this context

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`emit`](ContextStateApi.md#emit)

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:541](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L541)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`id`](ActionContext.md#id)

***

### memory

> **memory**: [`InferContextMemory`](./InferContextMemory.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:546](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L546)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`memory`](ActionContext.md#memory)

***

### options

> **options**: [`InferContextOptions`](./InferContextOptions.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:544](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L544)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`options`](ActionContext.md#options)

***

### push()

> **push**: (`log`) => `Promise`\<`any`\>

Defined in: [packages/core/src/types.ts:1294](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1294)

Push a log entry

#### Parameters

##### log

[`Log`](./Log.md)

#### Returns

`Promise`\<`any`\>

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`push`](ContextStateApi.md#push)

***

### settings

> **settings**: [`ContextSettings`](./ContextSettings.md)

Defined in: [packages/core/src/types.ts:545](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L545)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`settings`](ActionContext.md#settings)

***

### workingMemory

> **workingMemory**: [`WorkingMemory`](./WorkingMemory.md)

Defined in: [packages/core/src/types.ts:547](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L547)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`workingMemory`](ActionContext.md#workingmemory)
