import { Route } from "@/routes/chats/$chatId";
import { useAgent } from "@/hooks/use-agent";
import { chatContext } from "@/agent/chat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionCtxRef,
  AnyContext,
  AnyRef,
  ContextState,
  formatSchema,
  getWorkingMemoryAllLogs,
  OutputRef,
  prepareContext,
  WorkingMemory,
} from "@daydreamsai/core";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { RefreshCw, Trash, X } from "lucide-react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReactNode, useEffect, useMemo, useState } from "react";

export function ChatSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { chatId } = Route.useParams({
    // shouldThrow: true,
  });

  const { user, subContexts } = Route.useLoaderData();

  const dreams = useAgent();

  const contextId = dreams.getContextId({
    context: chatContext,
    args: {
      chatId,
    },
  });

  const state = useQuery({
    queryKey: ["chat:state", chatId],
    queryFn: async () => {
      const agentCtxState = await dreams.getContext({
        context: dreams.context,
        args: {},
      });

      const ctxState = await dreams.getContext({
        context: chatContext,
        args: {
          chatId,
        },
      });

      const workingMemory = await dreams.getWorkingMemory(contextId);

      const { contexts, actions, outputs } = await prepareContext({
        agent: dreams,
        ctxState,
        workingMemory,
        agentCtxState,
        params: {
          contexts: subContexts,
        },
      });

      return {
        agentCtxState,
        ctxState,
        workingMemory,
        contexts,
        actions,
        outputs,
      };
    },
  });

  const router = useRouter();

  const queryClient = useQueryClient();
  const deleteChat = useMutation({
    mutationFn: async () => {
      await dreams.deleteContext(contextId);
    },
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({
        queryKey: ["chat:state", chatId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["chat:workingMemory", chatId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["agent:chats"],
      });

      router.navigate({
        to: "/",
      });
    },
  });

  const searchParams = Route.useSearch({});

  console.log({ searchParams });

  const artifacts =
    state.data?.workingMemory.outputs.filter(
      (output) => output.type === "artifact"
    ) ?? [];

  const runRef =
    searchParams.page === "run" && searchParams.pageId !== undefined
      ? (state.data?.workingMemory.runs.find(
          (run) => run.id === searchParams.pageId
        )! ?? undefined)
      : undefined;

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "sticky hidden lg:flex top-0 min-h-svh max-h-svh border-l shrink-0 h-full",
        searchParams.page ? "w-6/12" : "w-5/12"
      )}
      side="right"
      {...props}
    >
      {searchParams.page === "artifact" &&
        searchParams.pageId !== undefined && (
          <ArtifactPage
            artifacts={artifacts.filter(
              (output) => output.params!.identifier === searchParams.pageId
            )}
          />
        )}
      {searchParams.page === "run" && searchParams.pageId !== undefined && (
        <SidebarContent className="px-4 py-4 bg-sidebar">
          <div className="flex gap-4 items-center">
            <div>Run: {runRef?.id}</div>
            <Button
              className="ml-auto"
              variant="outline"
              onClick={() => {
                // setPage(undefined);
              }}
            >
              <X />
            </Button>
          </div>
          <div>
            <StepsTable
              data={
                state.data
                  ? getWorkingMemoryAllLogs(state.data.workingMemory)
                  : []
              }
            />
          </div>
          <div>
            <Accordion type="single" collapsible>
              {(state.data?.workingMemory.steps ?? []).map((step) => (
                <AccordionItem value={step.id} key={step.id}>
                  <AccordionTrigger>Step {step.step}</AccordionTrigger>
                  <AccordionContent>
                    <div>
                      <pre className="whitespace-pre-wrap">
                        {step.data.prompt}
                      </pre>
                    </div>
                    <Separator />
                    <div>
                      <pre className="whitespace-pre-wrap">
                        {step.data.response}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </SidebarContent>
      )}
      {searchParams?.page === "sandbox" && (
        <SidebarContent className="px-4 bg-sidebar max-h-svh h-full flex flex-col pb-4">
          <div className="pt-3 pb-1">Sandbox</div>
          <div className="flex-1 flex flex-col border border-white">
            <Input className="mt-auto"></Input>
          </div>
        </SidebarContent>
      )}
      {searchParams.page === undefined && (
        <SidebarContent className="bg-sidebar h-full flex flex-col">
          <div className="flex items-start px-4 py-2.5 border-b">
            <div className="flex ml-auto gap-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  state.refetch();
                }}
              >
                <RefreshCw></RefreshCw>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  deleteChat.mutate();
                }}
              >
                <Trash></Trash>
              </Button>
            </div>
          </div>
          <ScrollArea className="h-full flex flex-col mr-1.5 pt-2">
            <div className="flex flex-col px-4 pb-4 gap-2">
              <h3 className="font-medium uppercase">Contexts</h3>
              {state.data?.contexts.map((ctxState) => (
                <ContextStateCard ctxState={ctxState} key={ctxState.id} />
              ))}
              {artifacts.length > 0 && <Artifacts artifacts={artifacts} />}
              <Actions actions={state.data?.actions ?? []}></Actions>
              {state.data && (
                <WorkingMemoryCard workingMemory={state.data.workingMemory} />
              )}
            </div>
          </ScrollArea>
        </SidebarContent>
      )}
    </Sidebar>
  );
}

