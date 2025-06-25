import { type TavilyClient } from "@tavily/core";
import { generateText, type LanguageModelV1 } from "ai";
import {
  finalReportPrompt,
  searchResultsParser,
  searchResultsPrompt,
} from "./prompts";
import { researchSchema, searchResultsSchema } from "./schemas";
import {
  action,
  task,
  memory,
  extension,
  type Debugger,
} from "@daydreamsai/core";
import { v7 as randomUUUIDv7 } from "uuid";
import * as z from "zod/v4";

export type Research = {
  id: string;
  name: string;
  queries: {
    query: string;
    goal: string;
  }[];
  questions: string[];
  learnings: string[];
  status: "in_progress" | "done" | "cancelled";
  metadata: {
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    cancelledAt?: number;
    totalQueries: number;
    totalLearnings: number;
    depth: number;
    creator?: string;
  };
};

export type ResearchProgress = {
  currentDepth: number;
  totalDepth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
};

type SearchQueryParams = {
  model: LanguageModelV1;
  contextId: string;
  research: Research;
  tavilyClient: TavilyClient;
  query: Research["queries"][number];
};

const researchQueryTask = task(
  "deep-research:query",
  async (
    { model, contextId, tavilyClient, research, query }: SearchQueryParams,
    { callId, debug }
  ) => {
    try {
      // Track domains we've already seen to ensure diversity
      const seenDomains = new Set<string>();
      research.learnings.forEach((learning) => {
        if (learning.startsWith("Source:")) {
          const domainMatch = learning.match(/Source: ([^/]+)/);
          if (domainMatch && domainMatch[1]) {
            seenDomains.add(domainMatch[1]);
          }
        }
      });

      // Enhanced search with better parameters
      const { results } = await tavilyClient.search(query.query, {
        maxResults: 8, // Increased from 5 to get more diverse sources
        searchDepth: "advanced",
        includeImages: false,
        includeAnswer: true,
        includeDomains: [], // Could be configured to target specific domains
        excludeDomains: Array.from(seenDomains), // Avoid domains we've already seen
      });

      // Filter results to ensure quality and diversity
      const filteredResults = results
        // Remove very short content
        .filter((result) => result.content.length > 100)
        // Prioritize results with titles
        .sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))
        // Take top 5
        .slice(0, 5);

      debug(
        contextId,
        ["research-query-results-data", callId],
        JSON.stringify(
          {
            research,
            goal: query.goal,
            query: query.query,
            results: filteredResults,
          },
          null,
          2
        )
      );

      const system = searchResultsPrompt({
        research,
        goal: query.goal,
        query: query.query,
        results: filteredResults,
        schema: searchResultsSchema,
      });

      debug(contextId, ["research-query-results-prompt", callId], system);

      const res = await generateText({
        model,
        abortSignal: AbortSignal.timeout(60_000),
        system,
        messages: [
          {
            role: "assistant",
            content: "<think>",
          },
        ],
      });

      const text = "<think>" + res.text;

      debug(contextId, ["research-query-results-response", callId], text);

      try {
        const { think, output } = searchResultsParser(text);
        if (output) {
          return {
            think,
            learnings: output.learnings,
            followUpQueries: output.followUpQueries,
          };
        } else {
          throw new Error("Failed to parse search results output");
        }
      } catch (parseError) {
        debug(
          contextId,
          ["research-query-results-parse-error", callId],
          String(parseError)
        );

        // Fallback to a simplified response when parsing fails
        return {
          think: "Parsing error occurred",
          learnings: [
            {
              content: `Failed to parse results for query: ${query.query}. Please review the search manually.`,
              references: [],
            },
          ],
          followUpQueries: [],
        };
      }
    } catch (searchError) {
      debug(
        contextId,
        ["research-query-search-error", callId],
        String(searchError)
      );

      // Return a graceful failure that allows the research to continue
      return {
        think: "Search error occurred",
        learnings: [
          {
            content: `Error occurred while researching: ${query.query}. ${
              searchError instanceof Error
                ? searchError.message
                : String(searchError)
            }`,
            references: [],
          },
        ],
        followUpQueries: [],
      };
    }
  }
);

