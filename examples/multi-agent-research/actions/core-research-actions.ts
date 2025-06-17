import { action } from "@daydreamsai/core";
import { z } from "zod";
import { researchMemory } from "../utils/research-memory.js";
import {
  getAdaptiveSearchConfig,
  determineDateFilter,
  filterAndRankResults,
  executeSearchWithRetry,
} from "../utils/research-helpers.js";

// Action: Execute Research Searches with Advanced Tavily Integration
export const executeResearchSearchesAction = action({
  name: "research.executeResearchSearches",
  description:
    "Execute multiple parallel research searches using Tavily with enhanced quality filtering and ranking",
  schema: z.object({
    taskId: z.string().describe("The task ID for the subagent"),
    searchQueries: z
      .array(z.string())
      .describe("Array of search queries to execute"),
    synthesisInstructions: z
      .string()
      .describe("Instructions for synthesizing the search results"),
  }),
  memory: researchMemory,
  async handler({ taskId, searchQueries, synthesisInstructions }, ctx, agent) {
    try {
      ctx.memory.status = "searching";
      ctx.memory.searchQueries = searchQueries;
      ctx.memory.findings = ctx.memory.findings || [];
      ctx.memory.sources = ctx.memory.sources || [];

      // Get Tavily API key
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        ctx.memory.status = "failed";
        return `❌ Error: TAVILY_API_KEY environment variable not found. Please set your Tavily API key to enable research searches.

**Setup Instructions:**
1. Get API key from https://tavily.com
2. Set environment variable: export TAVILY_API_KEY="your-key-here"
3. Restart the application`;
      }

      // Initialize Tavily client
      const { tavily } = await import("@tavily/core");
      const tavilyClient = tavily({
        apiKey: tavilyApiKey,
      });

      // Get adaptive search configuration
      const searchConfig = getAdaptiveSearchConfig(
        searchQueries.length,
        ctx.memory
      );

      // Enhanced date filtering
      const dateFilters = {
        year: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        month: new Date(
          new Date().setMonth(new Date().getMonth() - 12)
        ).toISOString(),
      };

      // Execute searches in parallel with retry logic
      const searchPromises = searchQueries.map((query, index) => {
        const dateFilter = determineDateFilter(query, dateFilters);
        const config = {
          ...searchConfig,
          ...(dateFilter && { published_after: dateFilter }),
        };

        return executeSearchWithRetry(tavilyClient, query, config, index);
      });

      const searchResults = await Promise.all(searchPromises);

      // Process and rank results
      const allResults = searchResults.flatMap((result) => {
        if (result.error) {
          console.warn(`Search failed for "${result.query}": ${result.error}`);
          return [];
        }

        // Apply quality filtering and ranking
        const rankedResults = filterAndRankResults(
          result.results,
          result.query
        );

        return rankedResults.map((item) => ({
          ...item,
          searchQuery: result.query,
          qualityIndicator:
            item.qualityScore > 0.7
              ? "🏆 High Authority"
              : item.qualityScore > 0.5
              ? "✅ Good Quality"
              : "📋 Standard",
          publishedIndicator:
            item.published_date &&
            new Date(item.published_date) >
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ? "🆕 Recent"
              : "",
        }));
      });

      // Create synthesis prompt with all search results
      const synthesisPrompt = `You are a specialized research expert. Analyze the following search results and synthesize them according to the instructions.

**SYNTHESIS INSTRUCTIONS:** ${synthesisInstructions}

**SEARCH RESULTS:**
${allResults
  .map(
    (result, i) => `
**Result ${i + 1}:** ${result.qualityIndicator} ${result.publishedIndicator}
**Query:** "${result.searchQuery}"
**Title:** ${result.title}
**URL:** ${result.url}
**Content:** ${result.content}
**Published:** ${result.published_date || "Date not available"}
---`
  )
  .join("\n")}

**YOUR TASK:**
1. Extract key findings from these search results
2. Focus on authoritative sources (🏆 High Authority, ✅ Good Quality)
3. Synthesize information according to the provided instructions
4. Include source URLs for verification
5. Organize findings logically and coherently
6. Flag any contradictions or uncertainties you discover

Generate your synthesis now:`;

      // Store results in memory
      ctx.memory.searchResults = allResults;
      ctx.memory.synthesisPrompt = synthesisPrompt;
      ctx.memory.status = "synthesizing";

      // Generate synthesis using the prompt (this is where the model processes the results)
      const resultSummary = `📊 **SEARCH EXECUTION COMPLETE**

**Searches Performed:** ${searchQueries.length}
**Results Retrieved:** ${allResults.length}
**High Authority Sources:** ${
        allResults.filter((r) => r.qualityIndicator.includes("🏆")).length
      }
**Recent Content:** ${
        allResults.filter((r) => r.publishedIndicator.includes("🆕")).length
      }

**Search Quality Analysis:**
${searchResults
  .map(
    (result, i) =>
      `${i + 1}. "${result.query}" - ${
        result.error ? "❌ Failed" : `✅ ${result.results.length} results`
      }`
  )
  .join("\n")}

**🧠 SYNTHESIS TASK:**
${synthesisPrompt}

**📋 NEXT STEP:** Process the search results according to your role expertise and provide your synthesized findings.`;

      // Update shared session memory for the lead agent
      for (const session of Array.from(
        ctx.actionMemory.activeSessions.values()
      )) {
        const subagentResult = session.subagentResults.find(
          (result: any) => result.taskId === taskId
        );
        if (subagentResult) {
          // This will be updated after synthesis
          subagentResult.status = "synthesizing";
          break;
        }
      }

      return resultSummary;
    } catch (error) {
      ctx.memory.status = "failed";
      return `❌ Research search failed: ${error}

**Error Details:** ${error instanceof Error ? error.message : String(error)}

**Troubleshooting:**
1. Check your TAVILY_API_KEY environment variable
2. Verify internet connectivity
3. Try with fewer or simpler search queries
4. Check Tavily API status and limits`;
    }
  },
});

