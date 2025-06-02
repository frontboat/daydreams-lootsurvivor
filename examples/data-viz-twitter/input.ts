import {
  input,
  type AnyContext,
  type InferSchemaArguments,
} from "@daydreamsai/core";
import { sleep } from "bun";
import { z } from "zod";

export function createInstructionsInput<TContext extends AnyContext>({
  context,
  args,
  message,
  interval,
  enabled = true,
}: {
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  message: string;
  interval: number;
  enabled?: boolean;
}) {
  const intervalMs = interval * 60 * 1000;

  return input({
    schema: z.string(),
    async subscribe(send) {
      console.info(
        "Setting up recurring task",
        JSON.stringify({
          interval_minutes: interval,
        })
      );

      const controller = new AbortController();

      if (enabled) {
        setImmediate(async () => {
          while (!controller.signal.aborted) {
            send(context, args, message);
            await sleep(intervalMs);
          }
        });
      }

      return () => {
        controller.abort();
      };
    },
  });
}
