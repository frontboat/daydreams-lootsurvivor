import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AnyAgent } from "@daydreamsai/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReactElement } from "react";

export const Route = createRootRouteWithContext<{
  agent: AnyAgent;
  queryClient: QueryClient;
  sidebar?: ReactElement;
}>()({
  async loader(ctx) {
    await ctx.context.agent.start({});
  },

  component: () => {
    const { agent, queryClient, sidebar } = Route.useRouteContext();
    return (
      <>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SidebarProvider className="font-body">
              <AppSidebar className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
              <SidebarInset className="bg-transparent bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] relative">
                <header className="sticky top-0 flex shrink-0 items-center gap-2 py-2.5 px-4 border-b bg-background z-40">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-0 h-4" />
                    <ModeToggle />
                  </div>
                  <Button asChild className="ml-auto shrink-0">
                    <Link to="/chats/$chatId" params={{ chatId: "new" }}>
                      <Plus className="w-4 h-4 mr-2 stroke-black" />
                      New Chat
                    </Link>
                  </Button>
                </header>
                <Outlet />
              </SidebarInset>
              {sidebar}
            </SidebarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </>
    );
  },
});
