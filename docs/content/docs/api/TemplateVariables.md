---
title: "TemplateVariables"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / TemplateVariables

# Type Alias: TemplateVariables\<T, V\>

> **TemplateVariables**\<`T`, `V`\> = `{ [K in ExtractTemplateVariables<T>]: any }`

Defined in: [packages/core/src/types.ts:520](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L520)

Creates a type mapping template variables (including nested paths) to values

## Type Parameters

### T

`T` *extends* `string`

Template string type

### V

`V` = `any`

Value type at the leaf (defaults to string)
