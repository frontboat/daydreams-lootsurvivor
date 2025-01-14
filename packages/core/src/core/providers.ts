import { Account, type Call, CallData, RpcProvider } from "starknet";
import { env } from "./env";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

async function queryGraphQL<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T | Error> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors) {
      return new Error(result.errors[0].message);
    }

    if (!result.data) {
      return new Error("No data returned from GraphQL query");
    }

    return result.data;
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}

export const fetchData = async (
  query: string,
  variables: Record<string, unknown>
) => {
  return await queryGraphQL<string>(env.GRAPHQL_URL + "/graphql", query, {
    variables,
  });
};

export const getStarknetProvider = () => {
  return new RpcProvider({
    nodeUrl: env.STARKNET_RPC_URL,
  });
};

export const getStarknetAccount = () => {
  return new Account(
    getStarknetProvider(),
    env.STARKNET_ADDRESS,
    env.STARKNET_PRIVATE_KEY
  );
};

export const executeStarknetTransaction = async (call: Call): Promise<any> => {
  try {
    call.calldata = CallData.compile(call.calldata || []);

    const { transaction_hash } = await getStarknetAccount().execute(call);

    return await getStarknetAccount().waitForTransaction(transaction_hash, {
      retryInterval: 1000,
    });
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
};

export const executeStarknetRead = async (call: Call): Promise<any> => {
  try {
    call.calldata = CallData.compile(call.calldata || []);
    return await getStarknetProvider().callContract(call);
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
};
