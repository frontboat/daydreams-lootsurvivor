---
title: "ContextConfig"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / ContextConfig

# Type Alias: ContextConfig\<TMemory, Args, Ctx, Actions, Events\>

> **ContextConfig**\<`TMemory`, `Args`, `Ctx`, `Actions`, `Events`\> = [`Optional`](./Optional.md)\<`Omit`\<[`Context`](./Context.md)\<`TMemory`, `Args`, `Ctx`, `Actions`, `Events`\>, keyof `ContextConfigApi`\>, `"actions"` \| `"events"` \| `"inputs"` \| `"outputs"`\>

Defined in: [packages/core/src/types.ts:1063](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1063)

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
