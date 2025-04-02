import { z } from "zod";

export const searchResultsSchema = z.object({
  learnings: z
    .array(
      z.object({
        content: z.string().describe("learning content"),
        references: z.array(z.string()).describe("url references"),
      })
    )
    .describe(`List of learnings, max of 5`),

  followUpQueries: z.array(
    z.object({
      query: z
        .string()
        .describe(
          "List of follow-up SERP queries to research the topic further, max of 2"
        ),
      goal: z
        .string()
        .describe(
          "The goal of the research that this query is meant to accomplish"
        ),
      // nextSteps: z.array(z.string()),
    })
  ),
});

export type SearchResultSchema = z.infer<typeof searchResultsSchema>;

export const researchSchema = z.object({
  id: z.string().describe("id of the research use memorable ids"),
  name: z.string().describe("The research name/topic"),
  prompt: z.string().describe("the user prompt"),
  maxDepth: z
    .number()
    .default(2)
    .optional()
    .describe("Max deepth of the research"),
  queries: z.array(
    z.object({
      query: z.string().describe("The SERP query"),
      goal: z
        .string()
        .describe(
          "The goal of the research that this query is meant to accomplish"
        ),
    })
  ),
  questions: z
    .array(z.string())
    .describe(
      `Follow up questions to clarify the research direction, max of 5`
    ),
});
