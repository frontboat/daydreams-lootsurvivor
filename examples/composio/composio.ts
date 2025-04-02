import OpenAI from "openai/index.mjs";
import { OpenAIToolSet } from "composio-core";
import { extension } from "@daydreamsai/core";
import { z } from "zod";

const openai_client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const composio_toolset = new OpenAIToolSet({
  apiKey: process.env.COMPOSIO_API_KEY,
});

interface ActionParameter {
  name: string;
  type: string;
  default?: any;
  required: boolean;
}

interface SimplifiedAction {
  name: string;
  displayName: string;
  description: string;
  parameters: ActionParameter[];
}

const COMPOSIO_APPNAMES = [
  "notion",
  "tinypng",
  "twitch",
  "github",
  "linkedin",
  "stripe",
  "airtable",
  "epic_games",
  "youtube",
  "googledocs",
  "trello",
  "docusign",
  "discordbot",
  "google_maps",
  "discord",
  "webflow",
  "open_sea",
  "facebook",
  "figma",
  "cal",
  "eventbrite",
  "todoist",
  "canva",
  "twitter_media",
  "googletasks",
  "heygen",
  "datarobot",
  "humanloop",
  "googlecalendar",
  "hackernews",
  "gmail",
  "googlephotos",
  "one_drive",
  "twitter",
  "mailchimp",
  "perplexityai",
  "googlesheets",
  "supabase",
  "elevenlabs",
  "miro",
  "slack",
  "hubspot",
];

async function makeOpenAIRequest(content: string, tools: any[]) {
  try {
    const response = await openai_client.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content }],
      tools,
      tool_choice: "auto",
    });
    return response;
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw new Error("Failed to process request");
  }
}

// We simplify the actions to reduce the number of tokens in the response
// This is necessary because the raw response can be very verbose and hit daydreams' model token limits
function simplifyActions(data: any): SimplifiedAction[] {
  if (!data?.data?.actions) {
    return [];
  }

  return data.data.actions.map((action: any) => ({
    name: action.name,
    displayName: action.display_name,
    description: action.description,
    parameters: Object.entries(action.parameters.properties).map(
      ([key, value]: [string, any]): ActionParameter => ({
        name: key,
        type: value.type,
        default: value.default,
        required: action.parameters.required?.includes(key) ?? false,
      })
    ),
  }));
}

export const composio = extension({
  name: "composio",
  services: [],
  inputs: {},
  outputs: {},
  actions: [
    {
      name: "composio.getTodaysDate",
      description:
        "Get the current date and hour. You must call that whenever there is a mention to today or tomorrow or any kind of temporal position based on today's date.",
      schema: z.object({}),
      async handler(call: { data: {} }, ctx, agent) {
        const date = new Date();
        const formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        });
        return formattedDate;
      },
    },
    {
      name: "composio.checkActiveConnection",
      description: "Check if there's an active connection for a specific tool",
      schema: z.object({
        tool: z
          .enum(COMPOSIO_APPNAMES as [string, ...string[]])
          .describe("The tool name to initiate connection for."),
      }),
      async handler(call: { data: { tool: string } }, ctx, agent) {
        const tools = await composio_toolset.getTools({
          actions: ["COMPOSIO_CHECK_ACTIVE_CONNECTION"],
        });

        const response = await makeOpenAIRequest(
          `Check connection for ${call.data.tool}`,
          tools
        );
        const tool_response = await composio_toolset.handleToolCall(response);
        return tool_response;
      },
    },
    {
      name: "composio.initiateConnection",
      description: "Initiate a connection for a specific tool",
      schema: z.object({
        tool: z
          .enum(COMPOSIO_APPNAMES as [string, ...string[]])
          .describe("The tool name to initiate connection for."),
      }),
      async handler(call: { data: { tool: string } }, ctx, agent) {
        const tools = await composio_toolset.getTools({
          actions: ["COMPOSIO_INITIATE_CONNECTION"],
        });

        const response = await makeOpenAIRequest(
          `Initiate connection for ${call.data.tool}`,
          tools
        );
        const tool_response = await composio_toolset.handleToolCall(response);
        return tool_response;
      },
    },

    {
      name: "composio.retrieveActions",
      description:
        "Retrieve available actions for a specific app. Mandatory to call before doing an action for the first time to get the exact name of action_name for executeAction. Also you will find the required parameters",
      schema: z.object({
        app_name: z
          .enum(COMPOSIO_APPNAMES as [string, ...string[]])
          .describe("The tool name to initiate connection for."),
        usecase: z.string().describe("Explanation of the action"),
        limit: z.number().default(1).describe("Number of actions to retrieve"),
      }),
      async handler(
        call: { data: { app_name: string; usecase: string; limit: number } },
        ctx,
        agent
      ) {
        const tools = await composio_toolset.getTools({
          actions: ["COMPOSIO_RETRIEVE_ACTIONS"],
        });

        const response = await makeOpenAIRequest(
          `Retrieve actions for ${call.data.app_name} with usecase: ${call.data.usecase}`,
          tools
        );
        const tool_response = simplifyActions(
          JSON.parse(
            (await composio_toolset.handleToolCall(response)).toString()
          )
        );
        return tool_response;
      },
    },
    {
      name: "composio.executeAction",
      description:
        "Execute a specific Composio action with provided parameters. You must always call retrieveActions to get the exact name of the action_name else it will break.",
      schema: z.object({
        action_name: z
          .string()
          .describe(
            "Name of the action to execute (e.g., 'GMAIL_SEND_EMAIL'). Must be exactly one of the action name returned by retrieveActions"
          ),
        request: z
          .record(z.any())
          .describe(
            "Request data parameters as defined in the action's schema"
          ),
      }),
      async handler(
        call: { data: { action_name: string; request: Record<string, any> } },
        ctx,
        agent
      ) {
        const tools = await composio_toolset.getTools({
          actions: ["COMPOSIO_EXECUTE_ACTION"],
        });

        // Create a structured message that includes both the action name and its parameters
        const executionMessage = {
          action: call.data.action_name,
          parameters: call.data.request,
        };

        const response = await makeOpenAIRequest(
          `Execute action ${call.data.action_name} with parameters: ${JSON.stringify(executionMessage)}`,
          tools
        );
        const tool_response = await composio_toolset.handleToolCall(response);
        return tool_response;
      },
    },
  ],
});
