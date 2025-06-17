import { action } from "@daydreamsai/core";
import { z } from "zod";
import { researchMemory } from "../utils/research-memory.js";
import { generateSearchQueries } from "../utils/research-helpers.js";

// Action: Start Subagent Research
export const startSubagentResearchAction = action({
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
