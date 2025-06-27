---
title: "TemplateVariables"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / TemplateVariables

# Type Alias: TemplateVariables\<T, V\>

> **TemplateVariables**\<`T`, `V`\> = `{ [K in ExtractTemplateVariables<T>]: any }`

Defined in: [packages/core/src/types.ts:551](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L551)

Creates a type mapping template variables (including nested paths) to values

## Type Parameters

### T

`T` *extends* `string`

Template string type

### V

`V` = `any`

Value type at the leaf (defaults to string)
