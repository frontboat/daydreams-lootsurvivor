---
title: "EventDef"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EventDef

# Type Alias: EventDef\<Schema\>

> **EventDef**\<`Schema`\> = `object`

Defined in: [packages/core/src/types.ts:1060](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1060)

Definition for an event type

## Type Parameters

### Schema

`Schema` *extends* `z.ZodTypeAny` \| `ZodRawShape` = `z.ZodTypeAny`

The schema type for event data

## Properties

### name

> **name**: `string`

Defined in: [packages/core/src/types.ts:1063](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1063)

Name of the event

***

### schema

> **schema**: `Schema`

Defined in: [packages/core/src/types.ts:1065](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1065)

Schema for validating event data