function formatContent(content: string | string[] | undefined) {
  return Array.isArray(content)
    ? content.map((t) => t.trim()).join("\n")
    : (content?.trim() ?? "");
}

function formatContextDescription(ctxState: ContextState<AnyContext>) {
  const description = ctxState.context.description;
  if (typeof description === "function")
    return formatContent(description(ctxState));

  return formatContent(description);
}

function ContextStateCard({
  ctxState,
}: {
  ctxState: ContextState<AnyContext>;
}) {
  return (
    <Card className="hover:bg-accent transition-colors" key={ctxState.id}>
      <CardHeader className="px-4 py-4">
        <CardTitle className="uppercase">{ctxState.context.type}</CardTitle>
        <CardDescription className="text-xs">{ctxState.id}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 grid gap-2">
        {ctxState.context.description && (
          <div className="text-muted-foreground">
            {formatContextDescription(ctxState)}
          </div>
        )}
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
          {ctxState.context.render
            ? formatContent(ctxState.context.render(ctxState))
            : JSON.stringify(ctxState.memory, null, 2)}
        </pre>
      </CardContent>
      <CardFooter className="px-4 pb-4">
        <div className="mt-2 flex gap-2">
          {/* {ctxState.id === state.data?.ctxState.id ? (
                    <span className="text-xs bg-secondary px-2 py-1">
                      Main Context
                    </span>
                  ) : state.data?.agentCtxState &&
                    state.data?.agentCtxState.id === ctxState.id ? (
                    <span className="text-xs bg-secondary px-2 py-1">
                      Agent Context
                    </span>
                  ) : (
                    <span className="text-xs bg-secondary px-2 py-1">
                      Sub Context
                    </span>
                  )} */}
          <span className="text-xs bg-secondary px-2 py-1">
            {ctxState.context.type}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

function Artifacts({ artifacts }: { artifacts: OutputRef<any>[] }) {
  const { chatId } = Route.useParams();
  const router = useRouter();

  const artifactsIds = new Set(
    artifacts.map((artifact) => artifact.params!.identifier)
  );

  return (
    <div className="contents">
      <div className="flex justify-between items-start mt-4">
        <h3 className="font-medium uppercase">Artifacts</h3>
      </div>
      {Array.from(artifactsIds).map((artifactId) => {
        const artifact = artifacts.findLast(
          (a) => a.params!.identifier == artifactId
        )!;
        return (
          <Card
            key={artifact.id}
            className="p-4 hover:bg-accent transition-colors"
            onClick={() => {
              router.navigate({
                to: "/chats/$chatId",
                params: {
                  chatId,
                },
                search: {
                  page: "artifact",
                  pageId: artifact.params!.identifier,
                },
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground whitespace-pre break-all">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium uppercase">
                    {artifact.params!.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {
                      artifacts.filter(
                        (a) => a.params!.identifier == artifactId
                      ).length
                    }{" "}
                    Versions
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="text-xs bg-secondary px-2 py-1">
                    {artifact.params!.contentType}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const artifactContentTypes: Record<
  string,
  (artifact: OutputRef<any>) => ReactNode
> = {
  "text/markdown": (artifact) => (
    <ScrollArea className="h-full flex flex-col">
      <div className="px-4 pb-8">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: (e) => <h1 className="text-xl font-bold">{e.children}</h1>,
            h2: (e) => <h1 className="text-lg font-bold">{e.children}</h1>,
            ul: (e) => (
              <ul className="list-disc list-inside grid pb-2">{e.children}</ul>
            ),
            ol: (e) => (
              <ol className="list-decimal list-inside grid pb-2">
                {e.children}
              </ol>
            ),
            li: (e) => <li className="">{e.children}</li>,
          }}
        >
          {artifact.data.trim()}
        </Markdown>
      </div>
    </ScrollArea>
  ),
  "text/html": (artifact) => (
    <div className="px-4 pb-8 flex-1 grid">
      <IFrameArtifact>{artifact.data.trim()}</IFrameArtifact>
    </div>
  ),
};

function ArtifactPage({ artifacts }: { artifacts: OutputRef[] }) {
  const { chatId } = Route.useParams();
  const router = useRouter();

  const [artifactId, selectArtifactId] = useState(
    artifacts?.at(-1)?.id ?? undefined
  );

  const artifact = artifactId
    ? artifacts.find((artifact) => artifact.id === artifactId)
    : undefined;

  const customElement = artifact
    ? artifactContentTypes[artifact.params!.contentType]
    : undefined;

  useEffect(() => {
    if (artifactId === undefined) {
      selectArtifactId(artifacts?.at(-1)?.id);
    }
  }, [artifacts]);

  return (
    <SidebarContent className="bg-sidebar min-h-svh h-full flex flex-col flex-1">
      <div className="flex gap-4 items-center px-4 border-b py-2.5 border-l">
        <div>{artifact?.params!.title}</div>
        <Select
          value={artifactId}
          onValueChange={(v) => {
            selectArtifactId(
              v === "lattest" ? (artifacts?.at(-1)?.id ?? undefined) : v
            );
          }}
        >
          <SelectTrigger className="w-[200px] h-auto px-6 py-2 mr-auto border-0 focus:ring-0">
            <SelectValue placeholder="Select a version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lattest">Lattest Version</SelectItem>
            {artifacts.map((artifact, v) => (
              <SelectItem value={artifact.id} key={artifact.id}>
                {artifact.params!.title} version: {v + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="ml-auto"
          variant="outline"
          size="icon"
          onClick={() => {
            router.navigate({
              to: "/chats/$chatId",
              params: {
                chatId,
              },
            });
            // setPage(undefined);
          }}
        >
          <X />
        </Button>
      </div>
      {artifact &&
        (customElement ? (
          customElement(artifact)
        ) : (
          <ScrollArea className="h-full flex flex-col">
            <pre className="whitespace-pre-wrap px-4 pb-8">
              {artifact.data.trim()}
            </pre>
          </ScrollArea>
        ))}
    </SidebarContent>
  );
}

function Actions({ actions }: { actions: ActionCtxRef[] }) {
  return (
    <div className="contents">
      <h3 className="font-medium uppercase pt-4">Actions</h3>
      <div className="grid gap-2">
        {actions.map((action) => (
          <Card key={[action.ctxId, action.name].join(":")}>
            <CardHeader className="px-4 py-4 pb-0">
              <CardTitle>{action.name}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <Accordion type="multiple">
                <AccordionItem value="schema">
                  <AccordionTrigger>Schema</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                      {action.schema
                        ? JSON.stringify(formatSchema(action.schema), null, 2)
                        : ""}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            {/* <CardFooter className="px-4 gap-4">
              <Button variant="outline">Call</Button>
            </CardFooter> */}
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkingMemoryCard({
  workingMemory,
}: {
  workingMemory: WorkingMemory;
}) {
  return (
    <>
      <div className="flex justify-between items-start pt-4">
        <h3 className="font-medium uppercase">Working Memory</h3>
      </div>
      <Card className="p-4 mb-4 hover:bg-accent transition-colors">
        <div className="flex flex-col gap-2">
          {/* {workingMemory.runs.map((run) => (
            <div
              key={run.id}
              className="text-xs"
              onClick={() => {
                // setPage({ page: "run", id: run.id });
              }}
            >
              run #{run.id}
            </div>
          ))}
          {workingMemory.steps.map((step) => (
            <div key={step.id} className="text-xs">
              step {step.step}
            </div>
          ))} */}
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {workingMemory
              ? JSON.stringify(
                  [],
                  // getWorkingMemoryLogs(workingMemory).reverse(),
                  null,
                  2
                )
              : ""}
          </pre>{" "}
        </div>
      </Card>
    </>
  );
}

const columns: ColumnDef<AnyRef>[] = [
  {
    accessorKey: "ref",
    header: "Ref",
  },
  // {
  //   accessorFn: (log) => "",

  //   // header: (t) => t.column,
  // }
];

function StepsTable({ data }: { data: AnyRef[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function IFrameArtifact({ children }: { children: string }) {
  const iframeUrl = useMemo(() => {
    const blob = new Blob([children], { type: "text/html" });
    const iframeUrl = URL.createObjectURL(blob);
    return iframeUrl;
  }, [children]);

  return (
    <iframe
      src={iframeUrl}
      className="w-full h-full bg-white overflow-hidden"
    ></iframe>
  );
}
