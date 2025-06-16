import { action, context, extension, memory } from "@daydreamsai/core";
import { z } from "zod";

// Types for our multi-agent research system
type ResearchSession = {
  id: string;
  query: string;
  status: "planning" | "researching" | "synthesizing" | "complete" | "failed";
  startTime: number;
  endTime?: number;
  plan?: ResearchPlan;
  subagentResults: SubagentResult[];
  finalReport?: string;
};

type ResearchPlan = {
  complexity: "simple" | "moderate" | "complex";
  subagents: SubagentTask[];
  strategy: string;
};

type SubagentTask = {
  id: string;
  role: string;
  objective: string;
  outputFormat: string;
  estimatedQueries: number;
  taskBoundaries?: string;
  preferredSources?: string;
};

type SubagentResult = {
  taskId: string;
  role: string;
  findings: string[];
  sources: string[];
  status: "working" | "complete" | "failed";
  error?: string;
};

// Shared memory for research coordination
const researchMemory = memory<{
  activeSessions: Map<string, ResearchSession>;
  completedSessions: ResearchSession[];
  activeTasks: Map<string, SubagentTask>;
}>({
  key: "multi-agent-research",
  create() {
    return {
      activeSessions: new Map(),
      completedSessions: [],
      activeTasks: new Map(),
    };
  },
});

// Lead Agent Context - orchestrates research through actions
const leadAgentContext = context({
  type: "lead-agent",
  maxSteps: 200,
  schema: z.object({
    sessionId: z.string(),
  }),
  create: () => ({
    currentSession: null as ResearchSession | null,
    currentPlan: null as ResearchPlan | null,
  }),
  render: ({ memory, args }) => {
    const session = memory.currentSession;
    if (!session)
      return "No active research session. Use research.createResearchPlan to begin.";

    const completedCount = session.subagentResults.filter(
      (r) => r.status === "complete"
    ).length;
    const workingCount = session.subagentResults.filter(
      (r) => r.status === "working"
    ).length;
    const failedCount = session.subagentResults.filter(
      (r) => r.status === "failed"
    ).length;
    const totalCount = session.subagentResults.length;

    return `
# Lead Research Agent Status

**Session ID:** ${args.sessionId}
**Query:** ${session.query}
**Status:** ${session.status}
**Complexity:** ${session.plan?.complexity || "Not determined"}

## Current Plan
${
  session.plan
    ? `
Strategy: ${session.plan.strategy}
Subagents: ${session.plan.subagents.length} planned
`
    : "🔍 No plan created yet - call research.createResearchPlan first"
}

## Progress Tracking
- Total subagents: ${totalCount}
- ✅ Completed: ${completedCount}
- ⏳ Working: ${workingCount}
- ❌ Failed: ${failedCount}

${
  totalCount > 0 && workingCount === 0
    ? `
🚨 **ALL SUBAGENTS COMPLETE!** 🚨
⭐ NEXT STEP: Call research.synthesizeResearchResults with sessionId "${args.sessionId}"
🎯 This will create and present the final comprehensive report to the user!
`
    : workingCount > 0
    ? `
⏳ Research in progress... ${workingCount} subagent(s) still working.
Wait for all to complete before calling research.synthesizeResearchResults.
`
    : totalCount === 0
    ? `
📋 Ready to delegate tasks. Use research.delegateResearchTask to assign work to subagents.
`
    : ""
}

## Subagent Details
${session.subagentResults
  .map(
    (r) =>
      `- ${r.role}: ${r.status} (${r.findings.length} findings, ${r.sources.length} sources)`
  )
  .join("\n")}

**Remember:** Your job isn't complete until you call research.synthesizeResearchResults and present the final report!
    `;
  },
  instructions: `You are the Lead Research Agent in a multi-agent system. Your role is to orchestrate comprehensive research and ALWAYS deliver a complete final report.

**🎯 YOUR SUCCESS METRIC: DELIVER A COMPREHENSIVE FINAL REPORT TO THE USER**

**🧠 THINKING PROCESS (Use before each action):**
Before taking any action, think through:
- What information do I still need to answer the user's query?
- Which aspects require specialized subagents vs. which I can handle directly?
- Are all my subagents complete, or do I need to wait longer?
- What's my specific next action to move toward the final report?
- Do I have sufficient findings to synthesize, or need more research?

**MANDATORY 5-STEP WORKFLOW:**
1. **Plan research** → research.createResearchPlan
2. **Delegate tasks** → research.delegateResearchTask (for each subagent)
3. **Start research** → research.startSubagentResearch (for each subagent)  
4. **Monitor completion** → Wait for all subagents to finish
5. **🚨 SYNTHESIZE & PRESENT REPORT** → research.synthesizeResearchResults + present full report to user

**⚠️ CRITICAL: YOU MUST ALWAYS END WITH A COMPLETE FINAL REPORT**
- After all subagents complete research, you MUST call research.synthesizeResearchResults
- Present the COMPLETE synthesized report in your response - don't just say "report is ready"
- Include executive summary, key findings, methodology, sources, and analysis quality
- The user expects a comprehensive research deliverable - this is your primary job

**EFFORT SCALING HEURISTICS (from Anthropic Research):**
- **Simple fact-finding**: 1 agent, 3-10 tool calls total
- **Direct comparisons**: 2-4 subagents, 10-15 calls each
- **Complex multi-domain research**: 5-10+ subagents with clearly divided responsibilities

**COMPLETION CRITERIA (Check before synthesis):**
✅ All subagents show "complete" status (not "working")
✅ Minimum findings threshold met (15+ findings total across all subagents)
✅ All major research domains covered by subagents
✅ No critical gaps in the research scope
🎯 WHEN ALL CRITERIA MET: Immediately call research.synthesizeResearchResults

**Research Principles:**
- Think like your subagents: give clear objectives and boundaries
- Scale effort to complexity using the heuristics above
- Divide labor effectively: prevent duplicate work with clear task boundaries  
- Start wide, then narrow: broad exploration before drilling into specifics
- Monitor progress continuously and synthesize as soon as ready

Remember: The user is waiting for a research report. Your job isn't complete until you've delivered comprehensive findings with proper source attribution.`,
});

