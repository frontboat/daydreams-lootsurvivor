---
title: "Resolver"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Resolver

# Type Alias: Resolver\<Result, Ctx\>

> **Resolver**\<`Result`, `Ctx`\> = `Result` \| (`ctx`) => `Result`

Defined in: [packages/core/src/types.ts:1104](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1104)

Type that can be either a static value or a function that computes the value from context

## Type Parameters

### Result

`Result`

The type of the resolved value

### Ctx

`Ctx`

The context type passed to the resolver function
