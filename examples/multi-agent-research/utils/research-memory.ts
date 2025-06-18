import { memory, type MemoryStore } from "@daydreamsai/core";
import type {
  ResearchMemoryType,
  ResearchSession,
  SubagentTask,
} from "../types/research-types.js";

// Shared memory for research coordination using proper store persistence
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

// Helper functions for store-based persistence
export async function saveSession(
  sessionId: string,
  session: ResearchSession,
  store: MemoryStore,
  memory: ResearchMemoryType
) {
  await store.set(`session:${sessionId}`, session);
  memory.activeSessions.set(sessionId, session);
}

export async function loadSession(
  sessionId: string,
  store: MemoryStore,
  memory: ResearchMemoryType
): Promise<ResearchSession | null> {
  // Try memory first, then store
  if (memory.activeSessions.has(sessionId)) {
    return memory.activeSessions.get(sessionId)!;
  }

  const session = await store.get<ResearchSession>(`session:${sessionId}`);
  if (session) {
    memory.activeSessions.set(sessionId, session);
  }
  return session;
}

export async function saveTask(
  taskId: string,
  task: SubagentTask,
  store: MemoryStore,
  memory: ResearchMemoryType
) {
  await store.set(`task:${taskId}`, task);
  memory.activeTasks.set(taskId, task);
}

export async function loadTask(
  taskId: string,
  store: MemoryStore,
  memory: ResearchMemoryType
): Promise<SubagentTask | null> {
  // Try memory first, then store
  if (memory.activeTasks.has(taskId)) {
    return memory.activeTasks.get(taskId)!;
  }

  const task = await store.get<SubagentTask>(`task:${taskId}`);
  if (task) {
    memory.activeTasks.set(taskId, task);
  }
  return task;
}

export async function saveSubagentFindings(
  sessionId: string,
  taskId: string,
  findings: string[],
  sources: string[],
  store: MemoryStore,
  memory: ResearchMemoryType
) {
  const session = await loadSession(sessionId, store, memory);
  if (session) {
    const subagentResult = session.subagentResults.find(
      (r) => r.taskId === taskId
    );
    if (subagentResult) {
      subagentResult.findings = findings;
      subagentResult.sources = sources;
      subagentResult.status = "complete";
      await saveSession(sessionId, session, store, memory);
    }
  }
}
