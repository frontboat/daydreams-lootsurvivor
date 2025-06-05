import { action, type ActionSchema } from "@daydreamsai/core";
import { StarknetChain } from "@daydreamsai/defai";
import type { Agent } from "@daydreamsai/core";
import { z } from "zod";
import { executeSwap as executeAvnuSwap, fetchQuotes } from "@avnu/avnu-sdk";

import { env } from "../../env";
import { getAllTokensFromAPI } from "../utils/ponziland_api";

export const swap = (chain: StarknetChain) =>
  action({
    name: "swap",
    description:
      "Swap tokens using AVNU SDK. Always make sure to check your balances first and use the correct token addresses. Remeber you don't need to already own any of the token you are buying, just the token you are selling.",
    schema: z.object({
      selling_address: z.string().describe("Token address you are selling"),
      buying_address: z.string().describe("Token address you are buying"),
      amount: z
        .string()
        .describe(
          "Amount of token to sell. Remeber 1 token = 10^18. Always use the scaled up value. This amount should NEVER be <10^18, unles you are swapping less than a single token."
        ),
    }),
    async handler(
      data: { selling_address: string; buying_address: string; amount: string },
      ctx: any,
      agent: Agent
    ) {
      let tokens = await getAllTokensFromAPI();

      if (data.selling_address == data.buying_address) {
        throw new Error("You cannot swap the same token");
      }

      let token_selling = tokens.find(
        (t) => BigInt(t.address) == BigInt(data.selling_address)
      );
      let token_buying = tokens.find(
        (t) => BigInt(t.address) == BigInt(data.buying_address)
      );

      if (!token_selling || !token_buying) {
        throw new Error("Token not found");
      }

      try {
        // Convert amount to proper format (assuming 18 decimals for most tokens)
        const sellAmount = BigInt(data.amount);
        let pool = token_buying.best_pool;

        if (!pool) {
          pool = {
            token0: token_selling.address,
            token1: token_buying.address,
          };
        }

        const quoteParams = {
          sellTokenAddress: pool.token1,
          buyTokenAddress: pool.token0,
          sellAmount: "0x" + sellAmount.toString(16),
        };

        console.log("Fetching quotes with params:", quoteParams);

        let baseUrl = "https://api.avnu.fi";
        // Fetch quotes from AVNU
        const quotes = await fetch(
          `${baseUrl}/swap/v2/quotes?sellTokenAddress=${quoteParams.sellTokenAddress}&buyTokenAddress=${quoteParams.buyTokenAddress}&sellAmount=${quoteParams.sellAmount}`
        );

        let res = await quotes.json();
        // Use the best quote (first one)
        const bestQuote = res[0];

        // Execute the swap using AVNU SDK with the chain's account
        const swapResult = await executeAvnuSwap(
          chain.account,
          bestQuote,
          {},
          { baseUrl: baseUrl }
        );

        const result = {
          success: true,
          transaction_hash: swapResult.transaction_hash,
          sell_token: token_selling.symbol,
          buy_token: token_buying.symbol,
          sell_amount: data.amount,
          buy_amount: bestQuote.buyAmount,
          quote_id: bestQuote.quoteId,
          message: `Successfully swapped ${data.amount} ${token_selling.symbol} for ${bestQuote.buyAmount} ${token_buying.symbol}`,
        };

        return result;
      } catch (error) {
        console.error("Swap failed:", error);
        throw new Error(
          `Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  });
