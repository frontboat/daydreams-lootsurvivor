---
title: "ExtractTemplateVariables"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ExtractTemplateVariables

# Type Alias: ExtractTemplateVariables\<T\>

> **ExtractTemplateVariables**\<`T`\> = `T` *extends* `` `${infer Start}{{${infer Var}}}${infer Rest}` `` ? `Var` \| `ExtractTemplateVariables`\<`Rest`\> : `never`

Defined in: [packages/core/src/types.ts:541](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L541)

Extracts variable names from a template string

## Type Parameters

### T

`T` *extends* `string`

Template string type
