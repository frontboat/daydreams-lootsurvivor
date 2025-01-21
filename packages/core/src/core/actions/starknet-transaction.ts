import type { ActionHandler } from "../../types";
import { executeStarknetTransaction } from "../providers";
import type { CoTTransaction } from "../../types";

export const starknetTransactionAction: ActionHandler = async (
  action,
  chain
) => {
  const result = await executeStarknetTransaction(
    action.payload as CoTTransaction
  );
  
  if (result instanceof Error) {
    throw result; // This will be caught by the error handling in ChainOfThought
  }

  return `Transaction executed successfully: ${JSON.stringify(
    result,
    null,
    2
  )}`;
};
