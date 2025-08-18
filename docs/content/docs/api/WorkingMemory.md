---
title: "WorkingMemory"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / WorkingMemory

# Interface: WorkingMemory

Defined in: [packages/core/src/memory/types.ts:429](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L429)

Represents the working memory state during execution

## Extends

- [`WorkingMemoryData`](./WorkingMemoryData.md)

## Properties

### calls

> **calls**: [`ActionCall`](./ActionCall.md)\<`any`\>[]

Defined in: [packages/core/src/memory/types.ts:222](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L222)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`calls`](WorkingMemoryData.md#calls)

***

### currentImage?

> `optional` **currentImage**: `URL`

Defined in: [packages/core/src/memory/types.ts:431](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L431)

Current image URL for multimodal context

***

### events

> **events**: [`EventRef`](./EventRef.md)[]

Defined in: [packages/core/src/memory/types.ts:224](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L224)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`events`](WorkingMemoryData.md#events)

***

### inputs

> **inputs**: [`InputRef`](./InputRef.md)\<`any`\>[]

Defined in: [packages/core/src/memory/types.ts:219](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L219)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`inputs`](WorkingMemoryData.md#inputs)

***

### outputs

> **outputs**: [`OutputRef`](./OutputRef.md)[]

Defined in: [packages/core/src/memory/types.ts:220](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L220)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`outputs`](WorkingMemoryData.md#outputs)

***

### relevantMemories?

> `optional` **relevantMemories**: [`MemoryResult`](./MemoryResult.md)[]

Defined in: [packages/core/src/memory/types.ts:227](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L227)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`relevantMemories`](WorkingMemoryData.md#relevantmemories)

***

### results

> **results**: [`ActionResult`](./ActionResult.md)\<`any`\>[]

Defined in: [packages/core/src/memory/types.ts:223](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L223)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`results`](WorkingMemoryData.md#results)

***

### runs

> **runs**: [`RunRef`](./RunRef.md)[]

Defined in: [packages/core/src/memory/types.ts:226](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L226)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`runs`](WorkingMemoryData.md#runs)

***

### steps

> **steps**: [`StepRef`](./StepRef.md)[]

Defined in: [packages/core/src/memory/types.ts:225](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L225)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`steps`](WorkingMemoryData.md#steps)

***

### thoughts

> **thoughts**: [`ThoughtRef`](./ThoughtRef.md)[]

Defined in: [packages/core/src/memory/types.ts:221](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/types.ts#L221)

#### Inherited from

[`WorkingMemoryData`](./WorkingMemoryData.md).[`thoughts`](WorkingMemoryData.md#thoughts)
