---
title: "TemplateResolver"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / TemplateResolver

# Type Alias: TemplateResolver()\<Ctx\>

> **TemplateResolver**\<`Ctx`\> = (`path`, `ctx`) => [`MaybePromise`](./MaybePromise.md)\<`any`\>

Defined in: [packages/core/src/types.ts:1281](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1281)

Function type for resolving template variables in context

## Type Parameters

### Ctx

`Ctx` = `any`

The context type

## Parameters

### path

`string`

The path to the template variable

### ctx

`Ctx`

The context object

## Returns

[`MaybePromise`](./MaybePromise.md)\<`any`\>

The resolved value