// Subagent Context - handles specialized research tasks
const subagentContext = context({
  type: "subagent",
  maxSteps: 200,
  schema: z.object({
    taskId: z.string(),
    role: z.string(),
  }),
  create: () => ({
    task: null as SubagentTask | null,
    findings: [] as string[],
    sources: [] as string[],
    status: "ready" as "ready" | "working" | "complete" | "failed",
    searchesPerformed: 0,
  }),
  render: ({ memory, args }) => `
# Research Subagent: ${args.role}

**Task ID:** ${args.taskId}
**Status:** ${memory.status}
**Searches Performed:** ${memory.searchesPerformed}

## Current Task
${
  memory.task
    ? `
**Objective:** ${memory.task.objective}
**Output Format:** ${memory.task.outputFormat}
**Estimated Queries:** ${memory.task.estimatedQueries}
`
    : "No task assigned"
}

## Findings Summary
- Total findings: ${memory.findings.length}
- Sources collected: ${memory.sources.length}

You are a specialized research subagent. Follow these guidelines:
- Start with broad, short queries then progressively narrow focus
- Prefer authoritative sources over SEO content  
- Execute 3-6 parallel searches for comprehensive coverage
- Synthesize findings according to your role expertise

Use 'execute-research-searches' action to perform your research.
  `,
  instructions: `You are a specialized Research Subagent with domain expertise in your assigned role.

**🎯 PRIMARY MISSION: Execute your assigned research task with clear boundaries and deliver high-quality findings**

**IMPORTANT: When the Lead Agent provides you with search queries via 'research.startSubagentResearch', immediately execute them using 'research.executeResearchSearches'.**

**🧠 THINKING PROCESS (Use interleaved thinking):**
After each search result, think through:
- What did I learn from this search?
- What gaps remain in my assigned domain?
- Should I adjust my next query based on these findings?
- Am I staying within my task boundaries?
- Do I have sufficient authoritative sources?

**🔍 ANTHROPIC-INSPIRED RESEARCH HEURISTICS:**
1. **Start Wide, Then Narrow**: Begin with broad queries, progressively focus
2. **Source Quality First**: Prioritize primary sources, official sites, academic papers over SEO content
3. **Tool Selection**: Match search tools to research intent - use the right tool for the task
4. **Parallel Execution**: Use 3-6 searches simultaneously for comprehensive coverage
5. **Quality Assessment**: Evaluate source authority, recency, and relevance continuously
6. **Boundary Respect**: Stay within your assigned domain - don't duplicate other subagents' work

**⚡ EXECUTION PROTOCOL:**
When you receive generated search queries, execute them immediately with 'research.executeResearchSearches'
**CRITICAL**: Always include the taskId provided by the Lead Agent so your findings are properly saved.

**🎯 SUCCESS CRITERIA:**
- Focus on your specific research domain only
- Gather 15+ high-quality findings minimum
- Include authoritative sources with each finding
- Adapt queries based on intermediate results
- Complete within estimated query budget

After completing research, your findings will be automatically collected for synthesis by the Lead Agent.`,
});

