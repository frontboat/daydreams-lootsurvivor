---
title: "Evaluator"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Evaluator

# Type Alias: Evaluator\<Data, Context, TAgent\>

> **Evaluator**\<`Data`, `Context`, `TAgent`\> = `object`

Defined in: [packages/core/src/types.ts:68](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L68)

Represents an evaluator that can validate action/output results

## Type Parameters

### Data

`Data` = `any`

Type of data being evaluated

### Context

`Context` *extends* [`AgentContext`](./AgentContext.md)\<`any`\> = [`AgentContext`](./AgentContext.md)\<`any`\>

Context type for the evaluation

### TAgent

`TAgent` *extends* [`AnyAgent`](./AnyAgent.md) = [`AnyAgent`](./AnyAgent.md)

## Properties

### description?

> `optional` **description**: `string`

Defined in: [packages/core/src/types.ts:74](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L74)

***

### handler()?

> `optional` **handler**: (`data`, `ctx`, `agent`) => `Promise`\<`boolean`\> \| `boolean`

Defined in: [packages/core/src/types.ts:80](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L80)

Custom handler for evaluation logic

#### Parameters

##### data

`Data`

##### ctx

`Context`

##### agent

`TAgent`

#### Returns

`Promise`\<`boolean`\> \| `boolean`

***

### name

> **name**: `string`

Defined in: [packages/core/src/types.ts:73](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L73)

***

### onFailure()?

> `optional` **onFailure**: (`ctx`, `agent`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/core/src/types.ts:86](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L86)

Optional callback when evaluation fails

#### Parameters

##### ctx

`Context`

##### agent

`TAgent`

#### Returns

`Promise`\<`void`\> \| `void`

***

### prompt?

> `optional` **prompt**: `string`

Defined in: [packages/core/src/types.ts:78](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L78)

Custom prompt template for LLM-based evaluation

***

### schema?

> `optional` **schema**: `z.ZodType`\<`any`\>

Defined in: [packages/core/src/types.ts:76](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L76)

Schema for the evaluation result
