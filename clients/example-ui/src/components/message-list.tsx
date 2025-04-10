import {
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Download,
  FileText,
  Terminal,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import {
  ActionCall,
  ActionResult,
  AnyAction,
  AnyRef,
  OutputRef,
} from "@daydreamsai/core";
import React, { useState } from "react";
import { ReactNode } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import SyntaxHighlighter from "react-syntax-highlighter";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import darcula from "react-syntax-highlighter/dist/esm/styles/hljs/darcula";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { IFrameArtifact } from "./chat-sidebar";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { JSONSchema7Definition } from "@ai-sdk/provider";
import { JSONSchema4, JSONSchema4Object } from "json-schema";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

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
  if (artifact.params!.contentType === "text/html" && artifact.data) {
    let content = artifact.data.trim();

    if (content.startsWith("```html")) {
      content = content.slice("```html".length, -3).trim();
    }

    return (
      <div className="px-4 pb-8 min-w-full min-h-[80vh]">
        {/* <div>{JSON.stringify(content)}</div> */}
        <IFrameArtifact>{content}</IFrameArtifact>
      </div>
    );
  }
  if (artifact.params!.contentType === "application/pdf" && artifact.data) {
    return (
      <div className="px-4 pb-8 min-w-full min-h-[80vh]">
        {/* <div>{JSON.stringify(content)}</div> */}
        <IFrameArtifact contentType="application/pdf">
          {artifact.data}
        </IFrameArtifact>
      </div>
    );
  }

  if (artifact.params!.contentType === "text/markdown") {
    let content = (
      artifact.data
        ? typeof artifact.data !== "string"
          ? JSON.stringify(artifact.data)
          : artifact.data
        : artifact.content
    ).trim();

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

  if (
    artifact.params!.contentType === "application/vnd.ant.code" ||
    artifact.params!.contentType === "application/vnd.ant.react"
  )
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
    <pre className="whitespace-pre-wrap px-4">
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
interface CliCommandProps {
  command: string;
  title?: string;
  stdout?: string;
  stderr?: string;
}

const CliCommandComponent: React.FC<CliCommandProps> = ({
  command,
  title = "Sandbox Command",
  stdout,
  stderr,
}) => {
  return (
    <Alert className="font-mono">
      <Terminal className="h-4 w-4 mt-1" />
      <AlertDescription className="mt-2">
        <code className="font-semibold">{command}</code>
        {stdout && ( // Use && for conditional rendering
          <pre className="text-sm whitespace-pre-wrap border-t mt-2 pt-2">
            {stdout.trim()}
          </pre>
        )}
        {stderr && ( // Use && for conditional rendering
          <pre className="text-sm whitespace-pre-wrap border-t mt-2 pt-2 text-red-600">
            {stderr.trim()}
          </pre>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface FileWriteProps {
  filePath: string;
  fileContent: string;
  title?: string;
}

const FileWriteComponent: React.FC<FileWriteProps> = ({
  filePath,
  fileContent,
  title = "Sandbox Write File",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = () => {
    // Basic browser download logic
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "download.txt"; // Get filename from path
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Note: This download logic relies on standard browser APIs.
    // Its behavior might vary depending on the execution environment.
  };

  return (
    <Alert className="font-mono">
      <FileText className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <span>{filePath}</span>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
      </AlertDescription>

      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mt-2 border-t pt-2 !pl-0"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-1"
          >
            <ChevronDown
              className={`h-4 w-4 mr-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
            {isOpen ? "Hide" : "Show"} Content ({fileContent.split("\n").length}{" "}
            lines)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-96">
            {fileContent}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
};

type ActionProps<Schema = any, Result = any> = {
  call: ActionCall<Schema>;
  result?: ActionResult<Result>;
};

const actionComponents: Record<string, React.FC<ActionProps<any, any>>> = {
  "tavily.search": ({
    call,
    result,
  }: ActionProps<
    { query: string },
    {
      results: { url: string; title: string; content: string }[];
      totalResults: number;
    }
  >) => {
    return (
      <div>
        <div>Query:{call.data?.query}</div>
        <div className="mt-2">Results:{result?.data.totalResults}</div>
        {result === undefined && <div>Loading...</div>}
        <div className="list-disc">
          <ul className="grid gap-4 mt-4 list list-disc">
            {result?.data.results.map((r, i) => {
              return (
                <li key={i} className="grid gap-1">
                  <div className="">{r.title}</div>
                  <a href={r.url} target="_blank">
                    {r.url}
                  </a>
                  <div className="prose prose-invert prose-sm min-w-full">
                    {r.content}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  },
  "planner.initialize": ({
    call,
    result,
  }: ActionProps<{ plan: string; tasks: string[] }>) => {
    console.log({ call, result });
    return (
      <div className="grid gap-2">
        <div className="">{call.data.plan}</div>
        <div>Tasks</div>
        <div className="grid gap-1">
          {call.data.tasks.map((task, i) => (
            <div key={i} className="list-item list-inside">
              {task}
            </div>
          ))}
        </div>
      </div>
    );
  },
  "sandbox.commands.run": ({
    call,
    result,
  }: ActionProps<
    { sandboxId: string; cmd: string },
    { error?: any; stdout: string; stderr: string }
  >) => {
    console.log(call.data?.cmd, { call: call.data, result: result?.data });
    const error = result?.data?.error
      ? [
          result?.data?.error?.name,
          JSON.stringify(result?.data?.error?.result, null, 2),
        ].join("\n")
      : result?.data?.stderr;
    return (
      <CliCommandComponent
        command={call.data?.cmd ?? ""}
        stdout={result?.data?.stdout}
        stderr={error}
      />
    );
  },
  "sandbox.files.write": ({
    call,
    result,
  }: ActionProps<{ sandboxId: string; path: string; content: string }, {}>) => {
    return (
      <FileWriteComponent
        filePath={call.data?.path}
        fileContent={call.data?.content ?? ""}
      />
    );
  },
};

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
          <CollapsibleContent className="px-4 pb-4">
            {actionComponents[log.name] ? (
              actionComponents[log.name]({ call: log, result })
            ) : (
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(
                  {
                    id: log.id,
                    action: log.name,
                    params: log.data ?? log.content,
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
            )}
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  action_result: ({ log, getLog }) => {
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
          {log.ref} {log.type} from {log.params?.user}
        </div>
        {log.type === "message" ? (
          <pre className="whitespace-pre-wrap break-all">
            {log.data.content ?? log.data}
          </pre>
        ) : typeof log.data === "string" ? (
          <pre className="whitespace-pre-wrap break-all">{log.data}</pre>
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
        ) : log.type === "secure-form" ? (
          <>
            {/* <pre className="px-4 whitespace-pre-wrap">
              {JSON.stringify(log, null, 2)}
            </pre> */}
            <SecureForm params={log.params! as any} schema={log.data} />
          </>
        ) : (
          <pre className="px-4 whitespace-pre-wrap">
            {JSON.stringify(log, null, 2)}
          </pre>
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
  event: ({ log }) => {
    return (
      <LogContainer className="p-0">
        <Collapsible>
          <div className="text-xs pr-2 font-medium uppercase tracking-wider opacity-80 flex justify-between items-center">
            <div className="p-4">
              {log.ref} {log.name}
            </div>
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
};

function SecureForm({
  params,
  schema,
}: {
  params: { title: string; description: string };
  schema: JSONSchema4;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Card className="border-0">
        <CardHeader className="p-4">
          <CardTitle>{params.title}</CardTitle>
          <CardDescription>{params.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid gap-4">
          {Object.keys(schema.properties ?? {}).map((key) => (
            <div className="grid gap-2">
              <Label className="">{key}</Label>
              <Input name={key}></Input>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 justify-between">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function LogsList({
  logs,
  hide,
}: {
  logs: AnyRef[];
  hide?: Partial<Record<AnyRef["ref"], true>>;
}) {
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

        if (hide?.[log.ref] === true) return null;

        return Component ? (
          <Component key={log.id} log={log} getLog={getLog} />
        ) : null;
      })}
    </div>
  );
}