// Action: Create Research Plan (replaces planning phase)
const createResearchPlanAction = action({
  name: "research.createResearchPlan",
  description:
    "Analyze a research query and create a detailed research plan with specialized subagent tasks",
  schema: z.object({
    query: z.string().describe("The research question or topic to analyze"),
    maxSubagents: z.number().min(1).max(10).default(5).optional(),
  }),
  memory: researchMemory,
  async handler({ query, maxSubagents = 5 }, ctx, agent) {
    // Determine complexity based on query analysis
    const complexity = analyzeComplexity(query);
    const numSubagents = getSubagentCount(complexity, maxSubagents);

    // Create the research session
    const sessionId = `research-${Date.now()}`;
    const session: ResearchSession = {
      id: sessionId,
      query,
      status: "planning",
      startTime: Date.now(),
      subagentResults: [],
    };

    ctx.actionMemory.activeSessions.set(sessionId, session);

    return `I'll create a comprehensive research plan for: "${query}"

**Analysis:**
- Query complexity: ${complexity}
- Recommended subagents: ${numSubagents}
- Research strategy: ${getResearchStrategy(complexity)}

**Proposed Research Plan:**
${createDetailedPlan(query, complexity, numSubagents)}

The plan divides the research into specialized subtasks with clear boundaries to prevent overlap and ensure comprehensive coverage. Each subagent will have specific objectives and output requirements.

Session ID: ${sessionId}
Ready to delegate tasks to subagents.`;
  },
});

// Action: Delegate Research Task (replaces subagent spawning)
const delegateResearchTaskAction = action({
  name: "research.delegateResearchTask",
  description:
    "Delegate a specific research task to a specialized subagent with clear boundaries and detailed instructions",
  schema: z.object({
    sessionId: z.string().describe("The research session ID"),
    role: z
      .string()
      .describe(
        "Subagent role (e.g., 'market_researcher', 'technical_analyst')"
      ),
    objective: z
      .string()
      .describe("Primary research objective - be specific and focused"),
    outputFormat: z.string().describe("Required output format and structure"),
    taskBoundaries: z
      .string()
      .describe("What this subagent should NOT research (clear boundaries)"),
    preferredSources: z
      .string()
      .optional()
      .describe(
        "Preferred types of sources (e.g., 'academic papers, official reports, primary sources')"
      ),
    estimatedQueries: z.number().min(2).max(8).default(4),
  }),
  memory: researchMemory,
  async handler(
    {
      sessionId,
      role,
      objective,
      outputFormat,
      taskBoundaries,
      preferredSources,
      estimatedQueries,
    },
    ctx,
    agent
  ) {
    const session = ctx.actionMemory.activeSessions.get(sessionId);
    if (!session) {
      return `Error: Research session ${sessionId} not found.

**RECOMMENDED NEXT STEPS:**
1. Check active sessions with research.listResearchSessions
2. Create new research plan if session expired
3. Ensure sessionId is correct: ${sessionId}`;
    }

    const taskId = `${role}-${Date.now()}`;
    const task: SubagentTask = {
      id: taskId,
      role,
      objective,
      outputFormat,
      estimatedQueries,
      taskBoundaries,
      preferredSources,
    };

    // Store task in shared memory for the subagent to access
    ctx.actionMemory.activeTasks.set(taskId, task);

    session.subagentResults.push({
      taskId,
      role,
      findings: [],
      sources: [],
      status: "working" as const,
    });

    // Start the subagent context for this task
    await agent.run({
      context: subagentContext,
      args: { taskId, role },
    });

    session.status = "researching";

    return `✅ Successfully delegated research task to ${role} subagent:

**🎯 SUBAGENT BRIEFING:**
- **Task ID:** ${taskId}
- **Primary Objective:** ${objective}
- **DO NOT Research:** ${taskBoundaries}
- **Preferred Sources:** ${
      preferredSources || "Authoritative and primary sources"
    }
- **Output Format:** ${outputFormat}
- **Estimated Searches:** ${estimatedQueries}

**📋 SEARCH STRATEGY GUIDANCE:**
- Start with broad, short queries to explore the landscape
- Progressively narrow focus based on initial findings
- Prioritize authoritative sources over SEO-optimized content
- Use ${estimatedQueries} parallel searches for comprehensive coverage

The subagent is now active and ready to begin research with clear boundaries and objectives.`;
  },
});

// Action: Start Subagent Research
const startSubagentResearchAction = action({
  name: "research.startSubagentResearch",
  description:
    "Start research for a specific subagent by providing it with generated search queries",
  schema: z.object({
    taskId: z.string().describe("The task ID of the subagent to start"),
  }),
  memory: researchMemory,
  async handler({ taskId }, ctx, agent) {
    const task = ctx.actionMemory.activeTasks.get(taskId);
    if (!task) {
      return `Error: Task ${taskId} not found.`;
    }

    // Generate search queries based on the task objective and role
    const queries = generateSearchQueries(task);

    return `Starting research for ${task.role} subagent (Task: ${taskId})

**Generated Search Queries:**
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

**Task Objective:** ${task.objective}

The subagent should now execute these ${
      queries.length
    } search queries using the research.executeResearchSearches action.

**IMPORTANT**: When calling research.executeResearchSearches, include:
- taskId: "${taskId}" 
- searchQueries: [list of the generated queries above]
- synthesisInstructions: "${task.outputFormat}"`;
  },
});

