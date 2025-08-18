---
title: "Handlers"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Handlers

# Interface: Handlers

Defined in: [packages/core/src/types.ts:558](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L558)

Event handlers for agent operations

## Properties

### onLogStream()

> **onLogStream**: (`log`, `done`) => `void`

Defined in: [packages/core/src/types.ts:560](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L560)

Handler for streaming log events

#### Parameters

##### log

[`AnyRef`](./AnyRef.md)

##### done

`boolean`

#### Returns

`void`

***

### onThinking()

> **onThinking**: (`thought`) => `void`

Defined in: [packages/core/src/types.ts:562](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L562)

Handler for thinking/reasoning events

#### Parameters

##### thought

[`ThoughtRef`](./ThoughtRef.md)

#### Returns

`void`
