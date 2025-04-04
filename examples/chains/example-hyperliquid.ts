/**
 * Example demonstrating a comprehensive Hyperliquid trading bot using the Daydreams package.
 * This bot provides full trading capabilities including:
 * - Place limit orders (instant-or-cancel & good-til-cancel)
 * - Place market orders with size or USD amount
 * - Get account balances and positions
 * - Monitor open orders
 * - Cancel existing orders
 * - Market sell positions
 * - Interactive console interface for manual trading
 * - Real-time order status monitoring
 */

import { createGroq } from "@ai-sdk/groq";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
} from "@daydreamsai/core";
import { cli, cliExtension } from "@daydreamsai/cli";
import { z } from "zod";
import chalk from "chalk";
import { HyperliquidClient } from "@daydreamsai/hyperliquid";

// Validate environment variables
const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    HYPERLIQUID_MAIN_ADDRESS: z
      .string()
      .min(1, "HYPERLIQUID_MAIN_ADDRESS is required"),
    HYPERLIQUID_WALLET_ADDRESS: z
      .string()
      .min(1, "HYPERLIQUID_WALLET_ADDRESS is required"),
    HYPERLIQUID_PRIVATE_KEY: z
      .string()
      .min(1, "HYPERLIQUID_PRIVATE_KEY is required"),
  })
);

// Initialize Groq client
const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});

// Initialize Hyperliquid Client
const hyperliquid = new HyperliquidClient({
  mainAddress: env.HYPERLIQUID_MAIN_ADDRESS,
  walletAddress: env.HYPERLIQUID_WALLET_ADDRESS,
  privateKey: env.HYPERLIQUID_PRIVATE_KEY,
});

// Define memory type
type HyperliquidMemory = {
  transactions: string[];
  lastTransaction: string | null;
};

// Define context template
const template = `
Last Transaction: {{lastTransaction}}
Transaction History:
{{transactions}}
`;

