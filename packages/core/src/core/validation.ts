import type { CoTTransaction, LLMStructuredResponse } from "../types";

import type { JSONSchemaType } from "ajv";
import Ajv from "ajv";

export const queryValidator = (
  response: any
): response is LLMStructuredResponse => {
  if (!response || typeof response !== "object") return false;
  if (!Array.isArray(response.actions)) return false;

  for (const action of response.actions) {
    if (!action.type || !action.payload) return false;
    if (!["GRAPHQL_FETCH", "EXECUTE_TRANSACTION"].includes(action.type))
      return false;
  }

  return true;
};

export const transactionValidator = (
  transaction: any
): transaction is CoTTransaction => {
  if (!transaction || typeof transaction !== "object") return false;
  if (typeof transaction.contractAddress !== "string") return false;
  if (typeof transaction.entrypoint !== "string") return false;
  if (!Array.isArray(transaction.calldata)) return false;
  return true;
};

interface GraphQLFetchPayload {
  query: string;
  variables?: Record<string, any>;
}

export const graphqlFetchSchema: JSONSchemaType<GraphQLFetchPayload> = {
  type: "object",
  properties: {
    query: { type: "string" },
    variables: {
      type: "object",
      additionalProperties: true,
      nullable: true,
    },
  },
  required: ["query"],
  additionalProperties: false,
};

interface StarknetTransactionPayload {
  contractAddress: string;
  entrypoint: string;
  calldata: any[];
}

export const starknetTransactionSchema: JSONSchemaType<StarknetTransactionPayload> =
  {
    type: "object",
    properties: {
      contractAddress: { type: "string" },
      entrypoint: { type: "string" },
      calldata: {
        type: "array",
        items: {
          oneOf: [
            { type: "number" },
            { type: "string" },
            {
              type: "array",
              items: {
                oneOf: [{ type: "number" }, { type: "string" }],
              },
            },
          ],
        },
      },
    },
    required: ["contractAddress", "entrypoint", "calldata"],
    additionalProperties: false,
  };
