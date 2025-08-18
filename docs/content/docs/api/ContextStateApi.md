---
title: "ContextStateApi"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextStateApi

# Interface: ContextStateApi\<TContext\>

Defined in: [packages/core/src/types.ts:1290](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1290)

API methods available on context state

## Extended by

- [`ActionCallContext`](./ActionCallContext.md)

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

The context type

## Properties

### \_\_getRunResults()

> **\_\_getRunResults**: () => `Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>[]

Defined in: [packages/core/src/types.ts:1306](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1306)

Get pending action results

#### Returns

`Promise`\<[`ActionResult`](./ActionResult.md)\<`any`\>\>[]

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

***

### emit

> **emit**: `ContextEventEmitter`\<`TContext`\>

Defined in: [packages/core/src/types.ts:1292](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1292)

Emit an event for this context

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
