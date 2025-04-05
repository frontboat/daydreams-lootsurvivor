import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import {
  type AnyAction,
  AnyRef,
  ContextRef,
  getWorkingMemoryAllLogs,
} from "@daydreamsai/core";
import { useAgent } from "@/hooks/use-agent";
import { chat, chatContext, createChatSubContexts } from "@/agent/chat";
import { v7 as randomUUIDv7 } from "uuid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  anthropic,
  anthropicModels,
  google,
  googleModels,
  groq,
  groqModels,
  openai,
  openaiModels,
  openrouter,
  openrouterModels,
} from "@/agent/models";
import type { LanguageModelV1 } from "ai";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogsList } from "@/components/message-list";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { ChatSidebar } from "@/components/chat-sidebar";
import { getModel, ModelSelect } from "@/components/model-select";

export const Route = createFileRoute("/chats/$chatId")({
  component: RouteComponent,

  validateSearch: z.object({
    page: z.enum(["artifact", "run", "sandbox"]).optional(),
    pageId: z.string().optional(),
  }),

  loader({ params }) {
    if (params.chatId === "new") {
      throw redirect({
        to: "/chats/$chatId",
        params: {
          chatId: randomUUIDv7(),
        },
      });
    }

    return {
      user: "dreamer",
      subContexts: createChatSubContexts({
        chatId: params.chatId,
        user: "dreamer",
      }),
    };
  },
});

const SelfResizingTextarea = ({
  className,
  ...props
}: React.ComponentProps<"textarea">) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Textarea
      ref={textareaRef}
      className={cn(
        "resize-none border rounded-md py-2 px-3 w-full h-10 max-h-[500px]",
        className
      )}
      onChange={(e) => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "inherit";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }}
      {...props}
    />
  );
};

function RouteComponent() {
  const { chatId } = Route.useParams();
  const context = Route.useRouteContext();
  const { user, subContexts } = Route.useLoaderData();
  const router = useRouter();

  const dreams = useAgent();

  const contextId = dreams.getContextId({
    context: chatContext,
    args: {
      chatId,
    },
  });

  useEffect(() => {
    router.update({
      context: { ...context, sidebar: <ChatSidebar key={chatId} /> },
    });
    router.invalidate();
    return () => {
      router.update({
        context: {
          ...context,
          sidebar: undefined,
        },
      });
      router.invalidate();
    };
  }, [chatId]);

  const [model, setModel] = useState<string>("default");

  const scrollRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<AnyRef[]>([]);
  const [newLog, setNewLog] = useState<AnyRef | undefined>(undefined);

  const workingMemory = useQuery({
    queryKey: ["chat:workingMemory", chatId],
    queryFn: async () => {
      const workingMemory = await dreams.getWorkingMemory(contextId);
      return getWorkingMemoryAllLogs(structuredClone(workingMemory));
    },
    initialData: () => [],
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = dreams.subscribeContext(contextId, (log, done) => {
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

  // useEffect(() => {
  //   const SCROLL_THRESHOLD = 200;
  //   let userScrolled = false;

  //   const isNearBottom = () => {
  //     const windowHeight = window.innerHeight;
  //     const documentHeight = document.documentElement.scrollHeight;
  //     const scrollTop = window.scrollY || document.documentElement.scrollTop;
  //     const distanceFromBottom = documentHeight - (scrollTop + windowHeight);

  //     return distanceFromBottom <= SCROLL_THRESHOLD;
  //   };

  //   // When user starts scrolling manually
  //   const handleUserScroll = () => {
  //     userScrolled = true;

  //     // Reset the flag after a short delay
  //     setTimeout(() => {
  //       userScrolled = false;
  //     }, 1000);
  //   };

  //   // Add scroll event listener
  //   window.addEventListener("wheel", handleUserScroll);
  //   window.addEventListener("touchmove", handleUserScroll);

  //   // Only auto-scroll if user hasn't manually scrolled
  //   if (isNearBottom() && !userScrolled) {
  //     window.scrollTo({
  //       top: document.documentElement.scrollHeight,
  //       behavior: "smooth",
  //     });
  //   }

  //   // Cleanup event listeners
  //   return () => {
  //     window.removeEventListener("wheel", handleUserScroll);
  //     window.removeEventListener("touchmove", handleUserScroll);
  //   };
  // }, [logs]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentChatIdRef = useRef(chatId);

  currentChatIdRef.current = chatId;

  const send = useMutation({
    mutationKey: ["send", chatId],
    mutationFn: async ({
      chatId,
      user,
      msg,
      modelName,
      actions,
      contexts,
    }: {
      chatId: string;
      user: string;
      msg: string;
      modelName?: string;
      actions?: AnyAction[];
      contexts?: ContextRef[];
    }) => {
      // abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      return await dreams.send({
        context: chatContext,
        args: {
          chatId,
        },
        input: {
          type: "message",
          data: {
            user,
            content: msg,
          },
        },
        contexts,
        abortSignal: controller.signal,
        model: modelName ? getModel(modelName) : undefined,
      });
    },

    async onSuccess(data, variables) {
      console.log({ data });
      await queryClient.invalidateQueries({
        queryKey: ["chat:workingMemory", variables.chatId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["agent:chats"],
      });

      setNewLog(undefined);
    },

    onError(error) {
      console.error(error);
    },
  });

  useEffect(() => {
    setLogs([]);
  }, [chatId]);

  useEffect(() => {
    if (send.isPending) return;
    if (workingMemory.data !== undefined) {
      setLogs((logs) => {
        const map = new Map(
          [...logs, ...workingMemory.data].map((log) => [log.id, log])
        );

        return Array.from(map.values()).sort((a, b) =>
          a.timestamp > b.timestamp ? 1 : -1
        );
      });
    } else {
      setLogs([]);
    }

    setNewLog(undefined);
  }, [workingMemory.data, send.status]);

  return (
    <div className="max-w-screen-lg grow flex flex-col">
      <div className="flex flex-col flex-1 relative">
        <div className="flex flex-col">
          <div className="flex-1 px-6 pt-8 pb-36" ref={scrollRef}>
            <LogsList logs={newLog ? [...logs, newLog] : logs} />
          </div>
        </div>
        <form
          className="bg-background flex flex-col mt-auto sticky bottom-5 left-0 right-0 mx-20 rounded-xl border overflow-hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            const msg = new FormData(e.currentTarget).get("message") as string;
            e.currentTarget.reset();
            send.mutate({
              user,
              chatId,
              msg,
              modelName: model,
              actions: [],
              contexts: subContexts,
            });
          }}
        >
          <SelfResizingTextarea
            name="message"
            placeholder="Type your message..."
            className="border-0 min-h-20 resize-none px-6 py-4 rounded-xl bg-background placeholder:text-primary focus:outline-none focus:border-transparent focus-visible:ring-0"
            disabled={false} // Disable input while loading history
          />
          <div className="flex items-center">
            <ModelSelect
              defaultValue="default"
              value={model}
              onValueChange={(v) => setModel(v)}
            />

            {send.isPending ? (
              <Button
                type="button"
                onClick={() => {
                  abortControllerRef.current?.abort();
                }}
              >
                Abort
              </Button>
            ) : (
              <Button>Send</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