// Action: Synthesize Research Report
export const synthesizeReportAction = action({
  name: "research.synthesizeReport",
  description:
    "🧠 Generate a comprehensive natural language research report synthesizing all subagent findings",
  schema: z.object({
    sessionId: z.string().describe("The research session ID to synthesize"),
  }),
  memory: researchMemory,
  async handler({ sessionId }, ctx, agent) {
    const session = ctx.actionMemory.activeSessions.get(sessionId);
    if (!session) {
      return `❌ Research session ${sessionId} not found.`;
    }

    // Collect all findings from subagents
    const allFindings = session.subagentResults.flatMap((r) => r.findings);
    const allSources = Array.from(
      new Set(session.subagentResults.flatMap((r) => r.sources))
    );

    if (allFindings.length === 0) {
      return `❌ No findings were collected during this research session. Cannot generate report.`;
    }

    // Store synthesis context for the model
    ctx.memory.synthesisContext = {
      sessionId,
      query: session.query,
      complexity: session.plan?.complexity || "moderate",
      subagentCount: session.subagentResults.length,
      findingsCount: allFindings.length,
      sourcesCount: allSources.length,
    };

    return `🧠 **RESEARCH SYNTHESIS READY**

You are an expert research analyst tasked with synthesizing findings from a multi-agent research investigation.

**📋 RESEARCH CONTEXT:**
- **Original Query:** "${session.query}"
- **Research Complexity:** ${session.plan?.complexity || "moderate"}
- **Specialized Subagents:** ${session.subagentResults.length}
- **Total Findings:** ${allFindings.length}
- **Unique Sources:** ${allSources.length}

**📄 ALL RESEARCH FINDINGS:**
${allFindings
  .map((finding: string, i: number) => `${i + 1}. ${finding}`)
  .join("\n\n")}

**🎯 YOUR SYNTHESIS TASK:**
Write a comprehensive, natural language research report that synthesizes all the above findings into a coherent narrative. Your report should:

1. **Provide clear answers** to the original research query
2. **Synthesize key insights** from across all findings  
3. **Identify patterns and themes** that emerged
4. **Present information in a logical flow** (not just a list)
5. **Write in engaging, accessible prose** (not bullet points)
6. **Include specific data and examples** from the findings
7. **Note any contradictions or uncertainties** discovered
8. **Provide a clear conclusion** that directly addresses the original query

**IMPORTANT GUIDELINES:** 
- Do NOT just summarize each finding individually
- DO synthesize findings into themes and insights
- Write as if explaining to an intelligent audience who wants to understand the topic
- Use natural, flowing prose rather than formal academic language
- Focus on what was actually discovered, not methodology

**📋 NEXT STEP:** Write your comprehensive synthesis report as a natural language narrative that brings together all these research findings into a coherent, insightful analysis.

Begin your synthesis report now.`;
  },
});

