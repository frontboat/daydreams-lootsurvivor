import { createDreamsRouterAuth } from "@daydreamsai/ai-sdk-provider";
import { createDreams, LogLevel } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { privateKeyToAccount } from "viem/accounts";

const { dreamsRouter, user } = await createDreamsRouterAuth(
  privateKeyToAccount(Bun.env.PRIVATE_KEY as `0x${string}`),
  {
    payments: {
      amount: "100000", // $0.10 USDC
      network: "base-sepolia",
    },
  }
);

console.log("user", user.balance);

createDreams({
  logLevel: LogLevel.DEBUG,
  model: dreamsRouter("google-vertex/gemini-2.5-flash"),
  extensions: [cliExtension],
}).start();
