# Providers

## Functions

### fetchGraphQL()

> **fetchGraphQL**\<`DataType`\>(`endpoint`, `query`, `variables`?): `Promise`\<`DataType` \| `Error`\>

Defined in: [packages/core/src/core/providers/api.ts:59](https://github.com/frontboat/daydreams-lootsurvivor/blob/d67b2f3397494c04d69d93c255da6bfe11dd2d6f/packages/core/src/core/providers/api.ts#L59)

A helper function to perform GraphQL queries.
- `endpoint`: the GraphQL endpoint URL.
- `query`: the GraphQL query string.
- `variables`: an optional variables object for the query.

#### Type Parameters

• **DataType** = `unknown`

#### Parameters

##### endpoint

`string`

##### query

`string`

##### variables?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`DataType` \| `Error`\>
