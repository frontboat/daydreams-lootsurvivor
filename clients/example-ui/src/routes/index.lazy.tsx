import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgent } from "@/hooks/use-agent";
import { useQuery } from "@tanstack/react-query";
import { chatContext } from "@/agent/chat";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function ChatLink({ chatId }: { chatId: string }) {
  const dreams = useAgent();

  const state = useQuery({
    queryKey: ["chat:memory", chatId],
    queryFn: async () => {
      const state = await dreams.getContext({
        context: chatContext,
        args: {
          chatId,
        },
      });

      return state;
    },
  });

  return (
    <Link
      key={chatId}
      to="/chats/$chatId"
      params={{ chatId }}
      className="block p-4 rounded-lg border hover:border-primary transition-colors"
    >
      <h2 className="font-semibold text-lg mb-2 truncate">
        {state.data?.memory.title ?? chatId}
      </h2>
    </Link>
  );
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

      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-4`}>
        {chats?.map((chat) => {
          const chatId = chat.args?.chatId ?? chat.id.split(":")[1];

          return <ChatLink key={chatId} chatId={chatId} />;
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
