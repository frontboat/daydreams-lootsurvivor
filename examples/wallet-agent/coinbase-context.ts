import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

// Define Coinbase wallet structure
export interface CoinbaseWalletData {
  id: string;
  name: string;
  address: string;
  networkId: string;
  seed?: string; // Encrypted or hashed seed for persistence
  createdAt: number;
  isTestnet: boolean;
}

// Define what our Coinbase context stores
export interface CoinbaseMemory {
  wallets: CoinbaseWalletData[];
  activeWalletId?: string;
  isConfigured: boolean;
  defaultNetwork: string;
  testnetMode: boolean;
}

// Initialize Coinbase SDK - this would be done with actual API keys
function initializeCoinbaseSDK() {
  try {
    // In production, these would come from environment variables
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    
    if (apiKeyName && apiKeyPrivateKey) {
      Coinbase.configure(apiKeyName, apiKeyPrivateKey);
      return true;
    } else {
      console.warn("CDP API keys not configured - using mock mode");
      return false;
    }
  } catch (error) {
    console.error("Failed to configure Coinbase SDK:", error);
    return false;
  }
}

export const coinbaseContext = context({
  type: "coinbase",
  schema: z.object({
    userId: z.string().describe("User ID for Coinbase wallet management"),
  }),
  create: (): CoinbaseMemory => ({
    wallets: [],
    isConfigured: initializeCoinbaseSDK(),
    defaultNetwork: "base-sepolia", // Testnet by default
    testnetMode: true,
  }),
  render: (state) => {
    const { wallets, activeWalletId, isConfigured, testnetMode } = state.memory;
    const activeWallet = wallets.find(w => w.id === activeWalletId);
    
    return `
🏛️ Coinbase CDP Integration for User: ${state.args.userId}
⚙️ SDK Configured: ${isConfigured ? "✅" : "❌ (Mock Mode)"}
🧪 Mode: ${testnetMode ? "Testnet" : "Mainnet"}
👛 Wallets: ${wallets.length}
🎯 Active: ${activeWallet?.name || "None"}

Recent Wallets:
${wallets
  .slice(-3)
  .map((w) => `${w.id === activeWalletId ? "🟢" : "⚫"} ${w.name} (${w.networkId})`)
  .join("\n") || "No wallets created"}
    `.trim();
  },
}).setActions([
  action({
    name: "create-coinbase-wallet",
    description: "Create a new Coinbase CDP wallet",
    schema: z.object({
      name: z.string().describe("Name for the wallet"),
      networkId: z.string().optional().describe("Network ID (base-sepolia, base-mainnet, ethereum-sepolia, ethereum-mainnet)"),
    }),
    handler: async ({ name, networkId }, ctx) => {
      const network = networkId || ctx.memory.defaultNetwork;
      
      try {
        if (ctx.memory.isConfigured) {
          // Real Coinbase SDK integration
          const wallet = await Wallet.create({ 
            networkId: network as any 
          });
          
          const defaultAddress = await wallet.getDefaultAddress();
          
          const walletData: CoinbaseWalletData = {
            id: wallet.getId(),
            name,
            address: defaultAddress.getId(),
            networkId: network,
            createdAt: Date.now(),
            isTestnet: network.includes("sepolia"),
          };
          
          ctx.memory.wallets.push(walletData);
          
          // Set as active if it's the first wallet
          if (!ctx.memory.activeWalletId) {
            ctx.memory.activeWalletId = walletData.id;
          }
          
          return {
            success: true,
            wallet: walletData,
            message: `Created real Coinbase wallet "${name}" on ${network}`,
            address: defaultAddress.getId(),
          };
          
        } else {
          // Mock mode for development/testing
          const mockWallet: CoinbaseWalletData = {
            id: `mock-${Date.now()}`,
            name,
            address: `0x${Math.random().toString(16).substring(2, 42)}`,
            networkId: network,
            createdAt: Date.now(),
            isTestnet: network.includes("sepolia"),
          };
          
          ctx.memory.wallets.push(mockWallet);
          
          if (!ctx.memory.activeWalletId) {
            ctx.memory.activeWalletId = mockWallet.id;
          }
          
          return {
            success: true,
            wallet: mockWallet,
            message: `Created mock Coinbase wallet "${name}" on ${network} (SDK not configured)`,
            address: mockWallet.address,
          };
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to create wallet: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "import-coinbase-wallet",
    description: "Import an existing wallet using seed phrase",
    schema: z.object({
      name: z.string().describe("Name for the imported wallet"),
      seedPhrase: z.string().describe("BIP-39 mnemonic seed phrase"),
      networkId: z.string().optional().describe("Network ID"),
    }),
    handler: async ({ name, seedPhrase, networkId }, ctx) => {
      const network = networkId || ctx.memory.defaultNetwork;
      
      try {
        if (ctx.memory.isConfigured) {
          // Real Coinbase SDK integration
          const wallet = await Wallet.import({ 
            mnemonicPhrase: seedPhrase,
            networkId: network as any
          });
          
          const defaultAddress = await wallet.getDefaultAddress();
          
          const walletData: CoinbaseWalletData = {
            id: wallet.getId(),
            name,
            address: defaultAddress.getId(),
            networkId: network,
            createdAt: Date.now(),
            isTestnet: network.includes("sepolia"),
          };
          
          ctx.memory.wallets.push(walletData);
          
          return {
            success: true,
            wallet: walletData,
            message: `Imported wallet "${name}" successfully`,
            address: defaultAddress.getId(),
          };
          
        } else {
          // Mock mode
          const mockWallet: CoinbaseWalletData = {
            id: `imported-${Date.now()}`,
            name,
            address: `0x${Math.random().toString(16).substring(2, 42)}`,
            networkId: network,
            createdAt: Date.now(),
            isTestnet: network.includes("sepolia"),
          };
          
          ctx.memory.wallets.push(mockWallet);
          
          return {
            success: true,
            wallet: mockWallet,
            message: `Mock imported wallet "${name}" (SDK not configured)`,
            address: mockWallet.address,
          };
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to import wallet: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "fund-wallet-faucet",
    description: "Fund a testnet wallet using faucet (testnet only)",
    schema: z.object({
      walletId: z.string().optional().describe("Wallet ID (uses active if not specified)"),
    }),
    handler: async ({ walletId }, ctx) => {
      const targetWalletId = walletId || ctx.memory.activeWalletId;
      const walletData = ctx.memory.wallets.find(w => w.id === targetWalletId);
      
      if (!walletData) {
        return {
          success: false,
          message: "Wallet not found",
        };
      }
      
      if (!walletData.isTestnet) {
        return {
          success: false,
          message: "Faucet funding is only available for testnet wallets",
        };
      }
      
      try {
        if (ctx.memory.isConfigured) {
          // Real CDP SDK faucet
          const wallet = await Wallet.fetch(walletData.id);
          const faucetTransaction = await wallet.faucet();
          await faucetTransaction.wait();
          
          return {
            success: true,
            transactionId: faucetTransaction.getTransactionHash(),
            message: `Funded wallet "${walletData.name}" with testnet ETH`,
            amount: "0.1 ETH",
          };
          
        } else {
          // Mock faucet
          return {
            success: true,
            transactionId: `mock-tx-${Date.now()}`,
            message: `Mock funded wallet "${walletData.name}" with testnet ETH`,
            amount: "0.1 ETH",
          };
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Faucet funding failed: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "transfer-funds",
    description: "Transfer funds between wallets or to external addresses",
    schema: z.object({
      fromWalletId: z.string().optional().describe("Source wallet ID (uses active if not specified)"),
      toAddress: z.string().describe("Destination address or wallet ID"),
      amount: z.number().positive().describe("Amount to transfer"),
      assetId: z.string().optional().default("eth").describe("Asset to transfer (eth, usdc, etc.)"),
    }),
    handler: async ({ fromWalletId, toAddress, amount, assetId }, ctx) => {
      const sourceWalletId = fromWalletId || ctx.memory.activeWalletId;
      const sourceWallet = ctx.memory.wallets.find(w => w.id === sourceWalletId);
      
      if (!sourceWallet) {
        return {
          success: false,
          message: "Source wallet not found",
        };
      }
      
      try {
        if (ctx.memory.isConfigured) {
          // Real CDP SDK transfer
          const wallet = await Wallet.fetch(sourceWallet.id);
          
          // Determine destination - could be another wallet or external address
          let destination = toAddress;
          const destWallet = ctx.memory.wallets.find(w => w.id === toAddress);
          if (destWallet) {
            destination = destWallet.address;
          }
          
          const transfer = await wallet.createTransfer({
            amount,
            assetId: assetId as any,
            destination,
          });
          
          await transfer.wait();
          
          return {
            success: true,
            transactionId: transfer.getTransactionHash(),
            fromWallet: sourceWallet.name,
            toAddress: destination,
            amount,
            assetId,
            status: transfer.getStatus(),
            message: `Transferred ${amount} ${assetId.toUpperCase()} successfully`,
          };
          
        } else {
          // Mock transfer
          return {
            success: true,
            transactionId: `mock-transfer-${Date.now()}`,
            fromWallet: sourceWallet.name,
            toAddress,
            amount,
            assetId,
            status: "complete",
            message: `Mock transferred ${amount} ${assetId.toUpperCase()} from ${sourceWallet.name}`,
          };
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Transfer failed: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "trade-assets",
    description: "Trade one asset for another (mainnet only)",
    schema: z.object({
      walletId: z.string().optional().describe("Wallet ID (uses active if not specified)"),
      amount: z.number().positive().describe("Amount to trade"),
      fromAssetId: z.string().describe("Asset to trade from (eth, usdc, weth, etc.)"),
      toAssetId: z.string().describe("Asset to trade to (eth, usdc, weth, etc.)"),
    }),
    handler: async ({ walletId, amount, fromAssetId, toAssetId }, ctx) => {
      const targetWalletId = walletId || ctx.memory.activeWalletId;
      const walletData = ctx.memory.wallets.find(w => w.id === targetWalletId);
      
      if (!walletData) {
        return {
          success: false,
          message: "Wallet not found",
        };
      }
      
      if (walletData.isTestnet) {
        return {
          success: false,
          message: "Trading is only available on mainnet wallets",
        };
      }
      
      try {
        if (ctx.memory.isConfigured) {
          // Real CDP SDK trade
          const wallet = await Wallet.fetch(walletData.id);
          
          const trade = await wallet.createTrade({
            amount,
            fromAssetId: fromAssetId as any,
            toAssetId: toAssetId as any,
          });
          
          await trade.wait();
          
          return {
            success: true,
            transactionId: trade.getTransactionHash(),
            wallet: walletData.name,
            amount,
            fromAssetId,
            toAssetId,
            status: trade.getStatus(),
            message: `Traded ${amount} ${fromAssetId.toUpperCase()} for ${toAssetId.toUpperCase()}`,
          };
          
        } else {
          // Mock trade
          const mockReceived = amount * 0.95; // Mock 5% slippage
          return {
            success: true,
            transactionId: `mock-trade-${Date.now()}`,
            wallet: walletData.name,
            amount,
            fromAssetId,
            toAssetId,
            received: mockReceived,
            status: "complete",
            message: `Mock traded ${amount} ${fromAssetId.toUpperCase()} for ~${mockReceived.toFixed(6)} ${toAssetId.toUpperCase()}`,
          };
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Trade failed: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "get-wallet-balance",
    description: "Get balance for a specific wallet",
    schema: z.object({
      walletId: z.string().optional().describe("Wallet ID (uses active if not specified)"),
      assetId: z.string().optional().describe("Specific asset to check balance for"),
    }),
    handler: async ({ walletId, assetId }, ctx) => {
      const targetWalletId = walletId || ctx.memory.activeWalletId;
      const walletData = ctx.memory.wallets.find(w => w.id === targetWalletId);
      
      if (!walletData) {
        return {
          success: false,
          message: "Wallet not found",
        };
      }
      
      try {
        if (ctx.memory.isConfigured) {
          // Real CDP SDK balance check
          const wallet = await Wallet.fetch(walletData.id);
          
          if (assetId) {
            const balance = await wallet.getBalance(assetId as any);
            return {
              success: true,
              wallet: walletData.name,
              address: walletData.address,
              assetId,
              balance: balance.toString(),
            };
          } else {
            // Get all balances - this would need to iterate through common assets
            const ethBalance = await wallet.getBalance(Coinbase.assets.Eth);
            return {
              success: true,
              wallet: walletData.name,
              address: walletData.address,
              balances: {
                ETH: ethBalance.toString(),
              },
            };
          }
          
        } else {
          // Mock balances
          const mockBalances = {
            ETH: "0.1",
            USDC: "1000.0",
            WETH: "0.05",
          };
          
          if (assetId) {
            return {
              success: true,
              wallet: walletData.name,
              address: walletData.address,
              assetId,
              balance: mockBalances[assetId.toUpperCase() as keyof typeof mockBalances] || "0",
            };
          } else {
            return {
              success: true,
              wallet: walletData.name,
              address: walletData.address,
              balances: mockBalances,
            };
          }
        }
        
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: `Failed to get balance: ${error.message}`,
        };
      }
    },
  }),

  action({
    name: "list-coinbase-wallets",
    description: "List all Coinbase CDP wallets",
    schema: z.object({}),
    handler: async (_, ctx) => {
      return {
        success: true,
        wallets: ctx.memory.wallets,
        activeWalletId: ctx.memory.activeWalletId,
        isConfigured: ctx.memory.isConfigured,
        testnetMode: ctx.memory.testnetMode,
      };
    },
  }),

  action({
    name: "set-active-coinbase-wallet",
    description: "Set the active Coinbase wallet",
    schema: z.object({
      walletId: z.string().describe("Wallet ID to make active"),
    }),
    handler: async ({ walletId }, ctx) => {
      const wallet = ctx.memory.wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        return {
          success: false,
          message: "Wallet not found",
        };
      }
      
      ctx.memory.activeWalletId = walletId;
      
      return {
        success: true,
        activeWallet: wallet,
        message: `Set "${wallet.name}" as active wallet`,
      };
    },
  }),
]);