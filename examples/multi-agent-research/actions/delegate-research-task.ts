import { action } from "@daydreamsai/core";
import { z } from "zod";
import { researchMemory } from "../utils/research-memory.js";
import { subagentContext } from "../contexts/subagent.js";
import type { SubagentTask } from "../types/research-types.js";

// Action: Delegate Research Task (replaces subagent spawning)
export const delegateResearchTaskAction = action({
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
