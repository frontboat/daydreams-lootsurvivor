import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgent } from "@/hooks/use-agent";
import { useQuery } from "@tanstack/react-query";
import { chatContext } from "@/agent/chat";
import { formatXml } from "@daydreamsai/core";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function ChatLink({ chatId }: { chatId: string }) {
  const dreams = useAgent();

  const state = useQuery({
    queryKey: ["chat:memory", chatId],
    queryFn: async () => {
      const state = await dreams.loadContext({
        context: chatContext,
        args: {
          chatId,
        },
      });

      return state;
    },
    initialData: () => null,
  });

  const workingMemory = useQuery({
    enabled: state.data !== null,
    queryKey: ["chat:workingMemory", chatId],
    queryFn: async () => {
      const state = await dreams.getWorkingMemory(
        dreams.getContextId({
          context: chatContext,
          args: {
            chatId,
          },
        })
      );

      return state;
    },
  });

  const firstInput = workingMemory.data?.inputs[0];

  return (
    <Link
      key={chatId}
      to="/chats/$chatId"
      params={{ chatId }}
      className="p-4 rounded-lg border hover:border-primary transition-colors flex flex-col"
    >
      <h2 className="font-semibold text-lg mb-2">
        {state.data?.memory.title ?? chatId}
      </h2>
      <div className="prose prose-invert text-ellipsis max-h-20 overflow-hidden">
        {renderInput(firstInput?.data ?? firstInput?.content ?? "").slice(
          0,
          250
        )}
      </div>
      <div className="mt-auto pt-6 text-xs">
        {firstInput && new Date(firstInput.timestamp).toISOString()}
      </div>
    </Link>
  );
}

function renderInput(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((v) => renderInput(v)).join("\n");
  }

  if (value && "tag" in value) {
    return formatXml(value);
  }

  if (value && "content" in value) {
    return renderInput(value.content);
  }

  return JSON.stringify(value);
}

function Index() {
  const agent = useAgent();
  const isMobile = useIsMobile();

  const {
    data: chats,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agent:chats"],
    queryFn: async () => {
      const contexts = await agent.getContexts();
      return contexts.filter((ctx) => ctx.type === "chat");
    },
  });

  if (isLoading) {
    return <div className="p-4">Loading chat histories...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Conversations</h1>
      </div>

      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-4"} gap-4`}>
        {chats
          ?.slice()
          .reverse()
          .map((chat, i) => {
            const chatId = chat.id.split(":").slice(1).join(":");

            return <ChatLink key={chat.id} chatId={chatId} />;
          })}

        {chats?.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            No conversations yet. Start a new chat to begin!
          </div>
        )}
      </div>
    </div>
  );
}
