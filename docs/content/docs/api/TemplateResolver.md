---
title: "TemplateResolver"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / TemplateResolver

# Type Alias: TemplateResolver()\<Ctx\>

> **TemplateResolver**\<`Ctx`\> = (`path`, `ctx`) => [`MaybePromise`](./MaybePromise.md)\<`any`\>

Defined in: [packages/core/src/types.ts:1294](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1294)

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
