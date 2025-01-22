import type { ActionHandler, JupiterQuoteParams, JupiterSwapParams } from "../../types";
import { fetchJupiterQuote, fetchJupiterSwap } from "../providers";

// Helpers for amount conversion
const DECIMALS = 6; // Both USDC and USDT use 6 decimals
const MULTIPLIER = Math.pow(10, DECIMALS);

const toHumanAmount = (amount: string): string => {
  return (parseInt(amount) / MULTIPLIER).toFixed(DECIMALS);
};

const isRawAmount = (amount: string): boolean => {
  // Check if amount is already in raw format (has enough digits)
  return amount.length > DECIMALS;
};

export const jupiterQuoteAction: ActionHandler = async (action) => {
  try {
    // Type assertion for the payload
    const payload = action.payload as JupiterQuoteParams;
    
    // If amount is already in raw format (from agent), use it directly
    // Otherwise convert from human readable
    const rawAmount = isRawAmount(payload.amount) 
      ? payload.amount 
      : Math.floor(parseFloat(payload.amount) * MULTIPLIER).toString();
    
    const rawPayload = {
      ...payload,
      amount: rawAmount
    };
    
    const result = await fetchJupiterQuote(rawPayload);
    
    if (result instanceof Error) {
      throw result;
    }

    return JSON.stringify({
      success: true,
      quote: result,
      message: `Successfully got quote for swapping ${toHumanAmount(rawAmount)} ${payload.inputMint} to ${payload.outputMint} (raw amount: ${rawAmount})`
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

    return JSON.stringify({
      success: true,
      transaction: result,
      message: `Successfully created swap transaction for ${toHumanAmount(payload.quoteResponse.inAmount)} ${payload.quoteResponse.inputMint} to ${payload.quoteResponse.outputMint} (raw amount: ${payload.quoteResponse.inAmount})`
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