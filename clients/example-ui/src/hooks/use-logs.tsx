import { AnyContext, AnyRef, getWorkingMemoryAllLogs } from "@daydreamsai/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAgent } from "./use-agent";

export function useLogs({ context, args }: { context: AnyContext; args: any }) {
  const agent = useAgent();
  const [logs, setLogs] = useState<AnyRef[]>([]);
  const [newLog, setNewLog] = useState<AnyRef | undefined>(undefined);

  const contextId = agent.getContextId({ context, args });

  const workingMemory = useQuery({
    queryKey: ["workingMemory", contextId],
    queryFn: async () => {
      const workingMemory = await agent.getWorkingMemory(contextId);
      return getWorkingMemoryAllLogs(structuredClone(workingMemory));
    },
    initialData: () => [],
  });

  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, (log, done) => {
      if (done) {
        setNewLog((current) =>
          current && current.id === log.id ? undefined : current
        );
        setLogs((logs) => [...logs.filter((l) => l.id !== log.id), log]);
      } else {
        setNewLog(log);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [contextId]);

  useEffect(() => {
    setLogs([]);
  }, [contextId]);

  return {
    logs,
    newLog,
    workingMemory,

    setLogs,
    setNewLog,
  };
}
