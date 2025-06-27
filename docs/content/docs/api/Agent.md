---
title: "Agent"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / Agent

# Interface: Agent\<TContext\>

Defined in: [packages/core/src/types.ts:740](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L740)

Represents an agent with various configurations and methods for handling contexts, inputs, outputs, and more.

## Template

The type of memory used by the agent.

## Extends

- `AgentDef`\<`TContext`\>

## Type Parameters

### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

The type of context used by the agent.

## Properties

### actions

> **actions**: [`Action`](./Action.md)\<`any`, `any`, `unknown`, [`AnyContext`](./AnyContext.md), `Agent`\<`TContext`\>, [`ActionState`](./ActionState.md)\<`any`\>\>[]

Defined in: [packages/core/src/types.ts:706](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L706)

An array of actions available to the agent.

#### Inherited from

`AgentDef.actions`

***

### container

> **container**: `Container`

Defined in: [packages/core/src/types.ts:638](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L638)

The container used by the agent.

#### Inherited from

`AgentDef.container`

***

### context?

> `optional` **context**: `TContext`

Defined in: [packages/core/src/types.ts:628](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L628)

The current context of the agent.

#### Inherited from

`AgentDef.context`

***

### debugger

> **debugger**: [`Debugger`](./Debugger.md)

Defined in: [packages/core/src/types.ts:633](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L633)

Debugger function for the agent.

#### Inherited from

`AgentDef.debugger`

***

### emit()

> **emit**: (...`args`) => `void`

Defined in: [packages/core/src/types.ts:750](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L750)

Emits an event with the provided arguments.

#### Parameters

##### args

...`any`[]

Arguments to pass to the event handler.

#### Returns

`void`

***

### events

> **events**: `Record`\<`string`, `z.ZodObject`\>

Defined in: [packages/core/src/types.ts:696](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L696)

A record of event schemas for the agent.

#### Inherited from

`AgentDef.events`

***

### experts

> **experts**: `Record`\<`string`, [`ExpertConfig`](./ExpertConfig.md)\>

Defined in: [packages/core/src/types.ts:701](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L701)

A record of expert configurations for the agent.

#### Inherited from

`AgentDef.experts`

***

### exportTrainingData?

> `optional` **exportTrainingData**: `boolean`

Defined in: [packages/core/src/types.ts:718](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L718)

Whether to export training data for episodes

#### Inherited from

`AgentDef.exportTrainingData`

***

### inputs

> **inputs**: `Record`\<`string`, [`InputConfig`](./InputConfig.md)\<`any`, [`AnyContext`](./AnyContext.md), `Agent`\<`TContext`\>\>\>

Defined in: [packages/core/src/types.ts:686](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L686)

A record of input configurations for the agent.

#### Inherited from

`AgentDef.inputs`

***

### logger

> **logger**: `Logger`

Defined in: [packages/core/src/types.ts:618](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L618)

#### Inherited from

`AgentDef.logger`

***

### memory

> **memory**: [`MemorySystem`](./MemorySystem.md)

Defined in: [packages/core/src/types.ts:623](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L623)

The memory store and vector store used by the agent.

#### Inherited from

`AgentDef.memory`

***

### model?

> `optional` **model**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:658](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L658)

The primary language model used by the agent.

#### Inherited from

`AgentDef.model`

***

### modelSettings?

> `optional` **modelSettings**: `object`

Defined in: [packages/core/src/types.ts:673](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L673)

Model settings for the agent.

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

#### Inherited from

`AgentDef.modelSettings`

***

### outputs

> **outputs**: `Record`\<`string`, `Omit`\<[`Output`](./Output.md)\<`any`, `any`, `TContext`, `any`\>, `"type"`\>\>

Defined in: [packages/core/src/types.ts:691](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L691)

A record of output configurations for the agent.

#### Inherited from

`AgentDef.outputs`

***

### reasoningModel?

> `optional` **reasoningModel**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:663](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L663)

The reasoning model used by the agent, if any.

#### Inherited from

`AgentDef.reasoningModel`

***

### registry

> **registry**: [`Registry`](./Registry.md)

Defined in: [packages/core/src/types.ts:742](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L742)

***

### requestTracker?

> `optional` **requestTracker**: `RequestTracker`

Defined in: [packages/core/src/types.ts:648](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L648)

Request tracker for monitoring model usage and performance.

#### Inherited from

`AgentDef.requestTracker`

***

### requestTrackingConfig?

> `optional` **requestTrackingConfig**: `Partial`\<`RequestTrackingConfig`\>

Defined in: [packages/core/src/types.ts:653](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L653)

