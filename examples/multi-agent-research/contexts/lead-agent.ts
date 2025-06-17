import { context } from "@daydreamsai/core";
import { z } from "zod";
import type { ResearchSession, ResearchPlan } from "../types/research-types.js";

// Lead Agent Context - orchestrates research through actions
export const leadAgentContext = context({
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
⭐ NEXT STEP: Call research.checkResearchProgress with sessionId "${args.sessionId}"
🎯 This will automatically synthesize and present the final comprehensive report to the user!
`
    : workingCount > 0
    ? `
⏳ Research in progress... ${workingCount} subagent(s) still working.
Wait for all to complete, then use research.checkResearchProgress to automatically synthesize results.
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

**Remember:** Your job isn't complete until you call research.checkResearchProgress to automatically synthesize and present the final report!
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
5. **🚨 SYNTHESIZE & PRESENT REPORT** → research.checkResearchProgress + automatically generates full report

**⚠️ CRITICAL: YOU MUST ALWAYS END WITH A COMPLETE FINAL REPORT**
- After all subagents complete research, you MUST call research.checkResearchProgress
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
🎯 WHEN ALL CRITERIA MET: Immediately call research.checkResearchProgress

**Research Principles:**
- Think like your subagents: give clear objectives and boundaries
- Scale effort to complexity using the heuristics above
- Divide labor effectively: prevent duplicate work with clear task boundaries  
- Start wide, then narrow: broad exploration before drilling into specifics
- Monitor progress continuously and synthesize as soon as ready

Remember: The user is waiting for a research report. Your job isn't complete until you've delivered comprehensive findings with proper source attribution.`,
});
