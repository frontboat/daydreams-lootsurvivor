/**
 * Example demonstrating Sui interactions using the Daydreams package,
 */

import { createGroq } from "@ai-sdk/groq";
import { createDreams, context, action, validateEnv } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import * as z from "zod/v4";
import chalk from "chalk";
import { SuiChain, supportedSuiTokens } from "@daydreamsai/defai";
import type { FaucetNetwork, SuiNetwork } from "@daydreamsai/defai";

// Validate environment variables
const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    SUI_NETWORK: z.string().min(1, "SUI_NETWORK is required"),
    SUI_PRIVATE_KEY: z.string().min(1, "SUI_PRIVATE_KEY is required"),
  })
);

// Initialize Groq client
const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});

// Initialize Sui Chain
const suiChain = new SuiChain({
  network: env.SUI_NETWORK as SuiNetwork,
  privateKey: env.SUI_PRIVATE_KEY,
});

// Define memory type
type SuiMemory = {
  wallet: string;
  transactions: string[];
  lastTransaction: string | null;
};

// Define context template
const template = ({ wallet, lastTransaction, transactions }: SuiMemory) => `\
Wallet: ${wallet}
Last Transaction: ${lastTransaction ?? "NONE"}
Transaction History:
${transactions.join("\n")}`;

// Create context
const suiContexts = context({
  type: "sui",
  schema: {
    wallet: z.string(),
  },
  key: ({ wallet }) => wallet,
  create({ args }): SuiMemory {
    return {
      wallet: args.wallet,
      transactions: [],
      lastTransaction: null,
    };
  },
  render({ memory }) {
    return template(memory);
  },
}).setActions([
  action({
    name: "sui.faucet",
    description: "Request SUI tokens from a faucet",
    schema: {
      network: z
        .enum(["testnet", "devnet", "localnet"])
        .default("testnet")
        .describe("The network to request SUI from."),
      recipient: z.string().describe("The account address to receive SUI"),
    },
    async handler({ network, recipient }, { memory }) {
      const result = await suiChain.requestSui({
        network: network as FaucetNetwork,
        recipient,
      });

      const resultStr = JSON.stringify(result, null, 2);

      memory.lastTransaction = `Faucet Request: ${resultStr}`;
      memory.transactions.push(memory.lastTransaction);

      return { content: `Transaction: ${resultStr}` };
    },
  }),
  action({
    name: "sui.swap",
    description: "Swap tokens on the Sui blockchain",
    schema: {
      fromToken: z
        .string()
        .describe(
          `The token name to be swapped. It can be one of these: ${supportedSuiTokens}. This token and target token should not be same.`
        ),
      targetToken: z
        .string()
        .describe(
          `The token name to be swapped. It can be one of these: ${supportedSuiTokens}. This token and from token should not be same.`
        ),
      amount: z
        .string()
        .describe(
          "The amount of token to be swapped. It should be in MIST. 1 SUI = 10^9 MIST. User mostly doesn't provide the value in mist, if he does, use that. Or else, do the conversation of multiplication and provide the value. However, for the case of USDC, the amount should be provided by multiplying 10^6. If a user says 1 USDC, amount you should add is 10^6. Take note of the amount of the from token."
        ),
      out_min_amount: z
        .number()
        .optional()
        .describe(
          "This is the minimum expected output token amount. If not provided should be null and will execute the swap anyhow."
        ),
    },
    async handler(
      { fromToken, amount, out_min_amount, targetToken },
      { memory }
    ) {
      const result = await suiChain.swapToken({
        fromToken,
        amount,
        out_min_amount: out_min_amount || null,
        targetToken,
      });

      const resultStr = JSON.stringify(result, null, 2);

      memory.lastTransaction = `Swap: ${fromToken} to ${targetToken}, Amount: ${amount}, Result: ${resultStr}`;
      memory.transactions.push(memory.lastTransaction);

      return { content: `Transaction: ${resultStr}` };
    },
  }),
]);

// Create Dreams instance
const dreams = createDreams({
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [cliExtension],
  context: suiContexts,
});

// Start the Dreams instance
await dreams.start({ wallet: suiChain.getAddress() });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log(chalk.yellow("\n\nShutting down..."));
  console.log(chalk.green("✅ Shutdown complete"));
  process.exit(0);
});