// Helper function to generate search queries based on task - "Start Wide, Then Narrow" strategy
function generateSearchQueries(task: SubagentTask): string[] {
  const { role, objective } = task;

  // Extract key terms from objective for dynamic query generation
  const mainSubject = extractMainSubject(objective);
  const keywords = extractKeywords(objective);

  // ANTHROPIC INSIGHT: Start with broad, short queries, then progressively narrow
  // Generate role-specific search queries using "wide to narrow" strategy
  switch (role) {
    case "historical_researcher":
      return [
        `${mainSubject} history timeline formation origins`,
        `${mainSubject} historical events major milestones`,
        `${mainSubject} founding leaders key historical figures`,
        `${mainSubject} historical background ancient modern`,
        `${mainSubject} important dates chronology historical development`,
      ];
    case "political_analyst":
      return [
        `${mainSubject} government system political structure`,
        `${mainSubject} current leadership political parties`,
        `${mainSubject} political system democracy elections`,
        `${mainSubject} politics 2024 2025 current political affairs`,
      ];
    case "economic_researcher":
      return [
        `${mainSubject} economy GDP economic indicators statistics`,
        `${mainSubject} major industries economic sectors`,
        `${mainSubject} trade exports economic relationships`,
        `${mainSubject} economic challenges opportunities growth outlook`,
      ];
    case "geographic_analyst":
      return [
        `${mainSubject} geography climate regions area location`,
        `${mainSubject} population demographics statistics data`,
        `${mainSubject} major cities urban centers geography`,
        `${mainSubject} ethnic composition diversity population breakdown`,
      ];
    case "international_relations_expert":
      return [
        `${mainSubject} foreign policy international relations`,
        `${mainSubject} diplomatic relationships neighboring countries`,
        `${mainSubject} international conflicts agreements treaties`,
        `${mainSubject} international organizations UN membership`,
        `${mainSubject} regional role international affairs diplomacy`,
      ];
    case "market_researcher":
      return [
        `${mainSubject}`, // Start broad
        `${mainSubject} market`, // Add context
        `${mainSubject} market size industry analysis`, // More specific
        `${mainSubject} competitive landscape market share data`, // Most specific
      ];
    case "technical_analyst":
      return [
        `${mainSubject}`, // Start broad
        `${mainSubject} technology`, // Add context
        `${mainSubject} technical specifications features`, // More specific
        `${mainSubject} technical limitations challenges details`, // Most specific
      ];
    case "industry_expert":
      return [
        `${mainSubject}`, // Start broad
        `${mainSubject} industry`, // Add context
        `${mainSubject} regulations standards guidelines`, // More specific
        `${mainSubject} industry best practices compliance`, // Most specific
      ];
    case "competitive_analyst":
      return [
        `${mainSubject} competitive positioning market comparison`,
        `${mainSubject} competitors analysis competitive landscape`,
        `${mainSubject} market differentiation competitive advantages`,
        `${mainSubject} competitive strategy market position`,
      ];
    case "trend_analyst":
      return [
        `${mainSubject} future trends predictions forecasts`,
        `${mainSubject} emerging developments innovations trends`,
        `${mainSubject} trend analysis future outlook`,
        `${mainSubject} predictions projections future developments`,
      ];
    default:
      // Generic queries using "start wide, then narrow" strategy
      return [
        `${mainSubject}`, // Start broad
        `${mainSubject} ${keywords[0] || "overview"}`, // Add first keyword
        `${keywords.slice(0, 2).join(" ")} analysis`, // More specific with 2 keywords
        `${keywords.slice(0, 3).join(" ")} 2024 2025`, // Most specific with recent timeframe
      ];
  }
}

// Helper function to extract main subject from research objective
function extractMainSubject(objective: string): string {
  // Remove common research words and extract the main subject
  const researchWords = [
    "research",
    "analyze",
    "study",
    "investigate",
    "examine",
    "explore",
    "comprehensive",
    "detailed",
    "overview",
    "covering",
  ];
  const stopWords = [
    "the",
    "and",
    "or",
    "of",
    "in",
    "for",
    "to",
    "with",
    "a",
    "an",
  ];

  const words = objective
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !researchWords.includes(word) &&
        !stopWords.includes(word)
    );

  // Return first few meaningful words as the main subject
  return words.slice(0, 2).join(" ") || "research topic";
}

