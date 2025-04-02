/**
 * Example demonstrating Sui interactions using the Daydreams package,
 */

import { createGroq } from "@ai-sdk/groq";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
  type ActionCall,
  type AgentContext,
  type Agent,
} from "@daydreamsai/core";
import { cli } from "@daydreamsai/core/extensions";
import { z } from "zod";
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
const suiContexts = context({
  type: "sui",
  schema: z.object({
    id: z.string(),
  }),

  key({ id }: { id: string }) {
    return id;
  },

  create() {
    return {
      transactions: [],
      lastTransaction: null,
    };
  },

  render({ memory }: { memory: SuiMemory }) {
    return render(template, {
      lastTransaction: memory.lastTransaction ?? "NONE",
      transactions: memory.transactions.join("\n"),
    });
  },
});

// Create Dreams instance
const dreams = createDreams({
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [cli],
  context: suiContexts,
  actions: [
    action({
      name: "SUI_FAUCET",
      description: "Request SUI tokens from a faucet",
      schema: z.object({
        network: z
          .string()
          .describe(
            "The network to request SUI from. This should be taken from the input data. Default is testnet if the user does not provide a valid network"
          ),
        recipient: z
          .string()
          .describe(
            "The account address to receive SUI. This should be taken from the input data"
          ),
      }),
      async handler(
        call: ActionCall<{ network: string; recipient: string }>,
        ctx: AgentContext<any, any> & { memory: SuiMemory },
        _agent: Agent
      ) {
        const { network, recipient } = call.data;

        try {
          const result = await suiChain.requestSui({
            network: network as FaucetNetwork,
            recipient,
          });

          const resultStr = JSON.stringify(result, null, 2);

          ctx.memory.lastTransaction = `Faucet Request: ${resultStr}`;
          ctx.memory.transactions.push(ctx.memory.lastTransaction);

          return { content: `Transaction: ${resultStr}` };
        } catch (error) {
          return {
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }),
    action({
      name: "SUI_SWAP",
      description: "Swap tokens on the Sui blockchain",
      schema: z.object({
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
      }),
      async handler(
        call: ActionCall<{
          fromToken: string;
          amount: string;
          targetToken: string;
          out_min_amount?: number;
        }>,
        ctx: AgentContext<any, any> & { memory: SuiMemory },
        _agent: Agent
      ) {
        const { fromToken, amount, out_min_amount, targetToken } = call.data;

        try {
          const result = await suiChain.swapToken({
            fromToken,
            amount,
            out_min_amount: out_min_amount || null,
            targetToken,
          });

          const resultStr = JSON.stringify(result, null, 2);

          ctx.memory.lastTransaction = `Swap: ${fromToken} to ${targetToken}, Amount: ${amount}, Result: ${resultStr}`;
          ctx.memory.transactions.push(ctx.memory.lastTransaction);

          return { content: `Transaction: ${resultStr}` };
        } catch (error) {
          return {
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }),
  ],
});

// Start the Dreams instance
dreams.start({ id: "sui-example" });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log(chalk.yellow("\n\nShutting down..."));
  console.log(chalk.green("✅ Shutdown complete"));
  process.exit(0);
});
