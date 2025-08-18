---
title: "EventDef"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / EventDef

# Type Alias: EventDef\<Schema\>

> **EventDef**\<`Schema`\> = `object`

Defined in: [packages/core/src/types.ts:1047](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1047)

Definition for an event type

## Type Parameters

### Schema

`Schema` *extends* `z.ZodTypeAny` \| `ZodRawShape` = `z.ZodTypeAny`

The schema type for event data

## Properties

### name

> **name**: `string`

Defined in: [packages/core/src/types.ts:1050](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1050)

Name of the event

***

### schema

> **schema**: `Schema`

Defined in: [packages/core/src/types.ts:1052](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1052)

Schema for validating event data
