---
title: "Handlers"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Handlers

# Interface: Handlers

Defined in: [packages/core/src/types.ts:590](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L590)

Event handlers for agent operations

## Properties

### onLogStream()

> **onLogStream**: (`log`, `done`) => `void`

Defined in: [packages/core/src/types.ts:592](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L592)

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

Defined in: [packages/core/src/types.ts:594](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L594)

Handler for thinking/reasoning events

#### Parameters

##### thought

[`ThoughtRef`](./ThoughtRef.md)

#### Returns

`void`
