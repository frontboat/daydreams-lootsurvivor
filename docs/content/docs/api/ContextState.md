---
title: "ContextState"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextState

# Type Alias: ContextState\<TContext\>

> **ContextState**\<`TContext`\> = `object`

Defined in: [packages/core/src/types.ts:1326](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1326)

Current state of a context instance

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

The context type

## Properties

### args

> **args**: [`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Defined in: [packages/core/src/types.ts:1334](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1334)

Arguments passed to this context

***

### context

> **context**: `TContext`

Defined in: [packages/core/src/types.ts:1332](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1332)

The context definition

***

### contexts

> **contexts**: `string`[]

Defined in: [packages/core/src/types.ts:1342](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1342)

IDs of related contexts

***

### id

> **id**: `string`

Defined in: [packages/core/src/types.ts:1328](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1328)

Unique identifier for this context instance

***

### key?

> `optional` **key**: `string`

Defined in: [packages/core/src/types.ts:1330](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1330)

Optional key for this context instance

***

### memory

> **memory**: [`InferContextMemory`](./InferContextMemory.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:1338](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1338)

Memory state for this context

***

### options

> **options**: [`InferContextOptions`](./InferContextOptions.md)\<`TContext`\>

Defined in: [packages/core/src/types.ts:1336](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1336)

Options/configuration for this context

***

### settings

> **settings**: [`ContextSettings`](./ContextSettings.md)

Defined in: [packages/core/src/types.ts:1340](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1340)

Settings for this context
