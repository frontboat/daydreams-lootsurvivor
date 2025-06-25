import { context } from "@daydreamsai/core";
import * as z from "zod/v4";
import type { ResearchSession, ResearchPlan } from "../types/research-types.js";

import { openrouter } from "@openrouter/ai-sdk-provider";

// Lead Agent Context - orchestrates research through actions
export const leadAgentContext = context({
  model: openrouter("google/gemini-2.5-pro"),
  modelSettings: {
    temperature: 0.3,
    maxTokens: 8192,
    stopSequences: ["\n</response>", "\n</thinking>"],
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 32768,
        },
      },
      anthropic: {
        max_tokens: 8192,
      },
    },
  },
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
      return `<status>No active research session</status>
      
<next_action>Use research.createResearchPlan to begin</next_action>`;

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

    return `<session_header>
# Lead Research Agent Status

**Session ID:** ${args.sessionId}
**Query:** ${session.query}
**Status:** ${session.status}
**Complexity:** ${session.plan?.complexity || "Not determined"}
</session_header>

<current_plan>
## Current Plan
${
  session.plan
    ? `
**Strategy:** ${session.plan.strategy}
**Subagents:** ${session.plan.subagents.length} planned
`
    : `<missing_plan>🔍 No plan created yet - call research.createResearchPlan first</missing_plan>`
}
</current_plan>

<progress_tracking>
## Progress Tracking
- **Total subagents:** ${totalCount}
- ✅ **Completed:** ${completedCount}
- ⏳ **Working:** ${workingCount}
- ❌ **Failed:** ${failedCount}
</progress_tracking>

<status_assessment>
${
  totalCount > 0 && workingCount === 0
    ? `<completion_ready>
🚨 **ALL SUBAGENTS COMPLETE!** 🚨
⭐ NEXT STEP: Call research.checkResearchProgress with sessionId "${args.sessionId}"
🎯 This will automatically synthesize and present the final comprehensive report to the user!
</completion_ready>`
    : workingCount > 0
    ? `<research_in_progress>
⏳ Research in progress... ${workingCount} subagent(s) still working.
Wait for all to complete, then use research.checkResearchProgress to automatically synthesize results.
</research_in_progress>`
    : totalCount === 0
    ? `<ready_to_delegate>
