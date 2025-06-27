---
title: "ActionCallContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ActionCallContext

# Interface: ActionCallContext\<Schema, TContext, AContext, ActionMemory\>

Defined in: [packages/core/src/types.ts:117](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L117)

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

Defined in: [packages/core/src/types.ts:1319](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1319)

Get pending action results

#### Returns

`Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>[]

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`__getRunResults`](ContextStateApi.md#__getrunresults)

***

### abortSignal?

> `optional` **abortSignal**: `AbortSignal`

Defined in: [packages/core/src/types.ts:114](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L114)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`abortSignal`](ActionContext.md#abortsignal)

***

### actionMemory

> **actionMemory**: [`InferActionState`](./InferActionState.md)\<`ActionMemory`\>

Defined in: [packages/core/src/types.ts:112](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L112)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`actionMemory`](ActionContext.md#actionmemory-1)

***

### agentMemory

> **agentMemory**: `undefined` \| [`InferContextMemory`](./InferContextMemory.md)\<`AContext`\>

Defined in: [packages/core/src/types.ts:113](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L113)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`agentMemory`](ActionContext.md#agentmemory)

***

### args

> **args**: [`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Defined in: [packages/core/src/types.ts:574](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L574)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`args`](ActionContext.md#args)

***

### call

> **call**: [`ActionCall`](./ActionCall.md)\<[`InferActionArguments`](./InferActionArguments.md)\<`Schema`\>\>

Defined in: [packages/core/src/types.ts:124](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L124)

***

### callAction()

> **callAction**: (`call`, `options?`) => `Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>

Defined in: [packages/core/src/types.ts:1310](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1310)

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

Defined in: [packages/core/src/types.ts:573](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L573)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`context`](ActionContext.md#context)

***

### emit

> **emit**: `ContextEventEmitter`\<`TContext`\>

Defined in: [packages/core/src/types.ts:1305](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1305)

Emit an event for this context

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`emit`](ContextStateApi.md#emit)

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:572](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L572)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`id`](ActionContext.md#id)

***

### memory

> **memory**: [`InferContextMemory`](./InferContextMemory.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:577](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L577)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`memory`](ActionContext.md#memory)

***

### options

> **options**: [`InferContextOptions`](./InferContextOptions.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:575](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L575)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`options`](ActionContext.md#options)

***

### push()

> **push**: (`log`) => `Promise`\<`any`\>

Defined in: [packages/core/src/types.ts:1307](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1307)

Push a log entry

#### Parameters

##### log

[`Log`](./Log.md)

#### Returns

`Promise`\<`any`\>

#### Inherited from

[`ContextStateApi`](./ContextStateApi.md).[`push`](ContextStateApi.md#push)

***

### requestContext?

> `optional` **requestContext**: `RequestContext`

Defined in: [packages/core/src/types.ts:579](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L579)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`requestContext`](ActionContext.md#requestcontext)

***

### settings

> **settings**: [`ContextSettings`](./ContextSettings.md)

Defined in: [packages/core/src/types.ts:576](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L576)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`settings`](ActionContext.md#settings)

***

### workingMemory

> **workingMemory**: [`WorkingMemory`](./WorkingMemory.md)

Defined in: [packages/core/src/types.ts:578](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L578)

#### Inherited from

[`ActionContext`](./ActionContext.md).[`workingMemory`](ActionContext.md#workingmemory)
