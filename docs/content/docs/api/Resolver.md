---
title: "Resolver"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Resolver

# Type Alias: Resolver\<Result, Ctx\>

> **Resolver**\<`Result`, `Ctx`\> = `Result` \| (`ctx`) => `Result`

Defined in: [packages/core/src/types.ts:1091](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1091)

Type that can be either a static value or a function that computes the value from context

## Type Parameters

### Result

`Result`

The type of the resolved value

### Ctx

`Ctx`

The context type passed to the resolver function
