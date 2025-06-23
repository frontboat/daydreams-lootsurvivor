// Types for our multi-agent research system
export type ResearchSession = {
  id: string;
  query: string;
  status: "planning" | "researching" | "synthesizing" | "complete" | "failed";
  startTime: number;
  endTime?: number;
  plan?: ResearchPlan;
  subagentResults: SubagentResult[];
  finalReport?: string;
};

export type ResearchPlan = {
  complexity: "simple" | "moderate" | "complex";
  subagents: SubagentTask[];
  strategy: string;
  targetAgents?: number;
};

export type SubagentTask = {
  id: string;
  role: string;
  objective: string;
  outputFormat: string;
  estimatedQueries: number;
  taskBoundaries?: string;
  preferredSources?: string;
};

export type SubagentResult = {
  taskId: string;
  role: string;
  findings: string[];
  sources: string[];
  status: "working" | "complete" | "failed" | "synthesizing";
  error?: string;
};

export type ResearchMemoryType = {
  activeSessions: Map<string, ResearchSession>;
  completedSessions: ResearchSession[];
  activeTasks: Map<string, SubagentTask>;
};
