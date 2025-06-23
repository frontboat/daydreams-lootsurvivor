import { extension } from "@daydreamsai/core";

// Import contexts
import { leadAgentContext } from "./contexts/lead-agent.js";
import { subagentContext } from "./contexts/subagent.js";

// Import all actions
import {
  createResearchPlanAction,
  delegateResearchTaskAction,
  startSubagentResearchAction,
  executeResearchSearchesAction,
  synthesizeReportAction,
  checkResearchProgressAction,
  listSessionsAction,
  getResultsAction,
} from "./actions/index.js";

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
    synthesizeReportAction,
    checkResearchProgressAction,
    listSessionsAction,
    getResultsAction,
  ],
});
