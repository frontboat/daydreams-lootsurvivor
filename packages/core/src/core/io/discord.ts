import {
    ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    Partials,
    TextChannel,
    User,
    type Channel,
} from "discord.js";
import type { JSONSchemaType } from "ajv";
import { Logger } from "../../core/logger";
import { LogLevel } from "../types";
import { env } from "../../core/env";

export interface DiscordCredentials {
    discord_token: string;
}

export interface MessageData {
    content: string;
    channelId: string;
    conversationId?: string;
    sendBy?: string;
}

export interface EventCallbacks {
    messageCreate?: (bot: any, message: any) => void;
}

// Schema for message output validation
export const messageSchema: JSONSchemaType<MessageData> = {
    type: "object",
    properties: {
        content: { type: "string" },
        channelId: { type: "string" },
        sendBy: { type: "string", nullable: true },
        conversationId: { type: "string", nullable: true },
    },
    required: ["content", "channelId"],
    additionalProperties: false,
};

export class DiscordClient {
    private client: Client;
    private logger: Logger;

    constructor(
        private credentials: DiscordCredentials,
        logLevel: LogLevel = LogLevel.INFO,
        eventCallbacks: EventCallbacks
    ) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.DirectMessageReactions,
            ],
            partials: [Partials.Channel], // Enable DM
        });
        this.credentials = credentials;
        this.logger = new Logger({
            level: logLevel,
            enableColors: true,
            enableTimestamp: true,
        });

        if (eventCallbacks.messageCreate) {
            this.client.on(Events.MessageCreate, (message) => {
                if (eventCallbacks.messageCreate) {
                    eventCallbacks.messageCreate(this.client.user, message);
                }
            });
        }

        this.client.on(Events.ClientReady, async () => {
            this.logger.info("DiscordClient", "Initialized successfully");
        });

        this.client.login(this.credentials.discord_token).catch((error) => {
            this.logger.error("DiscordClient", "Failed to login", { error });
            console.error("Login error:", error);
        });
    }

    public destroy() {
        this.client.destroy();
    }

    /**
     * Create an output for sending messages
     */
    public createMessageOutput() {
        return {
            name: "discord_message",
            handler: async (data: MessageData) => {
                return await this.sendMessage(data);
            },
            response: {
                success: "boolean",
                channelId: "string",
            },
            schema: messageSchema,
        };
    }

    private getIsValidTextChannel(channel?: Channel): channel is TextChannel {
        return channel?.type === ChannelType.GuildText;
    }

    private async sendMessage(data: MessageData) {
        try {
            this.logger.info(
                "DiscordClient.sendMessage",
                "Would send message",
                {
                    data,
                }
            );

            if (env.DRY_RUN) {
                return {
                    success: true,
                    channelId: "DRY RUN CHANNEL ID",
                };
            }

            const channel = this.client.channels.cache.get(data.channelId);
            if (!this.getIsValidTextChannel(channel)) {
                const error = new Error(
                    `Invalid or unsupported channel: ${data.channelId}`
                );
                this.logger.error(
                    "DiscordClient.sendMessage",
                    "Error sending message",
                    {
                        error,
                    }
                );
                throw error;
            }
            const sentMessage = await channel.send(data.content);

            return {
                success: true,
                messageId: sentMessage.id,
            };
        } catch (error) {
            this.logger.error(
                "DiscordClient.sendMessage",
                "Error sending message",
                {
                    error,
                }
            );
            throw error;
        }
    }
}

// Example usage:
/*
const discord = new DiscordClient({
  discord_token: "M..."
});

// Register output
core.registerOutput(discord.createMessageOutput());
*/
