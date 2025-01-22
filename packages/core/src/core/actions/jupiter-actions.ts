import type { ActionHandler, JupiterQuoteParams, JupiterSwapParams } from "../../types";
import { fetchJupiterQuote, fetchJupiterSwap } from "../providers";

// Helpers for amount conversion
const TOKEN_DECIMALS: Record<string, number> = {
  'So11111111111111111111111111111111111111112': 9, // SOL
  'GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump': 6, // DREAMS
};

const toHumanAmount = (amount: string, decimals: number): string => {
  const multiplier = Math.pow(10, decimals);
  return (parseInt(amount) / multiplier).toFixed(4); // Show 4 decimal places for readability
};

const isRawAmount = (amount: string, decimals: number): boolean => {
  return amount.length > decimals;
};

export const jupiterQuoteAction: ActionHandler = async (action) => {
  try {
    // Type assertion for the payload
    const payload = action.payload as JupiterQuoteParams;
    
    const inputDecimals = TOKEN_DECIMALS[payload.inputMint] ?? 6;
    
    // If amount is already in raw format (from agent), use it directly
    // Otherwise convert from human readable
    const rawAmount = isRawAmount(payload.amount, inputDecimals)
      ? payload.amount 
      : Math.floor(parseFloat(payload.amount) * Math.pow(10, inputDecimals)).toString();
    
    const rawPayload = {
      ...payload,
      amount: rawAmount
    };
    
    const result = await fetchJupiterQuote(rawPayload);
    
    if (result instanceof Error) {
      throw result;
    }

    // Get decimals for both tokens
    const outputDecimals = TOKEN_DECIMALS[result.outputMint] ?? 6;

    // Convert amounts to human readable
    const humanInAmount = toHumanAmount(result.inAmount, inputDecimals);
    const humanOutAmount = toHumanAmount(result.outAmount, outputDecimals);

    return JSON.stringify({
      success: true,
      quote: result,
      message: `Successfully got quote for swapping ${humanInAmount} SOL to ${humanOutAmount} DREAMS (Price Impact: ${(parseFloat(result.priceImpactPct) * 100).toFixed(4)}%)`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to get Jupiter quote: ${errorMessage}`
    });
  }
};

export const jupiterSwapAction: ActionHandler = async (action) => {
  try {
    // Type assertion for the payload
    const payload = action.payload as JupiterSwapParams;
    const result = await fetchJupiterSwap(payload);
    
    if (result instanceof Error) {
      throw result;
    }

    // Get decimals for input token
    const inputDecimals = TOKEN_DECIMALS[payload.quoteResponse.inputMint] ?? 6;
    const outputDecimals = TOKEN_DECIMALS[payload.quoteResponse.outputMint] ?? 6;

    // Convert amounts to human readable
    const humanInAmount = toHumanAmount(payload.quoteResponse.inAmount, inputDecimals);
    const humanOutAmount = toHumanAmount(payload.quoteResponse.outAmount, outputDecimals);

    return JSON.stringify({
      success: true,
      transaction: result,
      message: `Successfully created swap transaction for ${humanInAmount} ${payload.quoteResponse.inputMint} to ${humanOutAmount} ${payload.quoteResponse.outputMint}`,
      swapDetails: {
        inputAmount: humanInAmount,
        outputAmount: humanOutAmount,
        inputToken: payload.quoteResponse.inputMint,
        outputToken: payload.quoteResponse.outputMint,
        priceImpact: payload.quoteResponse.priceImpactPct
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to create Jupiter swap transaction: ${errorMessage}`
    });
  }
}; 