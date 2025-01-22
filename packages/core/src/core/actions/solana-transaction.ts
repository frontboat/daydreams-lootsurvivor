import type { ActionHandler, SolanaTransactionPayload } from "../../types";
import { executeSolanaTransaction } from "../providers";

export const solanaTransactionAction: ActionHandler = async (action, chain) => {
  const result = await executeSolanaTransaction(action.payload as SolanaTransactionPayload);
  
  if (result instanceof Error) {
    throw result; // This will be caught by the error handling in ChainOfThought
  }

  return `Solana transaction executed successfully: ${JSON.stringify(result, null, 2)}`;
}; 