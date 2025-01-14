import type { CoTTransaction, LLMStructuredResponse } from "../types";

export const queryValidator = (
  response: any
): response is LLMStructuredResponse => {
  if (!response || typeof response !== "object") return false;
  if (!Array.isArray(response.actions)) return false;

  for (const action of response.actions) {
    if (!action.type || !action.payload) return false;
    if (!["GRAPHQL_FETCH", "EXECUTE_TRANSACTION", "READ_CONTRACT"].includes(action.type))
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