const generateResearchReport = task(
  "deep-research:generate-report",
  async (
    {
      model,
      contextId,
      research,
    }: { model: LanguageModelV1; contextId: string; research: Research },
    { callId, debug }
  ) => {
    const reportPrompt = finalReportPrompt({ research });

    debug(
      contextId,
      ["research-report-data", callId],
      JSON.stringify(research, null, 2)
    );

    debug(contextId, ["research-report-prompt", callId], reportPrompt);

    const res = await generateText({
      model,
      system: reportPrompt,
      messages: [
        {
          role: "assistant",
          content: "<think>",
        },
      ],
    });

    debug(
      contextId,
      ["research-report-response", callId],
      "<think>" + res.text
    );

    const report = res.text.slice(res.text.lastIndexOf("</think>"));
    return report;
  }
);

export async function startDeepResearch({
  contextId,
  model,
  research,
  tavilyClient,
  maxDepth,
  onProgress,
  debug,
}: {
  contextId: string;
  model: LanguageModelV1;
  research: Research;
  tavilyClient: TavilyClient;
  maxDepth: number;
  onProgress?: (progress: ResearchProgress) => void;
  debug: Debugger;
}) {
  debug(contextId, ["deep-research-start"], "Starting deep research");

  let queries = research.queries.slice();
  let depth = 1;

  const progress: ResearchProgress = {
    currentDepth: depth,
    totalDepth: maxDepth,
    totalQueries: queries.length,
    completedQueries: 0,
  };

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  console.log("=======STARTING-DEEP-RESEARCH=======");

  while (queries.length > 0 && depth <= maxDepth) {
    const _queries = queries.slice();
    queries = [];

    reportProgress({
      currentDepth: depth,
      totalQueries: progress.totalQueries,
    });

    // Process queries in parallel but track progress for each
    const results = await Promise.all(
      _queries.map(async (query, index) => {
        reportProgress({
          currentQuery: query.query,
        });

        const result = await researchQueryTask(
          {
            contextId,
            model,
            query,
            research,
            tavilyClient,
          },
          { debug }
        );

        // Update progress after each query completes
        reportProgress({
          completedQueries: progress.completedQueries + 1,
        });

        return result;
      })
    );

    // Process results to extract follow-up queries
    results.forEach((result) => {
      if (result && result.followUpQueries) {
        queries.push(...result.followUpQueries);
      }

      if (result && result.learnings) {
        // Add learnings to the research object
        research.learnings.push(
          ...result.learnings.map((learning) => learning.content)
        );
      }
    });

    depth++;

    reportProgress({
      totalQueries: progress.totalQueries + queries.length,
    });
  }

  const report = await generateResearchReport(
    {
      contextId,
      model,
      research,
    },
    { debug }
  );

  debug(contextId, ["deep-research-complete"], "Research completed");
  return report;
}

type ResearchMemory = {
  researches: Research[];
  activeResearchIds: Set<string>;
};

const researchMemory = memory<ResearchMemory>({
  key: "research",
  create() {
    return {
      researches: [],
      activeResearchIds: new Set(),
    };
  },
});

const startDeepResearchAction = action({
  name: "start-deep-research",
  schema: researchSchema,
  memory: researchMemory,
  async handler(call, ctx, agent) {
    const now = Date.now();
    const research: Research = {
      ...call.data,
      learnings: [],
      status: "in_progress",
      metadata: {
        createdAt: now,
        updatedAt: now,
        totalQueries: call.data.queries.length,
        totalLearnings: 0,
        depth: 0,
        creator: ctx.id,
      },
    };

    ctx.actionMemory.researches.push(research);
    ctx.actionMemory.activeResearchIds.add(research.id);

    startDeepResearch({
      model: agent.reasoningModel ?? agent.model,
      research,
      tavilyClient: agent.container.resolve("tavily"),
      maxDepth: call.data.maxDepth ?? 2,
      contextId: ctx.id,
      debug: agent.debugger,
      onProgress: (progress) => {
        // Update metadata as research progresses
        research.metadata.updatedAt = Date.now();
        research.metadata.totalQueries = progress.totalQueries;
        research.metadata.totalLearnings = research.learnings.length;
        research.metadata.depth = progress.currentDepth;
      },
    })
      .then((res) => {
        ctx.workingMemory.results.push({
          ref: "action_result",
          id: randomUUUIDv7(),
          callId: call.id,
          data: res,
          name: call.name,
          timestamp: Date.now(),
          processed: false,
        });

        research.status = "done";
        research.metadata.completedAt = Date.now();
        ctx.actionMemory.activeResearchIds.delete(research.id);

        return agent.run({
          context: ctx.context,
          args: ctx.args,
        });
      })
      .catch((err) => {
        agent.debugger(ctx.id, ["deep-research-error"], String(err));
        research.status = "done";
        research.metadata.completedAt = Date.now();
        ctx.actionMemory.activeResearchIds.delete(research.id);
      });

    return "Research created!";
  },
});