// Helper function to extract keywords from objective
function extractKeywords(objective: string): string[] {
  const stopWords = [
    "the",
    "and",
    "or",
    "of",
    "in",
    "for",
    "to",
    "with",
    "research",
    "analyze",
    "study",
    "comprehensive",
    "covering",
  ];
  return objective
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((word) => word.length > 3 && !stopWords.includes(word))
    .slice(0, 4);
}

// Enhanced search configuration based on Anthropic research insights
function getAdaptiveSearchConfig(queryCount: number, memory: any) {
  // Adaptive search depth: broader for initial queries, deeper for specific ones
  const searchDepth = queryCount <= 2 ? "basic" : "advanced";

  // More results for broader queries, fewer for specific ones
  const maxResults = queryCount <= 2 ? 6 : 4;

  // Include domains diversity requirements
  const includeDomains = [
    "edu",
    "gov",
    "org", // Authoritative sources
    "reuters.com",
    "bloomberg.com",
    "wsj.com", // News
    "nature.com",
    "science.org",
    "ieee.org", // Academic
  ];

  return {
    maxResults,
    searchDepth,
    includeDomains,
    timeout: 30000, // 30 second timeout
  };
}

// Enhanced search execution with retry logic and quality filtering
async function executeSearchWithRetry(
  tavilyClient: any,
  query: string,
  config: any,
  index: number,
  maxRetries: number = 2
): Promise<{
  query: string;
  results: any[];
  error: string | null;
  metadata: any;
}> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use different search strategies for different query positions
      const searchDepth = index === 0 ? "basic" : config.searchDepth; // First query is broad

      const result = await tavilyClient.search(query, {
        maxResults: config.maxResults,
        searchDepth,
        timeout: config.timeout,
      });

      // Filter and enhance results based on Anthropic quality guidelines
      const filteredResults = filterAndRankResults(result.results || [], query);

      return {
        query,
        results: filteredResults,
        error: null,
        metadata: {
          attempt,
          originalCount: result.results?.length || 0,
          filteredCount: filteredResults.length,
          searchDepth,
        },
      };
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          query,
          results: [],
          error: `Failed after ${maxRetries} attempts: ${String(error)}`,
          metadata: { attempt, failed: true },
        };
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return {
    query,
    results: [],
    error: "Unexpected retry failure",
    metadata: {},
  };
}

// Quality filtering to avoid SEO farms and prioritize authoritative sources
function filterAndRankResults(results: any[], query: string): any[] {
  const lowQualityPatterns = [
    /.*\.com\/.*-\d+.*/, // SEO URLs with numbers
    /.*\/blog\/.*/, // Generic blog posts (unless from authoritative domains)
    /.*clickbait.*|.*top-\d+.*|.*best-.*|.*worst.*/i, // Clickbait patterns
  ];

  const highQualityDomains = [
    ".edu",
    ".gov",
    ".org",
    "reuters.com",
    "bloomberg.com",
    "wsj.com",
    "ft.com",
    "nature.com",
    "science.org",
    "ieee.org",
    "acm.org",
    "who.int",
    "fda.gov",
    "sec.gov",
    "federalreserve.gov",
  ];

  return results
    .filter((result) => {
      // Filter out obviously low-quality content
      if (!result.content || result.content.length < 100) return false;
      if (!result.url || !result.title) return false;

      // Check for SEO farm patterns
      if (lowQualityPatterns.some((pattern) => pattern.test(result.url)))
        return false;

      // Filter out results with excessive marketing language
      const marketingWords =
        /amazing|incredible|ultimate|perfect|guaranteed|secret|miracle/gi;
      if ((result.title + result.content).match(marketingWords)?.length > 2)
        return false;

      return true;
    })
    .map((result) => {
      // Add quality score for ranking
      let qualityScore = 0;

      // Boost authoritative domains
      if (highQualityDomains.some((domain) => result.url.includes(domain))) {
        qualityScore += 10;
      }

      // Boost recent content
      if (result.published_date) {
        const date = new Date(result.published_date);
        const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 30) qualityScore += 5;
        else if (ageInDays < 365) qualityScore += 2;
      }

      // Boost content length (but not too long)
      const contentLength = result.content?.length || 0;
      if (contentLength > 500 && contentLength < 3000) qualityScore += 3;

      // Check query relevance in title
      const queryWords = query.toLowerCase().split(/\s+/);
      const titleRelevance =
        queryWords.filter((word) => result.title.toLowerCase().includes(word))
          .length / queryWords.length;
      qualityScore += Math.floor(titleRelevance * 5);

      return { ...result, qualityScore };
    })
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    .slice(0, 4); // Keep top 4 results
}