// Action: Check Research Progress and Auto-Synthesize
export const checkResearchProgressAction = action({
  name: "research.checkResearchProgress",
  description:
    "🔍 Check if all subagents have completed their research and automatically synthesize results if ready",
  schema: z.object({
    sessionId: z.string().describe("The research session ID to check"),
  }),
  memory: researchMemory,
  async handler({ sessionId }, ctx, agent) {
    const session = ctx.actionMemory.activeSessions.get(sessionId);
    if (!session) {
      return `❌ Research session ${sessionId} not found.`;
    }

    // Check completion status of all subagents
    const totalSubagents = session.subagentResults.length;
    const completedSubagents = session.subagentResults.filter(
      (r) => r.status === "complete"
    ).length;
    const failedSubagents = session.subagentResults.filter(
      (r) => r.status === "failed"
    ).length;
    const workingSubagents = session.subagentResults.filter(
      (r) => r.status === "working"
    ).length;

    // If all subagents are done (completed or failed), trigger synthesis
    if (workingSubagents === 0 && totalSubagents > 0) {
      session.status = "synthesizing";

      try {
        // All subagents complete - trigger synthesis action
        const allFindings = session.subagentResults.flatMap((r) => r.findings);
        const allSources = Array.from(
          new Set(session.subagentResults.flatMap((r) => r.sources))
        );

        return `✅ **RESEARCH COMPLETE!** All ${completedSubagents} subagents have finished their investigations.

📊 **FINAL RESEARCH SUMMARY:**
- **Query:** "${session.query}"
- **Complexity:** ${session.plan?.complexity}
- **Subagents Deployed:** ${totalSubagents} (${completedSubagents} successful, ${failedSubagents} failed)
- **Total Findings:** ${allFindings.length}
- **Unique Sources:** ${allSources.length}

🧠 **NEXT STEP:** All research data has been collected. Now synthesize these findings into a comprehensive report.

**RECOMMENDED ACTION:** Call \`research.synthesizeReport\` with sessionId "${sessionId}" to generate the final research report that brings together all subagent findings into a coherent analysis.`;
      } catch (error) {
        session.status = "failed";
        return `❌ Failed to synthesize research results: ${error}

Research data is available but synthesis failed. You can review the individual subagent findings.`;
      }
    } else {
      // Research still in progress
      return `📊 **RESEARCH IN PROGRESS**

**Session:** ${sessionId}
**Status:** ${session.status}
**Progress:** ${completedSubagents}/${totalSubagents} subagents completed

**Subagent Status:**
${session.subagentResults
  .map((r) => `- ${r.role}: ${r.status} (${r.findings?.length || 0} findings)`)
  .join("\n")}

**🎯 NEXT STEP:** Wait for remaining subagents to complete, then research will automatically synthesize into a comprehensive report.`;
    }
  },
});

// Action: List Research Sessions
export const listSessionsAction = action({
  name: "research.listResearchSessions",
  description: "List all research sessions",
  schema: z.object({}),
  memory: researchMemory,
  async handler(params, ctx) {
    const active = Array.from(ctx.actionMemory.activeSessions.values());
    const completed = ctx.actionMemory.completedSessions.slice(-5);

    return {
      activeResearch: active.map((s) => ({
        id: s.id,
        query: s.query,
        status: s.status,
        startTime: new Date(s.startTime).toISOString(),
      })),
      recentCompleted: completed.map((s) => ({
        id: s.id,
        query: s.query,
        status: s.status,
        duration: s.endTime
          ? `${Math.round((s.endTime - s.startTime) / 1000)}s`
          : "unknown",
      })),
    };
  },
});

// Action: Get Research Results
export const getResultsAction = action({
  name: "research.getResearchResults",
  description: "Get results from a research session",
  schema: z.object({
    sessionId: z.string().describe("Research session ID"),
  }),
  memory: researchMemory,
  async handler({ sessionId }, ctx) {
    const active = ctx.actionMemory.activeSessions.get(sessionId);
    const completed = ctx.actionMemory.completedSessions.find(
      (s) => s.id === sessionId
    );

    const session = active || completed;

    if (!session) {
      return `Research session "${sessionId}" not found.`;
    }

    return {
      session: {
        id: session.id,
        query: session.query,
        status: session.status,
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime
          ? new Date(session.endTime).toISOString()
          : null,
      },
      plan: session.plan,
      results: session.subagentResults,
      finalReport: session.finalReport,
    };
  },
});