const cancelResearchAction = action({
  name: "cancel-deep-research",
  schema: z.object({
    id: z.string().describe("ID of the research to cancel"),
  }),
  memory: researchMemory,
  enabled: (ctx) =>
    ctx.actionMemory.researches.some((r) => r.status === "in_progress"),
  async handler(params, ctx) {
    const { id } = params;
    const research = ctx.actionMemory.researches.find((r) => r.id === id);

    if (!research) {
      return `Research with ID ${id} not found.`;
    }

    if (research.status !== "in_progress") {
      return `Research with ID ${id} is not in progress (current status: ${research.status}).`;
    }

    research.status = "cancelled";
    research.metadata.cancelledAt = Date.now();
    research.metadata.updatedAt = Date.now();
    ctx.actionMemory.activeResearchIds.delete(research.id);

    return `Research "${research.name}" (ID: ${id}) has been cancelled.`;
  },
});

const listResearchesAction = action({
  name: "list-researches",
  schema: z.object({}),
  memory: researchMemory,
  enabled: (ctx) => ctx.actionMemory.researches.length > 0,
  async handler(params, ctx) {
    const researches = ctx.actionMemory.researches.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      queriesCount: r.queries.length,
      learningsCount: r.learnings.length,
    }));

    return JSON.stringify(researches, null, 2);
  },
});

const resumeResearchAction = action({
  name: "resume-research",
  schema: z.object({
    id: z.string().describe("ID of the research to resume"),
    maxDepth: z
      .number()
      .default(2)
      .optional()
      .describe("Max depth of the research"),
  }),
  memory: researchMemory,
  enabled: (ctx) =>
    ctx.actionMemory.researches.some(
      (r) => r.status === "cancelled" || r.status === "done"
    ),
  async handler(call, ctx, agent) {
    const { id, maxDepth } = call.data;
    const research = ctx.actionMemory.researches.find((r) => r.id === id);

    if (!research) {
      return `Research with ID ${id} not found.`;
    }

    if (research.status === "in_progress") {
      return `Research with ID ${id} is already in progress.`;
    }

    // Reset the research status and update metadata
    research.status = "in_progress";
    research.metadata.updatedAt = Date.now();
    // Clear completion or cancellation timestamps
    delete research.metadata.completedAt;
    delete research.metadata.cancelledAt;

    ctx.actionMemory.activeResearchIds.add(research.id);

    startDeepResearch({
      model: agent.reasoningModel ?? agent.model,
      research,
      tavilyClient: agent.container.resolve("tavily"),
      maxDepth: maxDepth ?? 2,
      contextId: ctx.id,
      debug: agent.debugger,
      onProgress: (progress) => {
        // Update metadata as research progresses
        research.metadata.updatedAt = Date.now();
        research.metadata.totalQueries = progress.totalQueries;
        research.metadata.totalLearnings = research.learnings.length;
        research.metadata.depth = progress.currentDepth;
      },
    })
      .then((res) => {
        ctx.workingMemory.results.push({
          ref: "action_result",
          id: randomUUUIDv7(),
          callId: call.id,
          data: res,
          name: call.name,
          timestamp: Date.now(),
          processed: false,
        });

        research.status = "done";
        research.metadata.completedAt = Date.now();
        research.metadata.updatedAt = Date.now();
        ctx.actionMemory.activeResearchIds.delete(research.id);

        return agent.run({
          context: ctx.context,
          args: ctx.args,
        });
      })
      .catch((err) => {
        agent.debugger(ctx.id, ["deep-research-error"], String(err));
        research.status = "done";
        research.metadata.completedAt = Date.now();
        research.metadata.updatedAt = Date.now();
        ctx.actionMemory.activeResearchIds.delete(research.id);
      });

    return `Resuming research "${research.name}" (ID: ${id}).`;
  },
});

export const deepResearch = extension({
  name: "deep-research",
  actions: [
    startDeepResearchAction,
    cancelResearchAction,
    listResearchesAction,
    resumeResearchAction,
  ],
});
