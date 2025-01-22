import type { ActionHandler } from "../../types";
import { getSolanaConnection } from "../providers";
import { PublicKey } from "@solana/web3.js";

export const solanaBalanceAction: ActionHandler = async (action) => {
  try {
    const connection = getSolanaConnection();
    const walletAddress = action.payload.walletAddress as string;
    
    // Get SOL balance
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    
    // Convert lamports to SOL
    const solBalance = balance / 1e9;
    
    return JSON.stringify({
      success: true,
      balance: {
        lamports: balance,
        sol: solBalance
      },
      message: `Wallet ${walletAddress} has ${solBalance.toFixed(4)} SOL`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to get wallet balance: ${errorMessage}`
    });
  }
}; 