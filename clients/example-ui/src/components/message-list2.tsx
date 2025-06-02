import { ChevronsUpDown, Copy } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { ActionCall, ActionResult, AnyRef, OutputRef } from "@daydreamsai/core";
import React from "react";
import { ReactNode } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import SyntaxHighlighter from "react-syntax-highlighter";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import darcula from "react-syntax-highlighter/dist/esm/styles/hljs/darcula";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

function LogContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background border border-border/50 relative p-4 text-sm shadow transition-all duration-200 w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

type ComponentsRecord<T extends AnyRef = AnyRef> = Partial<{
  [K in T["ref"]]: T extends { ref: K }
    ? React.FC<{
        log: T;
        getLog: <Ref extends AnyRef>(
          arg: string | ((log: AnyRef) => boolean)
        ) => Ref | undefined;
      }>
    : never;
}>;

function Artifact({ artifact }: { artifact: OutputRef<string> }) {
  if (artifact.params!.contentType === "text/markdown") {
    let content = (artifact.data ?? artifact.content).trim();

    if (content.startsWith("```markdown")) {
      content = content.slice("```markdown".length, -3).trim();
    }

    return (
      <div className="prose dark:prose-invert prose-sm font-mono px-4 pb-8 min-w-full">
        {/* <div>{JSON.stringify(content)}</div> */}
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    );
  }
  if (artifact.params!.contentType === "application/vnd.ant.code")
    return (
      <div className="grid">
        <ScrollArea className="h-[500px]">
          <SyntaxHighlighter
            language={artifact.params!.language}
            style={darcula}
            customStyle={{
              paddingLeft: 16,
              // maxHeight: 800,
            }}
          >
            {artifact.data ?? artifact.content}
          </SyntaxHighlighter>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );

  return (
    <pre className="whitespace-pre-wrap">
      {artifact.data ?? artifact.content}
    </pre>
  );
}

function CollapsibleButton() {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ChevronsUpDown className="h-4 w-4" />
        <span className="sr-only">Toggle</span>
      </Button>
    </CollapsibleTrigger>
  );
}

const components: ComponentsRecord = {
  action_call: ({ log, getLog }) => {
    const result = getLog<ActionResult>(
      (t) => t.ref === "action_result" && t.callId === log.id
    );

    return (
      <LogContainer className="p-0">
        <Collapsible>
          <div className="text-xs pr-2 font-medium uppercase tracking-wider opacity-80 flex justify-between items-center">
            <div className="p-4">Action Call for {log.name}</div>
            <CollapsibleButton />
          </div>
          <CollapsibleContent className="p-4">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  id: log.id,
                  action: log.name,
                  params: log.data,
                  timestamp: log.timestamp,
                  processed: log.processed,
                  result: result
                    ? {
                        data: result.data,
                        processed: result.processed,
                        timestamp: result.timestamp,
                      }
                    : null,
                },
                null,
                2
              )}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  action_result: ({ log, getLog }) => {
    return null;
    const call = getLog<ActionCall>(log.callId);
    return (
      <LogContainer className="p-0 w-full">
        <Collapsible>
          <div className="text-xs pr-2 font-medium uppercase tracking-wider opacity-80 flex justify-between items-center">
            <div className="p-4">Action results for {log.name}</div>
            <CollapsibleButton />
          </div>
          <CollapsibleContent className="p-4">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  call: {
                    id: log.callId,
                    params: call?.data,
                  },
                  results: log.data,
                  processed: log.processed,
                },
                null,
                2
              )}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  input: ({ log }) => {
    return (
      <LogContainer>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80">
          {log.ref}
        </div>
        {log.type === "message" ? (
          <pre className="whitespace-pre-wrap break-all">
            {log.data.content}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(log)}
          </pre>
        )}
      </LogContainer>
    );
  },
  output: ({ log }) => {
    if (log.type === "artifact")
      return (
        <LogContainer className="p-0">
          <Collapsible defaultOpen>
            <div className="flex items-center opacity-80">
              <div className="text-xs font-medium uppercase tracking-wider p-4">
                {log.ref} {log.type} - {log.params!.identifier} -{" "}
                {log.params!.contentType}
              </div>
              <div className="ml-auto pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const text = log.data ?? log.content;
                    navigator.clipboard
                      .writeText(text)
                      .then(() => {
                        console.log("Text copied to clipboard");
                      })
                      .catch((err) => {
                        console.error("Failed to copy text:", err);
                      });
                  }}
                >
                  <Copy className="w-4 h-4"></Copy>
                </Button>
                <CollapsibleButton />
              </div>
            </div>
            {/* <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(log.params, null, 2)}
            </pre> */}
            <CollapsibleContent className="flex flex-grow-0 min-w-full">
              <Artifact artifact={log} />
            </CollapsibleContent>
          </Collapsible>
        </LogContainer>
      );

    return (
      <LogContainer className="p-0 pb-4">
        <div className="flex items-center opacity-80">
          <div className="text-xs font-medium uppercase tracking-wider p-4">
            {log.ref} {log.type}
          </div>
          <div className="ml-auto pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const text = log.data ?? log.content;
                navigator.clipboard
                  .writeText(text)
                  .then(() => {
                    console.log("Text copied to clipboard");
                  })
                  .catch((err) => {
                    console.error("Failed to copy text:", err);
                  });
              }}
            >
              <Copy className="w-4 h-4"></Copy>
            </Button>
          </div>
        </div>
        {log.type === "message" ? (
          <div className="prose prose-sm dark:prose-invert font-mono min-w-full px-4">
            <Markdown remarkPlugins={[remarkGfm]}>
              {log.data ?? log.content}
            </Markdown>
          </div>
        ) : (
          <div className="px-4">{JSON.stringify(log)}</div>
        )}
      </LogContainer>
    );
  },
  thought: ({ log }) => {
    return (
      <LogContainer className="p-0">
        <Collapsible>
          <div className="text-xs pr-2 font-medium uppercase tracking-wider opacity-80 flex justify-between items-center">
            <div className="p-4">{log.ref}</div>
            {/* {!log.processed && (
              <div className="ml-auto opacity-80">
                <Brain className="w-4 h-4 animate-pulse"></Brain>
              </div>
            )} */}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="px-4 pb-4">
            <pre className="whitespace-pre-line">{log.content.trim()}</pre>
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  step: ({ log }) => {
    return (
      <LogContainer className="">
        <div className="text-xs font-medium uppercase tracking-wider opacity-80">
          {log.ref} {log.step}
        </div>
      </LogContainer>
    );
  },
  run: ({ log }) => {
    return (
      <LogContainer className="">
        <div className="flex">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">
            {log.ref}
          </div>
          {/* {!log.processed && (
            <div className="ml-auto opacity-80">
              <OctagonX className="w-4 h-4 animate-pulse"></OctagonX>
            </div>
          )} */}
        </div>
      </LogContainer>
    );
  },
};

export function LogsList2({ logs }: { logs: AnyRef[] }) {
  function getLog(arg: string | ((log: AnyRef) => boolean)) {
    return logs.find(typeof arg === "function" ? arg : (log) => log.id === arg);
  }
  return (
    <div className="flex flex-col gap-4 items-center">
      {logs.map((log) => {
        const Component = components[log.ref] as React.FC<{
          log: AnyRef;
          getLog: (id: string) => AnyRef | undefined;
        }>;
        return Component ? (
          <Component key={log.id} log={log} getLog={getLog} />
        ) : null;
      })}
    </div>
  );
}