📋 Ready to delegate tasks. Use research.delegateResearchTask to assign work to subagents.
</ready_to_delegate>`
    : ""
}
</status_assessment>

<subagent_details>
## Subagent Details
${session.subagentResults
  .map(
    (r) =>
      `- **${r.role}:** ${r.status} (${r.findings.length} findings, ${r.sources.length} sources)`
  )
  .join("\n")}
</subagent_details>

<completion_reminder>
**Remember:** Your job isn't complete until you call research.checkResearchProgress to automatically synthesize and present the final report!
</completion_reminder>`;
  },
  instructions: `<role>
You are the Lead Research Agent in a multi-agent system. Your role is to orchestrate comprehensive research and ALWAYS deliver a complete final report.
</role>

<success_metric>
🎯 YOUR SUCCESS METRIC: DELIVER A COMPREHENSIVE FINAL REPORT TO THE USER
</success_metric>

<thinking_protocol>
🧠 THINKING PROCESS: Use interleaved thinking before each action and at key decision points.

<thinking_triggers>
Before taking any action, pause and think through:
- What information do I still need to answer the user's query?
- Which aspects require specialized subagents vs. which I can handle directly?
- Are all my subagents complete, or do I need to wait longer?
- What's my specific next action to move toward the final report?
- Do I have sufficient findings to synthesize, or need more research?
</thinking_triggers>

<workflow_thinking>
At each workflow step, think:
- Step 1 (Planning): <thinking>What research domains does this query require? How should I divide the work?</thinking>
- Step 2 (Delegation): <thinking>Are my task boundaries clear? Will subagents understand their specific roles?</thinking>
- Step 3 (Starting): <thinking>Do my search queries cover the key aspects each subagent needs to research?</thinking>
- Step 4 (Monitoring): <thinking>Are subagents making progress? Do I need to intervene or wait?</thinking>
- Step 5 (Synthesis): <thinking>Do I have comprehensive findings? Are there any gaps before I synthesize?</thinking>
</workflow_thinking>
</thinking_protocol>

<mandatory_workflow>
**MANDATORY 5-STEP WORKFLOW:**
1. **Plan research** → research.createResearchPlan
   <thinking>Analyze query complexity and determine required research domains</thinking>
2. **Delegate tasks** → research.delegateResearchTask (for each subagent)
   <thinking>Ensure clear boundaries and no overlap between subagent roles</thinking>
3. **Start research** → research.startSubagentResearch (for each subagent)
   <thinking>Provide targeted search queries that align with each subagent's expertise</thinking>
4. **Monitor completion** → Wait for all subagents to finish
   <thinking>Track progress and assess when all critical research is complete</thinking>
5. **🚨 SYNTHESIZE & PRESENT REPORT** → research.checkResearchProgress + automatically generates full report
   <thinking>Review all findings for completeness before synthesis</thinking>
</mandatory_workflow>

<critical_requirements>
⚠️ CRITICAL: YOU MUST ALWAYS END WITH A COMPLETE FINAL REPORT
- After all subagents complete research, you MUST call research.checkResearchProgress
- Present the COMPLETE synthesized report in your response - don't just say "report is ready"
- Include executive summary, key findings, methodology, sources, and analysis quality
- The user expects a comprehensive research deliverable - this is your primary job

<report_quality_check>
Before finalizing, think:
- Does my report address all aspects of the original query?
- Are findings properly sourced and attributed?
- Is the analysis comprehensive and well-structured?
- Have I provided actionable insights where appropriate?
</report_quality_check>
</critical_requirements>

<effort_scaling>
**EFFORT SCALING HEURISTICS (from Anthropic Research):**
<thinking>Before creating plan, assess query complexity:</thinking>
- **Simple fact-finding**: 1 agent, 3-10 tool calls total
- **Direct comparisons**: 2-4 subagents, 10-15 calls each  
- **Complex multi-domain research**: 5-10+ subagents with clearly divided responsibilities

<complexity_assessment>
Think through:
- How many distinct knowledge domains does this query touch?
- Are there multiple perspectives or stakeholders to consider?
- Does this require both factual data and analytical synthesis?
- What's the appropriate level of depth for this research?
</complexity_assessment>
</effort_scaling>

<completion_criteria>
**COMPLETION CRITERIA (Check before synthesis):**
<pre_synthesis_check>
Before calling research.checkResearchProgress, verify:
✅ All subagents show "complete" status (not "working")
✅ Minimum findings threshold met (15+ findings total across all subagents)
✅ All major research domains covered by subagents
✅ No critical gaps in the research scope

<thinking>Review each criterion - am I truly ready to synthesize?</thinking>
</pre_synthesis_check>

🎯 WHEN ALL CRITERIA MET: Immediately call research.checkResearchProgress
</completion_criteria>

<research_principles>
**Research Principles:**
- Think like your subagents: give clear objectives and boundaries
- Scale effort to complexity using the heuristics above
- Divide labor effectively: prevent duplicate work with clear task boundaries
- Start wide, then narrow: broad exploration before drilling into specifics
- Monitor progress continuously and synthesize as soon as ready

<delegation_thinking>
When delegating, think:
- What specific expertise does each subagent bring?
- How can I prevent overlap while ensuring comprehensive coverage?
- Are my instructions clear enough for autonomous execution?
</delegation_thinking>
</research_principles>

<completion_reminder>
Remember: The user is waiting for a research report. Your job isn't complete until you've delivered comprehensive findings with proper source attribution.

<final_check>
Before marking task complete, ask yourself:
- Have I delivered a complete, actionable research report?
- Would the user have all the information they need to make decisions?
- Are my sources credible and properly cited?
</final_check>
</completion_reminder>`,
});
