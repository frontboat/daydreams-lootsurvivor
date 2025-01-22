import { Account, type Call, CallData, RpcProvider } from "starknet";
import { Connection, Keypair } from "@solana/web3.js";
import { env } from "./env";
import type { 
  JupiterPriceParams, 
  JupiterTokenSearchParams, 
  JupiterRouteParams, 
  PriceResponse, 
  TokenInfo, 
  RouteResponse 
} from "../types";

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

export const executeStarknetRead = async (call: Call): Promise<any> => {
  try {
    call.calldata = CallData.compile(call.calldata || []);
    return await getStarknetProvider().callContract(call);
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
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

export const getSolanaConnection = () => {
  return new Connection(env.SOLANA_RPC_URL);
};

export const getSolanaKeypair = () => {
  return Keypair.fromSecretKey(
    Buffer.from(JSON.parse(env.SOLANA_PRIVATE_KEY))
  );
};

type SwapMode = "ExactIn" | "ExactOut";

interface JupiterQuoteParams {
  // Required parameters
  inputMint: string;
  outputMint: string;
  amount: string;
  
  // Optional parameters with defaults
  slippageBps?: number;  // Default: 50
  swapMode?: SwapMode;   // Default: ExactIn
  
  // Advanced options
  dexes?: string[];
  excludeDexes?: string[];
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  platformFeeBps?: number;
  maxAccounts?: number;
  
  // Auto slippage options
  autoSlippage?: boolean;
  maxAutoSlippageBps?: number;
  autoSlippageCollisionUsdValue?: number;
  restrictIntermediateTokens?: boolean;
}

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: SwapMode;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label?: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
      percent: number;
    };
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

interface JupiterSwapParams {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  wrapUnwrapSOL?: boolean;
}

export const fetchJupiterQuote = async (params: JupiterQuoteParams): Promise<JupiterQuoteResponse | Error> => {
  try {
    // Construct query parameters
    const queryParams: Record<string, string> = {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps?.toString() || "50",
      swapMode: params.swapMode || "ExactIn"
    };

    // Add optional parameters if they exist
    if (params.onlyDirectRoutes !== undefined) {
      queryParams.onlyDirectRoutes = params.onlyDirectRoutes.toString();
    }
    if (params.asLegacyTransaction !== undefined) {
      queryParams.asLegacyTransaction = params.asLegacyTransaction.toString();
    }
    if (params.platformFeeBps !== undefined) {
      queryParams.platformFeeBps = params.platformFeeBps.toString();
    }
    if (params.maxAccounts !== undefined) {
      queryParams.maxAccounts = params.maxAccounts.toString();
    }
    if (params.autoSlippage !== undefined) {
      queryParams.autoSlippage = params.autoSlippage.toString();
    }
    if (params.maxAutoSlippageBps !== undefined) {
      queryParams.maxAutoSlippageBps = params.maxAutoSlippageBps.toString();
    }
    if (params.autoSlippageCollisionUsdValue !== undefined) {
      queryParams.autoSlippageCollisionUsdValue = params.autoSlippageCollisionUsdValue.toString();
    }
    if (params.restrictIntermediateTokens !== undefined) {
      queryParams.restrictIntermediateTokens = params.restrictIntermediateTokens.toString();
    }
    if (params.dexes?.length) {
      queryParams.dexes = params.dexes.join(',');
    }
    if (params.excludeDexes?.length) {
      queryParams.excludeDexes = params.excludeDexes.join(',');
    }

    const response = await fetch(
      `${env.JUPITER_API_URL}/quote?` + new URLSearchParams(queryParams)
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as JupiterQuoteResponse;
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
};

export const fetchJupiterSwap = async (params: JupiterSwapParams) => {
  try {
    const response = await fetch(`${env.JUPITER_API_URL}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: params.quoteResponse,
        userPublicKey: params.userPublicKey,
        wrapUnwrapSOL: params.wrapUnwrapSOL ?? true
      })
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
};

export async function fetchJupiterPrices(
  params: JupiterPriceParams
): Promise<PriceResponse | Error> {
  try {
    const queryParams = new URLSearchParams();
    if (params.ids) {
      queryParams.append("ids", params.ids.join(","));
    }
    if (params.vsToken) {
      queryParams.append("vsToken", params.vsToken);
    }
    if (params.vsAmount) {
      queryParams.append("vsAmount", params.vsAmount.toString());
    }
    // Add showExtraInfo if vsToken is not specified
    if (!params.vsToken) {
      queryParams.append("showExtraInfo", "true");
    }

    const response = await fetch(`${env.JUPITER_API_URL}/price?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Price API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as PriceResponse;
  } catch (error) {
    return error instanceof Error ? error : new Error("Failed to fetch prices");
  }
}

export async function searchJupiterTokens(
  params: JupiterTokenSearchParams
): Promise<TokenInfo[] | Error> {
  try {
    const queryParams = new URLSearchParams({
      query: params.query,
      ...(params.limit && { limit: params.limit.toString() })
    });

    const response = await fetch(`${env.JUPITER_API_URL}/tokens/search?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Token search error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return error instanceof Error ? error : new Error("Failed to search tokens");
  }
}

export async function fetchJupiterRoutes(
  params: JupiterRouteParams
): Promise<RouteResponse | Error> {
  try {
    const queryParams = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      ...(params.slippageBps && { slippageBps: params.slippageBps.toString() }),
      ...(params.onlyDirectRoutes && { onlyDirectRoutes: params.onlyDirectRoutes.toString() }),
      ...(params.restrictIntermediateTokens && { restrictIntermediateTokens: params.restrictIntermediateTokens.toString() })
    });

    const response = await fetch(`${env.JUPITER_API_URL}/routes?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Route API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return error instanceof Error ? error : new Error("Failed to fetch routes");
  }
}