// Create context
const hyperliquidContexts = context({
  type: "hyperliquid",
  schema: {
    id: z.string(),
  },

  key({ id }) {
    return id;
  },

  create(): HyperliquidMemory {
    return {
      transactions: [],
      lastTransaction: null,
    };
  },

  render({ memory }) {
    return render(template, {
      lastTransaction: memory.lastTransaction ?? "NONE",
      transactions: memory.transactions.join("\n"),
    });
  },
}).setActions([
  action({
    name: "hyperliquid.place_limit_order_ioc",
    description: "Place an instant-or-cancel limit order on Hyperliquid",
    schema: {
      ticker: z
        .string()
        .describe(
          "Ticker must be only the letter of the ticker in uppercase without the -PERP or -SPOT suffix"
        ),
      sz: z.number().describe("Size of the order"),
      limit_px: z.number().describe("Limit price for the order"),
      is_buy: z.boolean().describe("Whether this is a buy order"),
    },
    async handler({ ticker, sz, limit_px, is_buy }, { memory }) {
      const result = await hyperliquid.placeLimitOrderInstantOrCancel(
        ticker,
        sz,
        limit_px,
        is_buy
      );

      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = `IOC Order: ${is_buy ? "Buy" : "Sell"} ${sz}x${ticker} @ ${limit_px}`;
      memory.transactions.push(memory.lastTransaction);

      return { content: `Transaction: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.place_limit_order_gtc",
    description: "Place a good-til-cancel limit order on Hyperliquid",
    schema: {
      ticker: z
        .string()
        .describe(
          "Ticker must be only the letter of the ticker in uppercase without the -PERP or -SPOT suffix"
        ),
      sz: z.number().describe("Size of the order"),
      limit_px: z.number().describe("Limit price for the order"),
      is_buy: z.boolean().describe("Whether this is a buy order"),
    },
    async handler({ ticker, sz, limit_px, is_buy }, { memory }) {
      const result = await hyperliquid.placeLimitOrderGoodTilCancel(
        ticker,
        sz,
        limit_px,
        is_buy
      );

      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = `GTC Order: ${is_buy ? "Buy" : "Sell"} ${sz}x${ticker} @ ${limit_px}`;
      memory.transactions.push(memory.lastTransaction);
      return { content: `Transaction: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.market_order",
    description: "Place a market order on Hyperliquid",
    schema: {
      ticker: z
        .string()
        .describe(
          "Ticker must be only the letter of the ticker in uppercase without the -PERP or -SPOT suffix"
        ),
      sz: z.number().describe("Size of the order"),
      is_buy: z.boolean().describe("Whether this is a buy order"),
    },
    async handler({ ticker, sz, is_buy }, { memory }) {
      const result = await hyperliquid.placeMarketOrder(ticker, sz, is_buy);

      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = `Market Order: ${is_buy ? "Buy" : "Sell"} ${sz}x${ticker}`;
      memory.transactions.push(memory.lastTransaction);

      return { content: `Transaction: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.market_order_usd",
    description: "Place a market order with USD amount on Hyperliquid",
    schema: {
      ticker: z
        .string()
        .describe(
          "Ticker must be only the letter of the ticker in uppercase without the -PERP or -SPOT suffix"
        ),
      usdtotalprice: z.number().describe("Total USD amount to trade"),
      is_buy: z.boolean().describe("Whether this is a buy order"),
    },
    async handler({ ticker, usdtotalprice, is_buy }, ctx) {
      const result = await hyperliquid.placeMarketOrderUSD(
        ticker,
        usdtotalprice,
        is_buy
      );

      const resultStr = JSON.stringify(result, null, 2);
      ctx.memory.lastTransaction = `Market Order USD: ${is_buy ? "Buy" : "Sell"} ${ticker} for $${usdtotalprice}`;
      ctx.memory.transactions.push(ctx.memory.lastTransaction);

      return { content: `Transaction: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.get_balances",
    description: "Get account balances and positions from Hyperliquid",
    schema: undefined,
    async handler(ctx) {
      const result = await hyperliquid.getAccountBalancesAndPositions();
      const resultStr = JSON.stringify(result, null, 2);
      ctx.memory.lastTransaction = "Checked balances and positions";
      ctx.memory.transactions.push(ctx.memory.lastTransaction);
      return { content: `Balances: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.get_open_orders",
    description: "Get open orders from Hyperliquid",
    schema: undefined,
    async handler({ memory }) {
      const result = await hyperliquid.getOpenOrders();
      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = "Checked open orders";
      memory.transactions.push(memory.lastTransaction);
      return { content: `Open Orders: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.cancel_order",
    description: "Cancel an order on Hyperliquid",
    schema: {
      ticker: z
        .string()
        .describe(
          "Ticker must be only the letter of the ticker in uppercase without the -PERP or -SPOT suffix"
        ),
      orderId: z.number().describe("ID of the order to cancel"),
    },
    async handler({ ticker, orderId }, { memory }) {
      const result = await hyperliquid.cancelOrder(ticker, orderId);
      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = `Cancelled order ${orderId} for ${ticker}`;
      memory.transactions.push(memory.lastTransaction);
      return { content: `Cancel Result: ${resultStr}` };
    },
  }),

  action({
    name: "hyperliquid.market_sell_positions",
    description: "Market sell positions on Hyperliquid",
    schema: z.object({
      tickers: z
        .array(z.string())
        .describe("Array of tickers to sell positions for"),
    }),
    async handler({ tickers }, { memory }) {
      const result = await hyperliquid.marketSellPositions(tickers);
      const resultStr = JSON.stringify(result, null, 2);
      memory.lastTransaction = `Market sold positions for ${tickers.join(", ")}`;
      memory.transactions.push(memory.lastTransaction);
      return { content: `Market Sell Result: ${resultStr}` };
    },
  }),
]);

// Create Dreams instance
const dreams = createDreams({
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [cliExtension],
  context: hyperliquidContexts,
});

// Start the Dreams instance
dreams.start({ id: "hyperliquid-example" });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log(chalk.yellow("\n\nShutting down..."));
  console.log(chalk.green("✅ Shutdown complete"));
  process.exit(0);
});
