---
title: "ContextConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextConfig

# Type Alias: ContextConfig\<TMemory, Args, Ctx, Actions, Events\>

> **ContextConfig**\<`TMemory`, `Args`, `Ctx`, `Actions`, `Events`\> = [`Optional`](./Optional.md)\<`Omit`\<[`Context`](./Context.md)\<`TMemory`, `Args`, `Ctx`, `Actions`, `Events`\>, keyof `ContextConfigApi`\>, `"actions"` \| `"events"` \| `"inputs"` \| `"outputs"`\>

Defined in: [packages/core/src/types.ts:1076](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L1076)

## Type Parameters

### TMemory

`TMemory` = `any`

### Args

`Args` *extends* `z.ZodTypeAny` \| `ZodRawShape` = `any`

### Ctx

`Ctx` = `any`

### Actions

`Actions` *extends* [`AnyAction`](./AnyAction.md)[] = [`AnyAction`](./AnyAction.md)[]

### Events

`Events` *extends* `Record`\<`string`, `z.ZodTypeAny` \| `z.ZodRawShape`\> = `Record`\<`string`, `z.ZodTypeAny` \| `z.ZodRawShape`\>
