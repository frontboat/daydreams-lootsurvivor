// import { MessagesList } from "@/components/message-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/hooks/use-agent";
import { useMessages } from "@/hooks/use-messages";
import { context, getWorkingMemoryLogs } from "@daydreamsai/core";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as z from "zod/v4";

export const Route = createFileRoute("/workbench/")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const dreams = useAgent();
  const { messages, setMessages, handleLog } = useMessages();

  const [prompt, setPrompt] = useState("");
  const [key, setKey] = useState("this-is-a-test");
  const [isLoading, setIsLoading] = useState(false);

  const keyRef = useRef(key);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const ctx = context({
    schema: z.object({
      key: z.string(),
    }),
    key: ({ key }) => key,
    type: "custom",
    render() {
      return prompt;
    },
  });

  const contextId = dreams.getContextId({
    context: ctx,
    args: {
      key,
    },
  });

  const resetContext = async () => {
    setIsLoading(true);
    setMessages([]);
    try {
      await dreams.start();
      const workingMemory = await dreams.getWorkingMemory(contextId);
      getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    resetContext();
  }, [dreams, key]);

  keyRef.current = key;

  return (
    <div className="flex flex-col lg:flex-row max-h-screen min-h-[calc(100vh-64px)] relative bg-background">
      {/* Left Panel - Context Configuration */}
      <div className="w-full lg:w-2/5 h-full flex flex-col max-h-screen overflow-hidden border-r">
        <Card className="border-0 rounded-none shadow-none h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center justify-between">
              Context Configuration
              <Button
                variant="outline"
                size="sm"
                onClick={resetContext}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Reset
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1 p-4 overflow-hidden">
            <div className="space-y-2">
              <Label htmlFor="context-key">Context Key</Label>
              <Input
                id="context-key"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                }}
                className="font-mono text-sm"
              />
            </div>

            <Separator className="my-2" />

            <div className="space-y-2 flex-1 overflow-hidden">
              <Label htmlFor="context-prompt">Context Prompt</Label>
              <ScrollArea className="h-[calc(100%-2rem)]">
                <Textarea
                  id="context-prompt"
                  value={prompt}
                  className="min-h-[300px] font-mono text-sm resize-none"
                  onChange={(e) => {
                    setPrompt(e.target.value);
                  }}
                />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="w-full lg:w-3/5 h-full flex flex-col max-h-screen overflow-hidden">
        <Card className="border-0 rounded-none shadow-none h-full flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="px-4 py-4">
                {/* <MessagesList messages={messages} /> */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4 bg-background">
              <form
                className="flex items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const msg = formData.get("message") as string;

                  if (!msg.trim()) return;

                  setIsLoading(true);
                  setMessages((msgs) => [
                    ...msgs,
                    {
                      id: Date.now().toString(),
                      type: "user",
                      message: msg,
                    },
                  ]);

                  e.currentTarget.reset();
                  if (messageInputRef.current) {
                    messageInputRef.current.focus();
                  }

                  try {
                    await dreams.send({
                      context: ctx,
                      args: {
                        key,
                      },
                      input: {
                        type: "message",
                        data: {
                          user: "galego",
                          content: msg,
                        },
                      },
                      handlers: {
                        onLogStream(log, done) {
                          if (keyRef.current === key) {
                            handleLog(log, done);
                          }
                        },
                      },
                    });

                    if (messages.length === 0) {
                      queryClient.invalidateQueries({
                        queryKey: ["agent:chats"],
                      });
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <Input
                  type="text"
                  name="message"
                  ref={messageInputRef}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} className="gap-1">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