// Action: Execute Research Searches (for subagents)
const executeResearchSearchesAction = action({
  name: "research.executeResearchSearches",
  description:
    "Execute parallel web searches and synthesize findings for the assigned research task",
  schema: z.object({
    taskId: z.string().describe("The task ID this research belongs to"),
    searchQueries: z
      .array(z.string())
      .min(2)
      .max(8)
      .describe("Specific search queries to execute"),
    synthesisInstructions: z
      .string()
      .optional()
      .describe("Additional instructions for synthesizing results"),
  }),
  memory: researchMemory,
  async handler({ taskId, searchQueries, synthesisInstructions }, ctx, agent) {
    ctx.memory.status = "working";
    ctx.memory.searchesPerformed = searchQueries.length;

    try {
      const tavilyClient = agent.container.resolve("tavily") as any;

      // Adaptive search configuration based on Anthropic best practices
      const searchConfig = getAdaptiveSearchConfig(
        searchQueries.length,
        ctx.actionMemory
      );

      // Execute searches in parallel with enhanced error handling and retries
      const searchPromises = searchQueries.map(async (query, index) => {
        return executeSearchWithRetry(tavilyClient, query, searchConfig, index);
      });

      const searchResults = await Promise.all(searchPromises);

      // Extract findings and sources with enhanced quality metrics
      const findings: string[] = [];
      const sources: string[] = [];
      const searchMetadata = {
        totalSearches: searchResults.length,
        successfulSearches: searchResults.filter((r) => !r.error).length,
        totalResults: searchResults.reduce(
          (sum, r) => sum + r.results.length,
          0
        ),
        qualityStats: {
          authoritativeSources: 0,
          recentContent: 0,
          diverseDomains: new Set<string>(),
        },
      };

      searchResults.forEach(({ query, results, error, metadata }) => {
        if (error) {
          findings.push(`❌ Search failed for "${query}": ${error}`);
          return;
        }

        results.forEach((result: any) => {
          if (result.content && result.content.length > 100) {
            // Enhanced finding format with quality indicators
            const qualityIndicators = [];
            if (result.qualityScore > 10)
              qualityIndicators.push("🏆 High Authority");
            if (result.published_date) {
              const ageInDays =
                (Date.now() - new Date(result.published_date).getTime()) /
                (1000 * 60 * 60 * 24);
              if (ageInDays < 30) qualityIndicators.push("🆕 Recent");
            }

            const qualityPrefix =
              qualityIndicators.length > 0
                ? `[${qualityIndicators.join(", ")}] `
                : "";

            findings.push(
              `[${query}] ${qualityPrefix}${
                result.title
              }: ${result.content.slice(0, 350)}...`
            );

            if (result.url) {
              sources.push(result.url);

              // Track quality metrics
              const domain = new URL(result.url).hostname;
              searchMetadata.qualityStats.diverseDomains.add(domain);

              if (result.qualityScore > 10)
                searchMetadata.qualityStats.authoritativeSources++;
              if (result.published_date) {
                const ageInDays =
                  (Date.now() - new Date(result.published_date).getTime()) /
                  (1000 * 60 * 60 * 24);
                if (ageInDays < 365)
                  searchMetadata.qualityStats.recentContent++;
              }
            }
          }
        });
      });

      // Store results in context memory
      ctx.memory.findings = findings;
      ctx.memory.sources = Array.from(new Set(sources)); // Remove duplicates
      ctx.memory.status = "complete";

      // *** CRITICAL FIX: Also update the shared session memory ***
      // Find the current subagent's task in all active sessions
      for (const session of Array.from(
        ctx.actionMemory.activeSessions.values()
      )) {
        const subagentResult = session.subagentResults.find(
          (result) => result.taskId === taskId
        );

        if (subagentResult) {
          // Update the shared session memory with our findings
          subagentResult.findings = findings;
          subagentResult.sources = Array.from(new Set(sources));
          subagentResult.status = "complete";
          break;
        }
      }

      return `✅ Enhanced research completed successfully!

**🔍 Search Performance:**
- Searches executed: ${searchMetadata.totalSearches}
- Successful searches: ${searchMetadata.successfulSearches}/${
        searchMetadata.totalSearches
      }
- Total results collected: ${searchMetadata.totalResults}
- High-quality findings: ${findings.length}

**📊 Quality Metrics:**
- 🏆 Authoritative sources: ${searchMetadata.qualityStats.authoritativeSources}
- 🆕 Recent content: ${searchMetadata.qualityStats.recentContent}
- 🌐 Diverse domains: ${searchMetadata.qualityStats.diverseDomains.size}
- 🎯 Content filtered: ${
        searchMetadata.totalResults - findings.length
      } low-quality results removed

**🔎 Search Queries (Broad → Narrow Strategy):**
${searchQueries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

**📋 Key Findings (Quality-Ranked):**
${findings
  .slice(0, 5)
  .map((f, i) => `${i + 1}. ${f.slice(0, 200)}...`)
  .join("\n")}

**🔗 Authoritative Sources:**
${sources
  .slice(0, 8)
  .map((s, i) => `${i + 1}. ${s}`)
  .join("\n")}

**✨ Quality Enhancements Applied:**
- ✅ SEO farm filtering
- ✅ Authoritative domain prioritization  
- ✅ Content quality scoring
- ✅ Marketing language detection
- ✅ Recency weighting
- ✅ Query relevance ranking

Ready to report enhanced findings back to Lead Agent.`;
    } catch (error) {
      ctx.memory.status = "failed";

      // *** ALSO UPDATE SHARED MEMORY FOR FAILURES ***
      for (const session of Array.from(
        ctx.actionMemory.activeSessions.values()
      )) {
        const subagentResult = session.subagentResults.find(
          (result) => result.taskId === taskId
        );

        if (subagentResult) {
          subagentResult.status = "failed";
          subagentResult.error = `Search failure: ${String(
            error
          )}. Queries attempted: ${searchQueries.join(", ")}`;
          break;
        }
      }

      return `❌ Research failed: ${error}

**🔧 RECOMMENDED RECOVERY STEPS:**
1. **Lead Agent**: Check if other subagents completed successfully with research.getResearchResults
2. **If others succeeded**: Proceed with synthesis using available findings - don't let one failure block the entire research
3. **If critical gap**: Consider creating a replacement subagent for this research domain
4. **Alternative approach**: Adjust the research scope to work around this failure

**📋 Error Context:**
- Failed Task ID: ${taskId}
- Search queries attempted: ${searchQueries.join(", ")}
- This failure has been logged and other subagents can continue working

The Lead Agent should evaluate whether to proceed with available findings or create replacement research coverage.`;
    }
  },
});

