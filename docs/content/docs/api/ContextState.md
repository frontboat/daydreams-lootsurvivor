---
title: "ContextState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextState

# Type Alias: ContextState\<TContext\>

> **ContextState**\<`TContext`\> = `object`

Defined in: [packages/core/src/types.ts:1313](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1313)

Current state of a context instance

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

The context type

## Properties

### args

> **args**: [`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Defined in: [packages/core/src/types.ts:1321](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1321)

Arguments passed to this context

***

### context

> **context**: `TContext`

Defined in: [packages/core/src/types.ts:1319](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1319)

The context definition

***

### contexts

> **contexts**: `string`[]

Defined in: [packages/core/src/types.ts:1329](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1329)

IDs of related contexts

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:1315](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1315)

Unique identifier for this context instance

***

### key?

> `optional` **key**: `string`

Defined in: [packages/core/src/types.ts:1317](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1317)

Optional key for this context instance

***

### memory

> **memory**: [`InferContextMemory`](./InferContextMemory.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:1325](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1325)

Memory state for this context

***

### options

> **options**: [`InferContextOptions`](./InferContextOptions.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:1323](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1323)

Options/configuration for this context

***

### settings

> **settings**: [`ContextSettings`](./ContextSettings.md)

Defined in: [packages/core/src/types.ts:1327](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1327)

Settings for this context