Configuration for request tracking.

#### Inherited from

`AgentDef.requestTrackingConfig`

***

### run()

> **run**: \<`TContext`, `SubContextRefs`\>(`opts`) => `Promise`\<[`AnyRef`](./AnyRef.md)[]\>

Defined in: [packages/core/src/types.ts:757](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L757)

Runs the agent with the provided options.

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

##### SubContextRefs

`SubContextRefs` *extends* [`AnyContext`](./AnyContext.md)[] = [`AnyContext`](./AnyContext.md)[]

#### Parameters

##### opts

Options for running the agent.

###### abortSignal?

`AbortSignal`

###### actions?

[`AnyAction`](./AnyAction.md)[]

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

###### chain?

[`Log`](./Log.md)[]

###### context

`TContext`

###### contexts?

[`ContextRefArray`](./ContextRefArray.md)\<`SubContextRefs`\>

###### handlers?

`Partial`\<[`Handlers`](./Handlers.md)\>

###### model?

[`LanguageModelV1`](./LanguageModelV1.md)

###### modelSettings?

\{[`key`: `string`]: `any`; `maxTokens?`: `number`; `providerOptions?`: `Record`\<`string`, `any`\>; `stopSequences?`: `string`[]; `temperature?`: `number`; `topK?`: `number`; `topP?`: `number`; \}

###### modelSettings.maxTokens?

`number`

###### modelSettings.providerOptions?

`Record`\<`string`, `any`\>

###### modelSettings.stopSequences?

`string`[]

###### modelSettings.temperature?

`number`

###### modelSettings.topK?

`number`

###### modelSettings.topP?

`number`

###### outputs?

`Record`\<`string`, `Omit`\<[`Output`](./Output.md)\<`any`, `any`, `TContext`, `any`\>, `"type"`\>\>

###### requestContext?

`RequestContext`

#### Returns

`Promise`\<[`AnyRef`](./AnyRef.md)[]\>

A promise that resolves to an array of logs.

***

### send()

> **send**: \<`SContext`, `SubContextRefs`\>(`opts`) => `Promise`\<[`AnyRef`](./AnyRef.md)[]\>

Defined in: [packages/core/src/types.ts:787](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L787)

Sends an input to the agent with the provided options.

#### Type Parameters

##### SContext

`SContext` *extends* [`AnyContext`](./AnyContext.md)

##### SubContextRefs

`SubContextRefs` *extends* [`AnyContext`](./AnyContext.md)[] = [`AnyContext`](./AnyContext.md)[]

#### Parameters

##### opts

Options for sending input to the agent.

###### abortSignal?

`AbortSignal`

###### actions?

[`AnyAction`](./AnyAction.md)[]

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`SContext`\[`"schema"`\]\>

###### chain?

[`Log`](./Log.md)[]

###### context

`SContext`

###### contexts?

[`ContextRefArray`](./ContextRefArray.md)\<`SubContextRefs`\>

###### handlers?

`Partial`\<[`Handlers`](./Handlers.md)\>

###### input

\{ `data`: `any`; `type`: `string`; \}

###### input.data

`any`

###### input.type

`string`

###### model?

[`LanguageModelV1`](./LanguageModelV1.md)

###### outputs?

`Record`\<`string`, `Omit`\<[`Output`](./Output.md)\<`any`, `any`, `SContext`, `any`\>, `"type"`\>\>

#### Returns

`Promise`\<[`AnyRef`](./AnyRef.md)[]\>

A promise that resolves to an array of logs.

***

### taskRunner

> **taskRunner**: `TaskRunner`

Defined in: [packages/core/src/types.ts:643](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L643)

The task runner used by the agent.

#### Inherited from

`AgentDef.taskRunner`

***

### trainingDataPath?

> `optional` **trainingDataPath**: `string`

Defined in: [packages/core/src/types.ts:723](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L723)

Path to save training data

#### Inherited from

`AgentDef.trainingDataPath`

***

### vectorModel?

> `optional` **vectorModel**: [`LanguageModelV1`](./LanguageModelV1.md)

Defined in: [packages/core/src/types.ts:668](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L668)

The vector model used by the agent, if any.

#### Inherited from

`AgentDef.vectorModel`

## Methods

### \_\_subscribeChunk()

> **\_\_subscribeChunk**(`contextId`, `handler`): () => `void`

Defined in: [packages/core/src/types.ts:883](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L883)

#### Parameters

##### contextId

`string`

##### handler

(`log`) => `void`

#### Returns

> (): `void`

##### Returns

`void`

***

### deleteContext()

