import { memory } from "@daydreamsai/core";
import type { ResearchMemoryType } from "../types/research-types.js";

// Shared memory for research coordination
export const researchMemory = memory<ResearchMemoryType>({
  key: "multi-agent-research",
  create() {
    return {
      activeSessions: new Map(),
      completedSessions: [],
      activeTasks: new Map(),
    };
  },
});
