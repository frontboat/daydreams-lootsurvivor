import { z } from "zod";
import { extension, input, output } from "@daydreamsai/core";
import { Events, type Message } from "discord.js";
import { DiscordClient } from "./io";
import { context } from "@daydreamsai/core";
import { service } from "@daydreamsai/core";
import { LogLevel } from "@daydreamsai/core";

/* Implementation of the discord extension */
const discordService = service({
  register(container) {
    container.singleton(
      "discord",
      () =>
        new DiscordClient(
          {
            discord_token: process.env.DISCORD_TOKEN!,
            discord_bot_name: process.env.DISCORD_BOT_NAME!,
          },
          LogLevel.DEBUG
        )
    );
  },
});

export const discordChannelContext = context({
  type: "discord.channel",
  key: ({ channelId }) => channelId,
  schema: z.object({ channelId: z.string() }),
  async setup(args, setttings, { container }) {
    const channel = await container
      .resolve<DiscordClient>("discord")
      .client.channels.fetch(args.channelId);

    if (!channel) throw new Error("Invalid channel");

    return { channel };
  },
})
  .setInputs({
    "discord:message": input({
      schema: {
        user: z.object({ id: z.string(), name: z.string() }),
        text: z.string(),
      },
      handler(data) {
        return {
          data: data.text,
          params: { userId: data.user.id, username: data.user.name },
        };
      },
      subscribe(send, { container }) {
        function listener(message: Message) {
          if (
            message.author.displayName ==
            container.resolve<DiscordClient>("discord").credentials
              .discord_bot_name
          ) {
            console.log(
              `Skipping message from ${
                container.resolve<DiscordClient>("discord").credentials
                  .discord_bot_name
              }`
            );
            return;
          }
          send(
            discord.contexts!.discordChannel,
            { channelId: message.channelId },
            {
              user: {
                id: message.author.id,
                name: message.author.displayName,
              },
              text: message.content,
            }
          );
        }

        const { client } = container.resolve<DiscordClient>("discord");

        client.on(Events.MessageCreate, listener);
        return () => {
          client.off(Events.MessageCreate, listener);
        };
      },
    }),
  })
  .setOutputs({
    "discord:message": output({
      schema: z.string(),
      examples: [`<output type="discord:message">Hi!</output>`],
      handler: async (data, ctx, { container }) => {
        const channel = ctx.options.channel;
        if (channel && (channel.isTextBased() || channel.isDMBased())) {
          await container.resolve<DiscordClient>("discord").sendMessage({
            channelId: ctx.args.channelId,
            content: data,
          });

          return {
            data,
            timestamp: Date.now(),
          };
        }
        throw new Error("Invalid channel id");
      },
    }),
  });

export const discord = extension({
  name: "discord",
  services: [discordService],
  contexts: {
    discordChannel: discordChannelContext,
  },
});