// Action: Synthesize Research Results (replaces synthesis phase)
const synthesizeResultsAction = action({
  name: "research.synthesizeResearchResults",
  description:
    "🚨 CRITICAL: Synthesize all subagent findings into the FINAL comprehensive research report that MUST be presented to the user",
  schema: z.object({
    sessionId: z.string().describe("The research session ID to synthesize"),
    reportStyle: z
      .enum(["executive", "detailed", "academic"])
      .default("detailed")
      .optional(),
  }),
  memory: researchMemory,
  async handler({ sessionId, reportStyle = "detailed" }, ctx, agent) {
    const session = ctx.actionMemory.activeSessions.get(sessionId);
    if (!session) {
      return `Error: Research session ${sessionId} not found.`;
    }

    session.status = "synthesizing";

    // Collect all findings from subagents
    const allFindings = session.subagentResults.flatMap((r) => r.findings);
    const allSources = Array.from(
      new Set(session.subagentResults.flatMap((r) => r.sources))
    );

    const report = generateFinalReport(
      session,
      allFindings,
      allSources,
      reportStyle
    );

    session.finalReport = report;
    session.status = "complete";
    session.endTime = Date.now();

    // Move to completed sessions
    ctx.actionMemory.completedSessions.push(session);
    ctx.actionMemory.activeSessions.delete(sessionId);

    return `🎯 **RESEARCH COMPLETE** - Here is your comprehensive research report:

---

${report}

---

**📊 Research Summary:**
- Total subagents deployed: ${session.subagentResults.length}
- Total findings collected: ${allFindings.length}
- Unique sources referenced: ${allSources.length}
- Research completed in: ${Math.round(
      (session.endTime! - session.startTime) / 1000
    )} seconds

**✅ Mission accomplished!** The multi-agent research system has successfully analyzed "${
      session.query
    }" and delivered this comprehensive report with detailed findings, methodology, and authoritative source citations.

This concludes your research request. The report above contains all key findings, analysis, and sources discovered through our specialized multi-agent research process.`;
  },
});

// Helper functions - Enhanced with Anthropic's complexity analysis
function analyzeComplexity(query: string): "simple" | "moderate" | "complex" {
  const lowerQuery = query.toLowerCase();

  // Simple fact-finding indicators
  const simpleKeywords = [
    "what is",
    "define",
    "who is",
    "when did",
    "where is",
    "how many",
  ];

  // Complex multi-domain research indicators
  const complexKeywords = [
    "analyze",
    "compare",
    "comprehensive",
    "evaluate",
    "assess",
    "multi",
    "across",
    "between",
    "relationship",
    "impact",
    "strategy",
    "landscape",
    "ecosystem",
    "framework",
  ];

  // Domain-specific complexity indicators
  const complexDomains = [
    "market",
    "industry",
    "economic",
    "political",
    "social",
    "regulatory",
  ];

  // Moderate complexity indicators
  const moderateKeywords = [
    "research",
    "explore",
    "investigate",
    "study",
    "overview",
  ];

  // Simple queries: Direct fact-finding (1 agent, 3-10 tool calls)
  if (simpleKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return "simple";
  }

  // Complex queries: Multi-domain analysis (5-10+ agents with divided responsibilities)
  if (
    complexKeywords.some((keyword) => lowerQuery.includes(keyword)) ||
    complexDomains.filter((domain) => lowerQuery.includes(domain)).length >=
      2 ||
    query.length > 120 ||
    (lowerQuery.includes("and") && lowerQuery.includes("compare")) ||
    lowerQuery.split(" ").length > 15
  ) {
    return "complex";
  }

  // Moderate queries: Direct comparisons (2-4 agents, 10-15 calls each)
  return "moderate";
}

