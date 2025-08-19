import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { randomUUID } from "crypto";

// Define wallet account structure
export interface WalletAccount {
  id: string;
  name: string;
  address: string;
  balances: Record<string, number>; // token -> amount
  createdAt: number;
  isActive: boolean;
}

// Define what our accounts context stores
export interface AccountsMemory {
  accounts: WalletAccount[];
  activeAccountId?: string;
  totalPortfolioValue: number;
  lastUpdated: number;
}

// Mock price data (in a real implementation, this would come from an API)
const MOCK_PRICES: Record<string, number> = {
  ETH: 3200,
  BTC: 67000,
  USDC: 1,
  USDT: 1,
  MATIC: 0.85,
  LINK: 12.5,
};

export const accountsContext = context({
  type: "accounts",
  schema: z.object({
    userId: z.string().describe("User ID for account management"),
  }),
  create: (): AccountsMemory => ({
    accounts: [],
    totalPortfolioValue: 0,
    lastUpdated: Date.now(),
  }),
  render: (state) => {
    const { accounts, activeAccountId, totalPortfolioValue } = state.memory;
    const activeAccount = accounts.find(acc => acc.id === activeAccountId);
    
    return `
🏦 Wallet Accounts for User: ${state.args.userId}
📊 Total Portfolio Value: $${totalPortfolioValue.toLocaleString()}
📈 Active Account: ${activeAccount?.name || "None"}
🔢 Total Accounts: ${accounts.length}

Recent Accounts:
${accounts
  .slice(-3)
  .map((acc) => `${acc.isActive ? "🟢" : "⚫"} ${acc.name} (${Object.keys(acc.balances).length} tokens)`)
  .join("\n")}
    `.trim();
  },
}).setActions([
  action({
    name: "create-account",
    description: "Create a new wallet account",
    schema: z.object({
      name: z.string().describe("Name for the account"),
      initialBalances: z.record(z.string(), z.number()).optional()
        .describe("Initial token balances (token -> amount)"),
    }),
    handler: async ({ name, initialBalances = {} }, ctx) => {
      const newAccount: WalletAccount = {
        id: randomUUID(),
        name,
        address: `0x${randomUUID().replace(/-/g, '')}`, // Mock address
        balances: initialBalances,
        createdAt: Date.now(),
        isActive: ctx.memory.accounts.length === 0, // First account is active
      };

      ctx.memory.accounts.push(newAccount);
      
      // Set as active if it's the first account
      if (!ctx.memory.activeAccountId) {
        ctx.memory.activeAccountId = newAccount.id;
      }

      ctx.memory.lastUpdated = Date.now();
      return { 
        success: true, 
        account: newAccount,
        message: `Created account "${name}" with address ${newAccount.address.slice(0, 10)}...`
      };
    },
  }),

  action({
    name: "list-accounts",
    description: "List all wallet accounts",
    schema: z.object({}),
    handler: async (_, ctx) => {
      return {
        accounts: ctx.memory.accounts,
        activeAccountId: ctx.memory.activeAccountId,
        totalAccounts: ctx.memory.accounts.length,
      };
    },
  }),

  action({
    name: "get-balance",
    description: "Get balance for specific account or active account",
    schema: z.object({
      accountId: z.string().optional().describe("Account ID (uses active if not specified)"),
      token: z.string().optional().describe("Specific token to check (returns all if not specified)"),
    }),
    handler: async ({ accountId, token }, ctx) => {
      const targetAccountId = accountId || ctx.memory.activeAccountId;
      const account = ctx.memory.accounts.find(acc => acc.id === targetAccountId);
      
      if (!account) {
        return { 
          success: false, 
          message: "Account not found",
          accountId: targetAccountId 
        };
      }

      if (token) {
        const balance = account.balances[token] || 0;
        const price = MOCK_PRICES[token] || 0;
        return {
          success: true,
          account: account.name,
          token,
          balance,
          usdValue: balance * price,
          price,
        };
      }

      // Return all balances with USD values
      const balanceDetails = Object.entries(account.balances).map(([token, balance]) => ({
        token,
        balance,
        price: MOCK_PRICES[token] || 0,
        usdValue: balance * (MOCK_PRICES[token] || 0),
      }));

      const totalValue = balanceDetails.reduce((sum, detail) => sum + detail.usdValue, 0);

      return {
        success: true,
        account: account.name,
        balances: balanceDetails,
        totalValue,
      };
    },
  }),

  action({
    name: "set-active-account",
    description: "Set the active account for operations",
    schema: z.object({
      accountId: z.string().describe("Account ID to make active"),
    }),
    handler: async ({ accountId }, ctx) => {
      const account = ctx.memory.accounts.find(acc => acc.id === accountId);
      
      if (!account) {
        return { 
          success: false, 
          message: "Account not found" 
        };
      }

      // Deactivate all accounts
      ctx.memory.accounts.forEach(acc => acc.isActive = false);
      
      // Activate the selected account
      account.isActive = true;
      ctx.memory.activeAccountId = accountId;

      return {
        success: true,
        activeAccount: account.name,
        message: `Switched to account "${account.name}"`,
      };
    },
  }),

  action({
    name: "add-funds",
    description: "Add funds to an account (mock operation for testing)",
    schema: z.object({
      accountId: z.string().optional().describe("Account ID (uses active if not specified)"),
      token: z.string().describe("Token to add"),
      amount: z.number().positive().describe("Amount to add"),
    }),
    handler: async ({ accountId, token, amount }, ctx) => {
      const targetAccountId = accountId || ctx.memory.activeAccountId;
      const account = ctx.memory.accounts.find(acc => acc.id === targetAccountId);
      
      if (!account) {
        return { 
          success: false, 
          message: "Account not found" 
        };
      }

      const currentBalance = account.balances[token] || 0;
      account.balances[token] = currentBalance + amount;

      // Update portfolio value
      const price = MOCK_PRICES[token] || 0;
      ctx.memory.totalPortfolioValue += amount * price;
      ctx.memory.lastUpdated = Date.now();

      return {
        success: true,
        account: account.name,
        token,
        previousBalance: currentBalance,
        newBalance: account.balances[token],
        addedValue: amount * price,
        message: `Added ${amount} ${token} to ${account.name}`,
      };
    },
  }),

  action({
    name: "get-portfolio-summary",
    description: "Get overall portfolio summary across all accounts",
    schema: z.object({}),
    handler: async (_, ctx) => {
      const allBalances: Record<string, number> = {};
      let totalValue = 0;

      // Aggregate balances across all accounts
      ctx.memory.accounts.forEach(account => {
        Object.entries(account.balances).forEach(([token, balance]) => {
          allBalances[token] = (allBalances[token] || 0) + balance;
        });
      });

      // Calculate total portfolio value
      const portfolioDetails = Object.entries(allBalances).map(([token, balance]) => {
        const price = MOCK_PRICES[token] || 0;
        const usdValue = balance * price;
        totalValue += usdValue;
        
        return {
          token,
          balance,
          price,
          usdValue,
          percentage: 0, // Will be calculated after we know total
        };
      });

      // Calculate percentages
      portfolioDetails.forEach(detail => {
        detail.percentage = totalValue > 0 ? (detail.usdValue / totalValue) * 100 : 0;
      });

      ctx.memory.totalPortfolioValue = totalValue;

      return {
        totalAccounts: ctx.memory.accounts.length,
        totalValue,
        holdings: portfolioDetails,
        lastUpdated: ctx.memory.lastUpdated,
      };
    },
  }),
]);