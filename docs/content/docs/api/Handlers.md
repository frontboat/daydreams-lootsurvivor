---
title: "Handlers"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Handlers

# Interface: Handlers

Defined in: [packages/core/src/types.ts:590](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L590)

Event handlers for agent operations

## Properties

### onLogStream()

> **onLogStream**: (`log`, `done`) => `void`

Defined in: [packages/core/src/types.ts:592](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L592)

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

Defined in: [packages/core/src/types.ts:594](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L594)

Handler for thinking/reasoning events

#### Parameters

##### thought

[`ThoughtRef`](./ThoughtRef.md)

#### Returns

`void`
