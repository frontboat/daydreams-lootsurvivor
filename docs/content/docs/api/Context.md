---
title: "Context"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Context

# Interface: Context\<TMemory, Schema, Ctx, Actions, Events\>

Defined in: [packages/core/src/types.ts:1093](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1093)

## Extends

- `ContextConfigApi`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

## Type Parameters

### TMemory

`TMemory` = `any`

### Schema

`Schema` *extends* `z.ZodTypeAny` \| `ZodRawShape` = `z.ZodTypeAny`

### Ctx

`Ctx` = `any`

### Actions

`Actions` *extends* [`AnyAction`](./AnyAction.md)[] = [`AnyAction`](./AnyAction.md)[]

### Events

`Events` *extends* `Record`\<`string`, `z.ZodTypeAny` \| `ZodRawShape`\> = `Record`\<`string`, `z.ZodTypeAny` \| `ZodRawShape`\>

## Properties

### \_\_composers?

> `optional` **\_\_composers**: `BaseContextComposer`\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>[]

Defined in: [packages/core/src/types.ts:1201](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1201)

***

### \_\_templateResolvers?

> `optional` **\_\_templateResolvers**: `Record`\<`string`, [`TemplateResolver`](./TemplateResolver.md)\<[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\> & [`ContextStateApi`](./ContextStateApi.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>\>

Defined in: [packages/core/src/types.ts:1203](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1203)

***

### actions?

> `optional` **actions**: [`Resolver`](./Resolver.md)\<[`Action`](./Action.md)\<[`ActionSchema`](./ActionSchema.md), `any`, `unknown`, [`AnyContext`](./AnyContext.md), [`AnyAgent`](./AnyAgent.md), [`ActionState`](./ActionState.md)\>[], [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1181](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1181)

***

### create()?

> `optional` **create**: (`params`, `agent`) => `TMemory` \| `Promise`\<`TMemory`\>

Defined in: [packages/core/src/types.ts:1118](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1118)

Optional function to create new memory for this context

#### Parameters

##### params

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>

###### id

`string`

###### key?

`string`

###### options

`Ctx`

###### settings

[`ContextSettings`](./ContextSettings.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`TMemory` \| `Promise`\<`TMemory`\>

***

### description?

> `optional` **description**: [`Resolver`](./Resolver.md)\<`string` \| `string`[], [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1133](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1133)

Optional description of this context

***

### episodeHooks?

> `optional` **episodeHooks**: [`EpisodeHooks`](./EpisodeHooks.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

Defined in: [packages/core/src/types.ts:1179](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1179)

Episode detection and creation hooks for this context

***

### events?

> `optional` **events**: [`Resolver`](./Resolver.md)\<`Events`, [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1183](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1183)

***

### inputs?

> `optional` **inputs**: [`Resolver`](./Resolver.md)\<`Record`\<`string`, [`InputConfig`](./InputConfig.md)\<`any`, `any`, [`AnyAgent`](./AnyAgent.md)\>\>, [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1188](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1188)

A record of input configurations for the context.

***

### instructions?

> `optional` **instructions**: [`Resolver`](./Resolver.md)\<[`Instruction`](./Instruction.md), [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1130](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1130)

Optional instructions for this context

***

### key()?

> `optional` **key**: (`args`) => `string`

Defined in: [packages/core/src/types.ts:1108](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1108)

Function to generate a unique key from context arguments

#### Parameters

##### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>

#### Returns

`string`

***

### load()?

> `optional` **load**: (`id`, `params`) => `Promise`\<`null` \| `TMemory`\>

Defined in: [packages/core/src/types.ts:1136](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1136)

Optional function to load existing memory

#### Parameters

##### id

`string`

##### params

###### options

`Ctx`

###### settings

[`ContextSettings`](./ContextSettings.md)

#### Returns

`Promise`\<`null` \| `TMemory`\>

***

### loader()?

> `optional` **loader**: (`state`, `agent`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1172](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1172)

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`void`\>

***

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [packages/core/src/types.ts:1174](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1174)

***

### maxWorkingMemorySize?

> `optional` **maxWorkingMemorySize**: `number`

Defined in: [packages/core/src/types.ts:1176](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1176)

***

### model?

> `optional` **model**: `LanguageModel`

Defined in: [packages/core/src/types.ts:1148](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1148)

***

### modelSettings?

> `optional` **modelSettings**: `object`

Defined in: [packages/core/src/types.ts:1150](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1150)

#### Index Signature

\[`key`: `string`\]: `any`

#### maxTokens?

> `optional` **maxTokens**: `number`

#### providerOptions?

> `optional` **providerOptions**: `Record`\<`string`, `any`\>

#### stopSequences?

> `optional` **stopSequences**: `string`[]

#### temperature?

> `optional` **temperature**: `number`

#### topK?

> `optional` **topK**: `number`

#### topP?

> `optional` **topP**: `number`

***

### onError()?

> `optional` **onError**: (`error`, `ctx`, `agent`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1166](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1166)

#### Parameters

##### error

`unknown`

##### ctx

[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`void`\>

***

### onRun()?

> `optional` **onRun**: (`ctx`, `agent`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1160](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1160)

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`void`\>

***

### onStep()?

> `optional` **onStep**: (`ctx`, `agent`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1162](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1162)

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Promise`\<`void`\>

***

### outputs?

> `optional` **outputs**: [`Resolver`](./Resolver.md)\<`Record`\<`string`, `Omit`\<[`Output`](./Output.md)\<`any`, `any`, [`AnyContext`](./AnyContext.md), `any`\>, `"type"`\>\>, [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1196](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1196)

A record of output configurations for the context.

***

### render()?

> `optional` **render**: (`state`) => `string` \| `string`[] \| [`XMLElement`](./XMLElement.md) \| [`XMLElement`](./XMLElement.md)[] \| (`string` \| [`XMLElement`](./XMLElement.md))[]

Defined in: [packages/core/src/types.ts:1144](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1144)

Optional function to render memory state

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`string` \| `string`[] \| [`XMLElement`](./XMLElement.md) \| [`XMLElement`](./XMLElement.md)[] \| (`string` \| [`XMLElement`](./XMLElement.md))[]

***

### save()?

> `optional` **save**: (`state`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1141](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1141)

Optional function to save memory state

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`Promise`\<`void`\>

***

### schema?

> `optional` **schema**: `Schema`

Defined in: [packages/core/src/types.ts:1106](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1106)

Zod schema for validating context arguments

***

### setup()?

> `optional` **setup**: (`args`, `settings`, `agent`) => `Ctx` \| `Promise`\<`Ctx`\>

Defined in: [packages/core/src/types.ts:1111](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1111)

Setup function to initialize context data

#### Parameters

##### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>

##### settings

[`ContextSettings`](./ContextSettings.md)

##### agent

[`AnyAgent`](./AnyAgent.md)

#### Returns

`Ctx` \| `Promise`\<`Ctx`\>

***

### shouldContinue()?

> `optional` **shouldContinue**: (`ctx`) => `boolean`

Defined in: [packages/core/src/types.ts:1164](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1164)

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`boolean`

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:1104](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1104)

Unique type identifier for this context

## Methods

### setActions()

> **setActions**\<`TActions`\>(`actions`): `Context`\<`TMemory`, `Schema`, `Ctx`, `TActions`, `Events`\>

Defined in: [packages/core/src/types.ts:1008](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1008)

#### Type Parameters

##### TActions

`TActions` *extends* [`AnyActionWithContext`](./AnyActionWithContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `any`, `Events`\>\>[]

#### Parameters

##### actions

`TActions`

#### Returns

`Context`\<`TMemory`, `Schema`, `Ctx`, `TActions`, `Events`\>

#### Inherited from

`ContextConfigApi.setActions`

***

### setInputs()

> **setInputs**\<`TSchemas`\>(`inputs`): `Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

Defined in: [packages/core/src/types.ts:1015](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1015)

#### Type Parameters

##### TSchemas

`TSchemas` *extends* `Record`\<`string`, `Readonly`\<\{[`k`: `string`]: `$ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}\> \| `ZodString` \| `ZodObject`\<`$ZodLooseShape`, `$strip`\>\>

#### Parameters

##### inputs

\{ \[K in string \| number \| symbol\]: InputConfig\<TSchemas\[K\], Context\<TMemory, Schema, Ctx, Actions, Events\>, AnyAgent\> \}

#### Returns

`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

#### Inherited from

`ContextConfigApi.setInputs`

***

### setOutputs()

> **setOutputs**\<`TSchemas`\>(`outputs`): `Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

Defined in: [packages/core/src/types.ts:1024](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1024)

#### Type Parameters

##### TSchemas

`TSchemas` *extends* `Record`\<`string`, `Readonly`\<\{[`k`: `string`]: `$ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}\> \| `ZodString` \| `ZodObject`\<`$ZodLooseShape`, `$strip`\>\>

#### Parameters

##### outputs

\{ \[K in string \| number \| symbol\]: OutputConfig\<TSchemas\[K\], any, Context\<TMemory, Schema, Ctx, Actions, Events\>, AnyAgent\> \}

#### Returns

`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

#### Inherited from

`ContextConfigApi.setOutputs`

***

### use()

> **use**\<`Refs`\>(`composer`): `Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

Defined in: [packages/core/src/types.ts:1035](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/types.ts#L1035)

#### Type Parameters

##### Refs

`Refs` *extends* [`AnyContext`](./AnyContext.md)[]

#### Parameters

##### composer

`ContextComposer`\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>, `Refs`\>

#### Returns

`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>

#### Inherited from

`ContextConfigApi.use`
