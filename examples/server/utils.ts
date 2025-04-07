import type { Tool } from "ai";

export type ToolSet = Record<string, Tool<any, any>>;

export function createToolSet<Tools extends ToolSet>(tools: {
  [K in keyof Tools]: Tools[K];
}) {
  return tools;
}
