---
title: "Context"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Context

# Interface: Context\<TMemory, Schema, Ctx, Actions, Events\>

Defined in: [packages/core/src/types.ts:1106](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1106)

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

Defined in: [packages/core/src/types.ts:1214](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1214)

***

### \_\_templateResolvers?

> `optional` **\_\_templateResolvers**: `Record`\<`string`, [`TemplateResolver`](./TemplateResolver.md)\<[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\> & [`ContextStateApi`](./ContextStateApi.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>\>

Defined in: [packages/core/src/types.ts:1216](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1216)

***

### actions?

> `optional` **actions**: [`Resolver`](./Resolver.md)\<[`Action`](./Action.md)\<[`ActionSchema`](./ActionSchema.md), `any`, `unknown`, [`AnyContext`](./AnyContext.md), [`AnyAgent`](./AnyAgent.md), [`ActionState`](./ActionState.md)\>[], [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1194](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1194)

***

### create()?

> `optional` **create**: (`params`, `agent`) => `TMemory` \| `Promise`\<`TMemory`\>

Defined in: [packages/core/src/types.ts:1131](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1131)

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

Defined in: [packages/core/src/types.ts:1146](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1146)

Optional description of this context

***

### episodeHooks?

> `optional` **episodeHooks**: [`EpisodeHooks`](./EpisodeHooks.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

Defined in: [packages/core/src/types.ts:1192](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1192)

Episode detection and creation hooks for this context

***

### events?

> `optional` **events**: [`Resolver`](./Resolver.md)\<`Events`, [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1196](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1196)

***

### inputs?

> `optional` **inputs**: [`Resolver`](./Resolver.md)\<`Record`\<`string`, [`InputConfig`](./InputConfig.md)\<`any`, `any`, [`AnyAgent`](./AnyAgent.md)\>\>, [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1201](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1201)

A record of input configurations for the context.

***

### instructions?

> `optional` **instructions**: [`Resolver`](./Resolver.md)\<[`Instruction`](./Instruction.md), [`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>\>

Defined in: [packages/core/src/types.ts:1143](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1143)

Optional instructions for this context

***

### key()?

> `optional` **key**: (`args`) => `string`

Defined in: [packages/core/src/types.ts:1121](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1121)

Function to generate a unique key from context arguments

#### Parameters

##### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`Schema`\>

#### Returns

`string`

***

### load()?

> `optional` **load**: (`id`, `params`) => `Promise`\<`null` \| `TMemory`\>

Defined in: [packages/core/src/types.ts:1149](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1149)

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

Defined in: [packages/core/src/types.ts:1185](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1185)

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

Defined in: [packages/core/src/types.ts:1187](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1187)

***

### maxWorkingMemorySize?

> `optional` **maxWorkingMemorySize**: `number`

Defined in: [packages/core/src/types.ts:1189](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1189)

***

### model?

> `optional` **model**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:1161](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1161)

***

### modelSettings?

> `optional` **modelSettings**: `object`

Defined in: [packages/core/src/types.ts:1163](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1163)

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

Defined in: [packages/core/src/types.ts:1179](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1179)

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

Defined in: [packages/core/src/types.ts:1173](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1173)

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

Defined in: [packages/core/src/types.ts:1175](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1175)

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

Defined in: [packages/core/src/types.ts:1209](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1209)

A record of output configurations for the context.

***

### render()?

> `optional` **render**: (`state`) => `string` \| `string`[] \| [`XMLElement`](./XMLElement.md) \| [`XMLElement`](./XMLElement.md)[] \| (`string` \| [`XMLElement`](./XMLElement.md))[]

Defined in: [packages/core/src/types.ts:1157](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1157)

Optional function to render memory state

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`string` \| `string`[] \| [`XMLElement`](./XMLElement.md) \| [`XMLElement`](./XMLElement.md)[] \| (`string` \| [`XMLElement`](./XMLElement.md))[]

***

### save()?

> `optional` **save**: (`state`) => `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:1154](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1154)

Optional function to save memory state

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`Promise`\<`void`\>

***

### schema?

> `optional` **schema**: `Schema`

Defined in: [packages/core/src/types.ts:1119](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1119)

Zod schema for validating context arguments

***

### setup()?

> `optional` **setup**: (`args`, `settings`, `agent`) => `Ctx` \| `Promise`\<`Ctx`\>

Defined in: [packages/core/src/types.ts:1124](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1124)

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

Defined in: [packages/core/src/types.ts:1177](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1177)

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`Context`\<`TMemory`, `Schema`, `Ctx`, `Actions`, `Events`\>\>

#### Returns

`boolean`

***

### type

> **type**: `string`

Defined in: [packages/core/src/types.ts:1117](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1117)

Unique type identifier for this context

## Methods

### setActions()

> **setActions**\<`TActions`\>(`actions`): `Context`\<`TMemory`, `Schema`, `Ctx`, `TActions`, `Events`\>

Defined in: [packages/core/src/types.ts:1021](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1021)

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

Defined in: [packages/core/src/types.ts:1028](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1028)

#### Type Parameters

##### TSchemas

`TSchemas` *extends* `Record`\<`string`, `Readonly`\<\{[`k`: `string`]: `$ZodType`\<`unknown`, `unknown`\>; \}\> \| `ZodString` \| `ZodObject`\<`$ZodLooseShape`, `$ZodObjectConfig`\>\>

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

Defined in: [packages/core/src/types.ts:1037](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1037)

#### Type Parameters

##### TSchemas

`TSchemas` *extends* `Record`\<`string`, `Readonly`\<\{[`k`: `string`]: `$ZodType`\<`unknown`, `unknown`\>; \}\> \| `ZodString` \| `ZodObject`\<`$ZodLooseShape`, `$ZodObjectConfig`\>\>

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

Defined in: [packages/core/src/types.ts:1048](https://github.com/dojoengine/daydreams/blob/cade502c379b7b9e103832026447c86310638fce/packages/core/src/types.ts#L1048)

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