> **deleteContext**(`contextId`): `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:876](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L876)

#### Parameters

##### contextId

`string`

#### Returns

`Promise`\<`void`\>

***

### evaluator()

> **evaluator**\<`SContext`\>(`ctx`): `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:808](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L808)

Evaluates the provided context.

#### Type Parameters

##### SContext

`SContext` *extends* [`AnyContext`](./AnyContext.md)

#### Parameters

##### ctx

[`AgentContext`](./AgentContext.md)\<`SContext`\>

The context to evaluate.

#### Returns

`Promise`\<`void`\>

A promise that resolves when evaluation is complete.

***

### getAgentContext()

> **getAgentContext**(): `Promise`\<`undefined` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

Defined in: [packages/core/src/types.ts:843](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L843)

#### Returns

`Promise`\<`undefined` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

***

### getContext()

> **getContext**\<`TContext`\>(`params`): `Promise`\<[`ContextState`](./ContextState.md)\<`TContext`\>\>

Defined in: [packages/core/src/types.ts:850](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L850)

Retrieves the state of a given context and arguments.

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

#### Parameters

##### params

Parameters for retrieving the context state.

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

###### context

`TContext`

#### Returns

`Promise`\<[`ContextState`](./ContextState.md)\<`TContext`\>\>

A promise that resolves to the context state.

***

### getContextById()

> **getContextById**\<`TContext`\>(`id`): `Promise`\<`null` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

Defined in: [packages/core/src/types.ts:865](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L865)

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`null` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

***

### getContextId()

> **getContextId**\<`TContext`\>(`params`): `string`

Defined in: [packages/core/src/types.ts:838](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L838)

Retrieves the ID for a given context and arguments.

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md) = [`AnyContext`](./AnyContext.md)

#### Parameters

##### params

Parameters for retrieving the context ID.

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

###### context

`TContext`

#### Returns

`string`

The context ID.

***

### getContexts()

> **getContexts**(): `Promise`\<`object`[]\>

Defined in: [packages/core/src/types.ts:829](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L829)

Retrieves the contexts managed by the agent.

#### Returns

`Promise`\<`object`[]\>

A promise that resolves to an array of context objects.

***

### getWorkingMemory()

> **getWorkingMemory**(`contextId`): `Promise`\<[`WorkingMemory`](./WorkingMemory.md)\>

Defined in: [packages/core/src/types.ts:874](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L874)

Retrieves the working memory for a given context ID.

#### Parameters

##### contextId

`string`

The ID of the context.

#### Returns

`Promise`\<[`WorkingMemory`](./WorkingMemory.md)\>

A promise that resolves to the working memory.

***

### isBooted()

> **isBooted**(): `boolean`

Defined in: [packages/core/src/types.ts:744](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L744)

#### Returns

`boolean`

***

### loadContext()

> **loadContext**\<`TContext`\>(`params`): `Promise`\<`null` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

Defined in: [packages/core/src/types.ts:855](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L855)

#### Type Parameters

##### TContext

`TContext` *extends* [`AnyContext`](./AnyContext.md)

#### Parameters

##### params

###### args

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

###### context

`TContext`

#### Returns

`Promise`\<`null` \| [`ContextState`](./ContextState.md)\<`TContext`\>\>

***

### saveContext()

> **saveContext**(`state`, `workingMemory?`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/types.ts:860](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L860)

#### Parameters

##### state

[`ContextState`](./ContextState.md)\<[`AnyContext`](./AnyContext.md)\>

##### workingMemory?

[`WorkingMemory`](./WorkingMemory.md)

#### Returns

`Promise`\<`boolean`\>

***

### start()

> **start**(`args?`): `Promise`\<`Agent`\<`TContext`\>\>

Defined in: [packages/core/src/types.ts:817](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L817)

Starts the agent with the provided arguments.

#### Parameters

##### args?

[`InferSchemaArguments`](./InferSchemaArguments.md)\<`TContext`\[`"schema"`\]\>

Arguments to pass to the agent on start.

#### Returns

`Promise`\<`Agent`\<`TContext`\>\>

A promise that resolves to the agent instance.

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [packages/core/src/types.ts:823](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L823)

Stops the agent.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the agent is stopped.

***

### subscribeContext()

> **subscribeContext**(`contextId`, `handler`): () => `void`

Defined in: [packages/core/src/types.ts:878](https://github.com/dojoengine/daydreams/blob/bbf75946e0d6d99fbdde4cebb2f8a4e8926724f1/packages/core/src/types.ts#L878)

#### Parameters

##### contextId

`string`

##### handler

(`log`, `done`) => `void`

#### Returns

> (): `void`

##### Returns

`void`
