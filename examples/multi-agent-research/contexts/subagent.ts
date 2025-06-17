import { context } from "@daydreamsai/core";
import { z } from "zod";
import type { SubagentTask } from "../types/research-types.js";

// Subagent Context - handles specialized research tasks
export const subagentContext = context({
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
