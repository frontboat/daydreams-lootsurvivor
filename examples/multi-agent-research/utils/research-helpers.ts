import type {
  ResearchSession,
  ResearchPlan,
  SubagentTask,
} from "../types/research-types.js";

// Helper function to extract main subject from objective for dynamic search queries
export function extractMainSubject(objective: string): string {
  // Simple keyword extraction - look for proper nouns and main topics
  const words = objective.split(" ");

  // Look for capitalized words (proper nouns)
  const properNouns = words.filter(
    (word) =>
      word.length > 2 &&
      word[0] === word[0].toUpperCase() &&
      ![
        "The",
        "A",
        "An",
        "In",
        "On",
        "At",
        "For",
        "To",
        "From",
        "With",
        "By",
      ].includes(word)
  );

  if (properNouns.length > 0) {
    return properNouns.slice(0, 2).join(" ");
  }

  // Fallback: look for important non-stop words
  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
  ];
  const importantWords = words.filter(
    (word) => word.length > 3 && !stopWords.includes(word.toLowerCase())
  );

  return (
    importantWords.slice(0, 2).join(" ") ||
    objective.split(" ").slice(0, 2).join(" ")
  );
}

// Helper function to extract keywords from objective for search queries
export function extractKeywords(objective: string): string[] {
  const words = objective.toLowerCase().split(/[\s,.-]+/);
  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "about",
    "research",
    "analyze",
    "investigate",
    "study",
    "explore",
  ];

  return words
    .filter((word) => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5); // Take top 5 keywords
}

// Helper function to get adaptive search configuration based on query count and strategy
export function getAdaptiveSearchConfig(queryCount: number, memory: any) {
  // Anthropic insight: Match search depth to query complexity
  const searchDepth = queryCount <= 2 ? "basic" : "advanced";

  // Progressive focusing strategy - start broad, then narrow
  const includeGeneralWebResults = true;
  const includeImages = false; // Focus on text content for research
  const includeAnswer = false; // We want source content, not summaries

  return {
    search_depth: searchDepth,
    include_answer: includeAnswer,
    include_images: includeImages,
    include_raw_content: true, // Include full content for better analysis
    max_results: 10, // Balance coverage vs processing time
  };
}

// Helper function to determine appropriate date filter based on query content
export function determineDateFilter(
  query: string,
  dateFilters: any
): string | null {
  const queryLower = query.toLowerCase();

  // Urgent/breaking content - search only current year
  if (
    queryLower.includes("breaking") ||
    queryLower.includes("urgent") ||
    queryLower.includes("latest") ||
    queryLower.includes("current")
  ) {
    return dateFilters.year;
  }

  // Recent topics (AI, crypto, politics) - search last year
  if (
    queryLower.includes("ai") ||
    queryLower.includes("crypto") ||
    queryLower.includes("politics") ||
    queryLower.includes("election") ||
    queryLower.includes("2024") ||
    queryLower.includes("recent")
  ) {
    return dateFilters.year;
  }

  // Moderate topics (business, industry) - search last 2 years
  if (
    queryLower.includes("business") ||
    queryLower.includes("industry") ||
    queryLower.includes("market") ||
    queryLower.includes("economy")
  ) {
    return dateFilters.month;
  }

  // Historical topics - no date filter
  if (
    queryLower.includes("history") ||
    queryLower.includes("historical") ||
    queryLower.includes("ancient") ||
    queryLower.includes("founding")
  ) {
    return null;
  }

  // Default: moderate recency for general queries
  return dateFilters.month;
}

// Filter and rank results with SEO farm detection and authority scoring
export function filterAndRankResults(results: any[], query: string): any[] {
  if (!results || results.length === 0) return [];

  return results
    .map((result: any) => {
      const score = calculateQualityScore(result, query);
      return { ...result, qualityScore: score };
    })
    .filter((result: any) => result.qualityScore > 0.3) // Filter out low quality
    .sort((a: any, b: any) => b.qualityScore - a.qualityScore);
}

