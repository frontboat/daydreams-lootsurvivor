import { chatContext } from "@/agent/chat";
import { getModel } from "@/components/model-select";
import {
  AnyAction,
  AnyAgent,
  AnyContext,
  AnyRef,
  ContextRef,
} from "@daydreamsai/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

type SendArguments = {
  input: {
    type: string;
    data: any;
  };
  modelName?: string;
  actions?: AnyAction[];
  contexts?: ContextRef[];
};

export function useSendMessage({
  agent,
  context,
  args,
  onSuccess,
}: {
  agent: AnyAgent;
  context: AnyContext;
  args: any;
  onSuccess?: (data: AnyRef[], variables: SendArguments) => Promise<void>;
}) {
  const abortControllerRef = useRef<AbortController>();

  const id = agent.getContextId({
    context,
    args,
  });

  const send = useMutation({
    mutationKey: ["send", id],
    mutationFn: async ({
      input,
      modelName,
      actions,
      contexts,
    }: SendArguments) => {
      // abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      return await agent.send({
        context,
        args,
        input,
        contexts,
        actions,
        abortSignal: controller.signal,
        model: modelName ? getModel(modelName) : undefined,
      });
    },

    async onSuccess(data, variables) {
      onSuccess?.(data, variables);
    },

    onError(error) {
      console.error(error);
    },
  });

  return { send, abortControllerRef };
}
