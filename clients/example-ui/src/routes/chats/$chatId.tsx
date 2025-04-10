import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  type AnyAction,
  AnyRef,
  ContextRef,
  getWorkingMemoryAllLogs,
} from "@daydreamsai/core";
import { useAgent } from "@/hooks/use-agent";
import { chatContext, createChatSubContexts } from "@/agent/chat";
import { v7 as randomUUIDv7 } from "uuid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogsList } from "@/components/message-list";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { ChatSidebar } from "@/components/chat-sidebar";
import { getModel, ModelSelect } from "@/components/model-select";
import { useSendMessage } from "@/hooks/use-send-message";
import { useLogs } from "@/hooks/use-logs";

export const Route = createFileRoute("/chats/$chatId")({
  component: RouteComponent,

  beforeLoad(ctx) {
    return {
      sidebar: <ChatSidebar />,
    };
  },

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

const SelfResizingTextarea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      className={cn(
        "resize-none border rounded-md py-2 px-3 w-full h-10 max-h-[500px]",
        className
      )}
      {...props}
      onChange={(e) => {
        e.currentTarget.style.height = `inherit`;
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        props.onChange?.(e);
      }}
      onReset={(e) => {
        e.currentTarget.style.height = `inherit`;
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        props.onReset?.(e);
      }}
    />
  );
});

function RouteComponent() {
  const { chatId } = Route.useParams();
  const { user, subContexts } = Route.useLoaderData();

  const dreams = useAgent();
  const [model, setModel] = useState<string>("default");

  const queryClient = useQueryClient();

  const scrollRef = useRef<HTMLDivElement>(null);

  const { logs, newLog, workingMemory, setLogs, setNewLog } = useLogs({
    context: chatContext,
    args: {
      chatId,
    },
  });

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

  const { send, abortControllerRef } = useSendMessage({
    agent: dreams,
    context: chatContext,
    args: { chatId },
    async onSuccess(data) {
      console.log(data);
      setNewLog(undefined);
      await queryClient.invalidateQueries({
        queryKey: ["agent:chats"],
      });

      await workingMemory.refetch();
    },
  });

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
    <>
      <div className="px-4 pt-8 pb-36" ref={scrollRef}>
        <LogsList
          logs={newLog ? [...logs, newLog] : logs}
          hide={{
            action_result: true,
            event: true,
          }}
        />
      </div>
      <form
        className="bg-background flex flex-col mt-auto sticky bottom-5 left-0 right-0 mx-20 rounded-xl border overflow-hidden"
        onSubmit={async (e) => {
          e.preventDefault();
          const msg = new FormData(e.currentTarget).get("message") as string;
          // e.currentTarget.reset();
          const textarea = e.currentTarget.elements.namedItem(
            "message"
          )! as HTMLTextAreaElement;

          textarea.value = "";

          textarea.style.height = `inherit`;

          send.mutate({
            input: {
              type: "message",
              data: {
                user,
                content: msg,
              },
            },
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
    </>
  );
}
