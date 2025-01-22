import type { CoTTransaction, LLMStructuredResponse, SolanaTransactionPayload, JupiterQuoteParams, JupiterSwapParams, JupiterPriceParams, JupiterTokenSearchParams, JupiterRouteParams } from "../types";

import type { JSONSchemaType } from "ajv";
import Ajv from "ajv";

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

export const starknetTransactionSchema: JSONSchemaType<StarknetTransactionPayload> = {
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

interface StarknetReadPayload {
  contractAddress: string;
  entrypoint: string;
  calldata: any[];
}

export const starknetReadSchema: JSONSchemaType<StarknetReadPayload> = {
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

export const solanaTransactionSchema: JSONSchemaType<SolanaTransactionPayload> = {
  type: "object",
  properties: {
    programId: { type: "string" },
    instruction: { type: "string" },
    data: {
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
    accounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pubkey: { type: "string" },
          isSigner: { type: "boolean" },
          isWritable: { type: "boolean" }
        },
        required: ["pubkey", "isSigner", "isWritable"],
        additionalProperties: false
      }
    }
  },
  required: ["programId", "instruction", "data", "accounts"],
  additionalProperties: false,
};

export const jupiterQuoteSchema: JSONSchemaType<JupiterQuoteParams> = {
  type: "object",
  properties: {
    inputMint: { type: "string" },
    outputMint: { type: "string" },
    amount: { type: "string" },
    slippageBps: { type: "number", nullable: true },
    swapMode: { type: "string", nullable: true },
    dexes: { 
      type: "array",
      items: { type: "string" },
      nullable: true 
    },
    excludeDexes: { 
      type: "array",
      items: { type: "string" },
      nullable: true 
    },
    onlyDirectRoutes: { type: "boolean", nullable: true },
    asLegacyTransaction: { type: "boolean", nullable: true },
    platformFeeBps: { type: "number", nullable: true },
    maxAccounts: { type: "number", nullable: true },
    autoSlippage: { type: "boolean", nullable: true },
    maxAutoSlippageBps: { type: "number", nullable: true },
    autoSlippageCollisionUsdValue: { type: "number", nullable: true },
    restrictIntermediateTokens: { type: "boolean", nullable: true }
  },
  required: ["inputMint", "outputMint", "amount"],
  additionalProperties: false
};

export const jupiterSwapSchema: JSONSchemaType<JupiterSwapParams> = {
  type: "object",
  properties: {
    quoteResponse: { 
      type: "object",
      required: [
        "inputMint",
        "inAmount",
        "outputMint",
        "outAmount",
        "otherAmountThreshold",
        "swapMode",
        "slippageBps",
        "priceImpactPct",
        "routePlan"
      ],
      properties: {
        inputMint: { type: "string" },
        inAmount: { type: "string" },
        outputMint: { type: "string" },
        outAmount: { type: "string" },
        otherAmountThreshold: { type: "string" },
        swapMode: { type: "string" },
        slippageBps: { type: "number" },
        platformFee: {
          type: "object",
          nullable: true,
          properties: {
            amount: { type: "string" },
            feeBps: { type: "number" }
          },
          required: ["amount", "feeBps"]
        },
        priceImpactPct: { type: "string" },
        routePlan: {
          type: "array",
          items: {
            type: "object",
            properties: {
              swapInfo: {
                type: "object",
                properties: {
                  ammKey: { type: "string" },
                  label: { type: "string", nullable: true },
                  inputMint: { type: "string" },
                  outputMint: { type: "string" },
                  inAmount: { type: "string" },
                  outAmount: { type: "string" },
                  feeAmount: { type: "string" },
                  feeMint: { type: "string" },
                  percent: { type: "number" }
                },
                required: [
                  "ammKey",
                  "inputMint",
                  "outputMint",
                  "inAmount",
                  "outAmount",
                  "feeAmount",
                  "feeMint",
                  "percent"
                ]
              }
            },
            required: ["swapInfo"]
          }
        },
        contextSlot: { type: "number", nullable: true },
        timeTaken: { type: "number", nullable: true }
      }
    },
    userPublicKey: { type: "string" },
    wrapUnwrapSOL: { type: "boolean", nullable: true }
  },
  required: ["quoteResponse", "userPublicKey"],
  additionalProperties: false
};

export const jupiterPriceSchema: JSONSchemaType<JupiterPriceParams> = {
  type: "object",
  properties: {
    ids: {
      type: "array",
      items: { type: "string" },
      nullable: true
    },
    vsToken: { type: "string", nullable: true },
    vsAmount: { type: "number", nullable: true }
  },
  required: []
};

export const jupiterTokenSearchSchema: JSONSchemaType<JupiterTokenSearchParams> = {
  type: "object",
  properties: {
    query: { type: "string" },
    limit: { type: "number", nullable: true }
  },
  required: ["query"]
};

export const jupiterRouteSchema: JSONSchemaType<JupiterRouteParams> = {
  type: "object",
  properties: {
    inputMint: { type: "string" },
    outputMint: { type: "string" },
    amount: { type: "string" },
    slippageBps: { type: "number", nullable: true },
    onlyDirectRoutes: { type: "boolean", nullable: true },
    restrictIntermediateTokens: { type: "boolean", nullable: true }
  },
  required: ["inputMint", "outputMint", "amount"]
};

export const solanaBalanceSchema: JSONSchemaType<{walletAddress: string}> = {
  type: "object",
  properties: {
    walletAddress: { type: "string" }
  },
  required: ["walletAddress"],
  additionalProperties: false
};

// Initialize Ajv instance
const ajv = new Ajv();
const validateGraphQLFetch = ajv.compile(graphqlFetchSchema);
const validateStarknetTransaction = ajv.compile(starknetTransactionSchema);
const validateStarknetRead = ajv.compile(starknetReadSchema);
const validateSolanaTransaction = ajv.compile(solanaTransactionSchema);
const validateJupiterQuote = ajv.compile(jupiterQuoteSchema);
const validateJupiterSwap = ajv.compile(jupiterSwapSchema);

export const queryValidator = (
  response: any
): response is LLMStructuredResponse => {
  if (!response || typeof response !== "object") return false;
  if (!Array.isArray(response.actions)) return false;

  for (const action of response.actions) {
    if (!action.type || !action.payload) return false;
    
    switch (action.type) {
      case "GRAPHQL_FETCH":
        if (!validateGraphQLFetch(action.payload)) return false;
        break;
      case "EXECUTE_TRANSACTION":
        if (!validateStarknetTransaction(action.payload)) return false;
        break;
      case "READ_CONTRACT":
        if (!validateStarknetRead(action.payload)) return false;
        break;
      case "SOLANA_TRANSACTION":
        if (!validateSolanaTransaction(action.payload)) return false;
        break;
      case "JUPITER_QUOTE":
        if (!validateJupiterQuote(action.payload)) return false;
        break;
      case "JUPITER_SWAP":
        if (!validateJupiterSwap(action.payload)) return false;
        break;
      default:
        return false;
    }
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