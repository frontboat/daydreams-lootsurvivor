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
  return `Transaction executed successfully: ${JSON.stringify(
    result,
    null,
    2
  )}`;
};
