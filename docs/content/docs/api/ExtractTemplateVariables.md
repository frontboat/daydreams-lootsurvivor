---
title: "ExtractTemplateVariables"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ExtractTemplateVariables

# Type Alias: ExtractTemplateVariables\<T\>

> **ExtractTemplateVariables**\<`T`\> = `T` *extends* `` `${infer Start}{{${infer Var}}}${infer Rest}` `` ? `Var` \| `ExtractTemplateVariables`\<`Rest`\> : `never`

Defined in: [packages/core/src/types.ts:541](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L541)

Extracts variable names from a template string

## Type Parameters

### T

`T` *extends* `string`

Template string type
