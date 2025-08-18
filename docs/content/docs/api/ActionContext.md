---
title: "ActionContext"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ActionContext

# Interface: ActionContext\<TContext, AContext, ActionMemory\>

Defined in: [packages/core/src/types.ts:80](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L80)

## Extends

- [`AgentContext`](./AgentContext.md)\<`TContext`\>

## Extended by

- [`ActionCallContext`](./ActionCallContext.md)

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### AContext

`AContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

### ActionMemory

`ActionMemory` *extends* [`ActionState`](./ActionState.md) = [`ActionState`](./ActionState.md)

## Properties

### abortSignal?

> `optional` **abortSignal**: `AbortSignal`

Defined in: [packages/core/src/types.ts:87](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L87)

***

### actionMemory

> **actionMemory**: [`InferActionState`](./InferActionState.md)\<`ActionMemory`\>

Defined in: [packages/core/src/types.ts:85](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L85)

***

### agentMemory

> **agentMemory**: `undefined` \| [`InferContextMemory`](./InferContextMemory.md)\<`AContext`\>

Defined in: [packages/core/src/types.ts:86](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L86)

***

### args

> **args**: [`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Defined in: [packages/core/src/types.ts:543](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L543)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`args`](AgentContext.md#args)

***

### context

> **context**: `TContext`

Defined in: [packages/core/src/types.ts:542](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L542)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`context`](AgentContext.md#context)

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:541](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L541)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`id`](AgentContext.md#id)

***

### memory

> **memory**: [`InferContextMemory`](./InferContextMemory.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:546](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L546)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`memory`](AgentContext.md#memory)

***

### options

> **options**: [`InferContextOptions`](./InferContextOptions.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:544](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L544)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`options`](AgentContext.md#options)

***

### settings

> **settings**: [`ContextSettings`](./ContextSettings.md)

Defined in: [packages/core/src/types.ts:545](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L545)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`settings`](AgentContext.md#settings)

***

### workingMemory

> **workingMemory**: [`WorkingMemory`](./WorkingMemory.md)

Defined in: [packages/core/src/types.ts:547](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L547)

#### Inherited from

[`AgentContext`](./AgentContext.md).[`workingMemory`](AgentContext.md#workingmemory)
