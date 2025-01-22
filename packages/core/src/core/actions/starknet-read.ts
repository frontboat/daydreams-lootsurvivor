import type { ActionHandler } from "../../types";
import { executeStarknetRead } from "../providers";
import type { CoTTransaction } from "../../types";

export const starknetReadAction: ActionHandler = async (action, chain) => {
  const result = await executeStarknetRead(action.payload as CoTTransaction);
  
  if (result instanceof Error) {
    throw result; // This will be caught by the error handling in ChainOfThought
  }

  return `Contract read executed successfully: ${JSON.stringify(result, null, 2)}`;
}; 