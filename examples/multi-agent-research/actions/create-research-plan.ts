import { action } from "@daydreamsai/core";
import { z } from "zod";
import { researchMemory } from "../utils/research-memory.js";
import {
  analyzeComplexity,
  getSubagentCount,
  getResearchStrategy,
  createDetailedPlan,
} from "../utils/research-helpers.js";
import type { ResearchSession } from "../types/research-types.js";

// Action: Create Research Plan (replaces planning phase)
export const createResearchPlanAction = action({
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
