---
title: "KnowledgeService"
---

[**@daydreamsai/core**](./api-reference.md)

***

[@daydreamsai/core](./api-reference.md) / KnowledgeService

# Class: KnowledgeService

Defined in: [packages/core/src/memory/services/knowledge-service.ts:26](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/services/knowledge-service.ts#L26)

Knowledge Service - handles entity and relationship extraction

This service is responsible for:
- LLM-powered entity and relationship extraction from text
- Schema-based knowledge graph construction
- Integration with memory storage

## Constructors

### Constructor

> **new KnowledgeService**(`memory`, `config`, `logger?`): `KnowledgeService`

Defined in: [packages/core/src/memory/services/knowledge-service.ts:29](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/services/knowledge-service.ts#L29)

#### Parameters

##### memory

[`Memory`](./Memory.md)

##### config

[`KnowledgeServiceConfig`](./KnowledgeServiceConfig.md)

##### logger?

`any`

#### Returns

`KnowledgeService`

## Methods

### extractKnowledge()

> **extractKnowledge**(`content`, `contextId?`, `userId?`): `Promise`\<\{ `confidence`: `number`; `entities`: `any`[]; `relationships`: `any`[]; \}\>

Defined in: [packages/core/src/memory/services/knowledge-service.ts:45](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/services/knowledge-service.ts#L45)

Extract entities and relationships from text content

#### Parameters

##### content

`string`

##### contextId?

`string`

##### userId?

`string`

#### Returns

`Promise`\<\{ `confidence`: `number`; `entities`: `any`[]; `relationships`: `any`[]; \}\>

***

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [packages/core/src/memory/services/knowledge-service.ts:159](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/services/knowledge-service.ts#L159)

Check if knowledge service is enabled and configured

#### Returns

`boolean`

***

### processAndStore()

> **processAndStore**(`content`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/memory/services/knowledge-service.ts:125](https://github.com/dojoengine/daydreams/blob/95678f46ea3908883ec80d853a28c9f23ca4f5c2/packages/core/src/memory/services/knowledge-service.ts#L125)

Process and store extracted knowledge

#### Parameters

##### content

`string`

##### options?

###### contextId?

`string`

###### scope?

`"context"` \| `"user"` \| `"global"`

###### userId?

`string`

#### Returns

`Promise`\<`void`\>