// Calculate quality score for ranking
function calculateQualityScore(result: any, query: string): number {
  let score = 0.5; // Base score

  const url = result.url || "";
  const title = (result.title || "").toLowerCase();
  const content = (result.content || "").toLowerCase();
  const domain = extractDomain(url);

  // Authority scoring - prioritize trusted domains
  const authorityDomains = {
    // High authority
    ".edu": 0.3,
    ".gov": 0.3,
    ".org": 0.2,
    "reuters.com": 0.25,
    "bloomberg.com": 0.25,
    "wsj.com": 0.25,
    "ft.com": 0.2,
    "economist.com": 0.2,
    "bbc.com": 0.2,
    "nytimes.com": 0.2,
    "washingtonpost.com": 0.2,
    "nature.com": 0.25,
    "science.org": 0.25,
    "pnas.org": 0.25,

    // Medium authority
    "wikipedia.org": 0.15,
    "investopedia.com": 0.15,
    "cnn.com": 0.1,
    "guardian.com": 0.1,
    "npr.org": 0.15,

    // Research/think tanks
    "brookings.edu": 0.2,
    "cfr.org": 0.2,
    "rand.org": 0.2,
  };

  for (const [authDomain, bonus] of Object.entries(authorityDomains)) {
    if (domain.includes(authDomain)) {
      score += bonus;
      break;
    }
  }

  // SEO farm detection - heavily penalize
  const seoIndicators = [
    "10 best",
    "top 10",
    "you won't believe",
    "shocking",
    "click here",
    "amazing",
    "incredible",
    "must-see",
    "viral",
    "trending now",
    "doctors hate",
    "one weird trick",
    "secret",
    "exposed",
  ];

  if (
    seoIndicators.some(
      (indicator) =>
        title.includes(indicator) || content.includes(indicator.toLowerCase())
    )
  ) {
    score -= 0.4;
  }

  // Marketing language detection
  const marketingPhrases = [
    "best solution",
    "revolutionary",
    "game-changing",
    "cutting-edge",
    "state-of-the-art",
    "world-class",
    "premium",
    "exclusive",
    "limited time",
  ];

  if (
    marketingPhrases.some(
      (phrase) => title.includes(phrase) || content.includes(phrase)
    )
  ) {
    score -= 0.2;
  }

  // Content length bonus - prefer substantial content
  if (content.length > 1000) score += 0.1;
  if (content.length > 2000) score += 0.1;

  // Query relevance in title
  const queryWords = query
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 3);
  const titleRelevance =
    queryWords.filter((word) => title.includes(word)).length /
    queryWords.length;
  score += titleRelevance * 0.2;

  // Recency bonus for time-sensitive content
  if (result.published_date) {
    const publishedDate = new Date(result.published_date);
    const now = new Date();
    const daysDiff =
      (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 30) score += 0.15; // Very recent
    else if (daysDiff < 365) score += 0.1; // Recent
  }

  return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Helper functions for research planning - Enhanced with Anthropic's complexity analysis
export function analyzeComplexity(
  query: string
): "simple" | "moderate" | "complex" {
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

export function getSubagentCount(
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

export function getResearchStrategy(
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

export function createDetailedPlan(
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

export function getSpecialistFocus(role: string, query: string): string {
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

export function generateFinalReport(
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

// Helper function to generate search queries based on task - "Start Wide, Then Narrow" strategy
export function generateSearchQueries(task: SubagentTask): string[] {
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
        `${mainSubject} market size industry analysis`,
        `${mainSubject} competitive landscape competitors`,
      ];
    case "technical_analyst":
      return [
        `${mainSubject} technical specifications technology`,
        `${mainSubject} technical details engineering architecture`,
        `${mainSubject} capabilities limitations performance`,
        `${mainSubject} technical implementation challenges`,
      ];
    case "industry_expert":
      return [
        `${mainSubject} industry overview sector analysis`,
        `${mainSubject} industry trends regulations standards`,
        `${mainSubject} industry leaders best practices`,
        `${mainSubject} industry challenges opportunities future`,
      ];
    case "competitive_analyst":
      return [
        `${mainSubject} competitors competitive analysis`,
        `${mainSubject} market share positioning differentiation`,
        `${mainSubject} competitive advantages weaknesses`,
        `${mainSubject} competitive landscape market leaders`,
      ];
    case "trend_analyst":
      return [
        `${mainSubject} trends future outlook predictions`,
        `${mainSubject} emerging developments innovations`,
        `${mainSubject} market trends industry evolution`,
        `${mainSubject} future predictions expert analysis`,
      ];
    default:
      // Generic approach for custom roles
      return [
        `${mainSubject}`, // Start broad
        `${mainSubject} ${keywords.slice(0, 2).join(" ")}`, // Add key context
        `${mainSubject} analysis research study`,
        `"${mainSubject}" detailed information facts`,
      ];
  }
}

// Enhanced search with retry logic and backoff
export async function executeSearchWithRetry(
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
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const searchResult = await tavilyClient.search(query, config);

      if (searchResult?.results && Array.isArray(searchResult.results)) {
        return {
          query,
          results: searchResult.results,
          error: null,
          metadata: {
            searchDepth: config.search_depth,
            totalResults: searchResult.results.length,
            attempt: attempt + 1,
            queryIndex: index,
          },
        };
      } else {
        throw new Error(`Invalid search response format for query: "${query}"`);
      }
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff: wait 1s, then 2s, then 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  return {
    query,
    results: [],
    error: `Failed after ${maxRetries + 1} attempts: ${
      lastError?.message || "Unknown error"
    }`,
    metadata: {
      searchDepth: config.search_depth,
      totalResults: 0,
      attempt: maxRetries + 1,
      failed: true,
      queryIndex: index,
    },
  };
}