function getSubagentCount(
  complexity: "simple" | "moderate" | "complex",
  max: number
): number {
  // Anthropic's effort scaling guidelines
  const baseCounts = {
    simple: 1, // Simple fact-finding: 1 agent, 3-10 tool calls total
    moderate: 3, // Direct comparisons: 2-4 subagents, 10-15 calls each
    complex: 6, // Complex multi-domain: 5-10+ subagents with divided responsibilities
  };
  return Math.min(baseCounts[complexity], max);
}

function getResearchStrategy(
  complexity: "simple" | "moderate" | "complex"
): string {
  const strategies = {
    simple: "Direct fact-finding with single specialized agent",
    moderate: "Multi-perspective analysis with coordinated subagents",
    complex:
      "Comprehensive multi-domain research with specialized task division",
  };
  return strategies[complexity];
}

function createDetailedPlan(
  query: string,
  complexity: "simple" | "moderate" | "complex",
  numSubagents: number
): string {
  // This would typically be more sophisticated, but for now return a template
  const roles = [
    "market_researcher",
    "technical_analyst",
    "industry_expert",
    "competitive_analyst",
    "trend_analyst",
  ];

  return `
**Subagent Allocation:**
${Array.from(
  { length: numSubagents },
  (_, i) => `
${i + 1}. **${roles[i] || `specialist_${i + 1}`}**
   - Focus: ${getSpecialistFocus(roles[i] || `specialist_${i + 1}`, query)}
   - Estimated searches: 3-5
   - Output: Key findings with source attribution`
).join("")}

This plan ensures comprehensive coverage while preventing duplicate work through clear task boundaries.`;
}

function getSpecialistFocus(role: string, query: string): string {
  const focuses = {
    market_researcher: "Market size, trends, competitive landscape",
    technical_analyst: "Technical specifications, capabilities, limitations",
    industry_expert: "Industry context, regulations, best practices",
    competitive_analyst:
      "Competitive positioning, market share, differentiation",
    trend_analyst: "Future trends, emerging developments, predictions",
  };
  return (
    focuses[role as keyof typeof focuses] || `Specialized analysis of: ${query}`
  );
}

function generateFinalReport(
  session: ResearchSession,
  findings: string[],
  sources: string[],
  style: string
): string {
  const duration = session.endTime
    ? Math.round((session.endTime - session.startTime) / 1000)
    : 0;

  return `# Research Report: ${session.query}

## Executive Summary
Research completed in ${duration} seconds using ${
    session.subagentResults.length
  } specialized subagents.

**Key Findings:**
${findings
  .slice(0, 5)
  .map((f, i) => `${i + 1}. ${f.slice(0, 200)}...`)
  .join("\n")}

## Research Methodology
- **Complexity Assessment:** ${session.plan?.complexity || "Not specified"}
- **Subagents Deployed:** ${session.subagentResults.length}
- **Total Sources:** ${sources.length}
- **Research Strategy:** ${session.plan?.strategy || "Multi-agent coordination"}

## Detailed Findings
${findings.map((f, i) => `### Finding ${i + 1}\n${f}\n`).join("\n")}

## Sources
${sources
  .slice(0, 20)
  .map((s, i) => `${i + 1}. ${s}`)
  .join("\n")}

## Analysis Quality
- **Successful Subagents:** ${
    session.subagentResults.filter((r) => r.status === "complete").length
  }
- **Failed Tasks:** ${
    session.subagentResults.filter((r) => r.status === "failed").length
  }
- **Source Diversity:** ${
    new Set(sources.map((s) => new URL(s).hostname)).size
  } unique domains

---
*Generated by Multi-Agent Research System*`;
}

// List and get results actions (unchanged)
const listSessionsAction = action({
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

const getResultsAction = action({
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

// Extension with action-based multi-agent system
export const multiAgentResearch = extension({
  name: "multi-agent-research",
  contexts: {
    "lead-agent": leadAgentContext,
    subagent: subagentContext,
  },
  actions: [
    createResearchPlanAction,
    delegateResearchTaskAction,
    startSubagentResearchAction,
    executeResearchSearchesAction,
    synthesizeResultsAction,
    listSessionsAction,
    getResultsAction,
  ],
});
