import type { ActionHandler } from "../../types";
import { fetchData } from "../providers";

export const graphqlAction: ActionHandler = async (action, chain) => {
  const { query, variables } = action.payload ?? {};
  const result = await fetchData(query, variables);
  const resultStr = [
    `query: ${query}`,
    `result: ${JSON.stringify(result, null, 2)}`,
  ].join("\n\n");
  return resultStr;
};
