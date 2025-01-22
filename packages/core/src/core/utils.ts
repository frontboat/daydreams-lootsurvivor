import { Ajv, type JSONSchemaType } from "ajv";
import zodToJsonSchema from "zod-to-json-schema";
import type { LLMValidationOptions } from "../types";

export const injectTags = (
  tags: Record<string, string> = {},
  text: string
): string => {
  let result = text;
  const tagMatches = text.match(/\{\{(\w+)\}\}/g) || [];
  const uniqueTags = [...new Set(tagMatches)];

  uniqueTags.forEach((tag) => {
    const tagName = tag.slice(2, -2);
    const values: string[] = [];
    if (tags[tagName]) {
      // Find all occurrences and collect values
      tagMatches.forEach((match) => {
        if (match === tag) {
          values.push(tags[tagName]);
        }
      });
      // Replace with concatenated values if multiple occurrences
      result = result.replace(new RegExp(tag, "g"), values.join("\n"));
    }
  });

  return result;
};

export const generateUniqueId = (): string => {
  // Quick example ID generator
  return "step-" + Math.random().toString(36).substring(2, 15);
};

export const determineEmotions = (
  action: string,
  result: string | Record<string, any>,
  importance: number
): string[] => {
  const resultStr =
    typeof result === "string" ? result : JSON.stringify(result);
  const resultLower = resultStr.toLowerCase();
  const emotions: string[] = [];

  // Success/failure emotions
  const isFailure =
    resultLower.includes("error") || resultLower.includes("failed");
  const isHighImportance = importance > 0.7;

  if (isFailure) {
    emotions.push("frustrated");
    if (isHighImportance) emotions.push("concerned");
  } else {
    emotions.push("satisfied");
    if (isHighImportance) emotions.push("excited");
  }

  // Learning emotions
  if (resultLower.includes("learned") || resultLower.includes("discovered")) {
    emotions.push("curious");
  }

  // Action-specific emotions
  if (action.includes("QUERY") || action.includes("FETCH")) {
    emotions.push("analytical");
  }
  if (action.includes("TRANSACTION") || action.includes("EXECUTE")) {
    emotions.push("focused");
  }

  return emotions;
};

export const calculateImportance = (result: string): number => {
  const keyTerms = {
    high: [
      "error",
      "critical",
      "important",
      "success",
      "discovered",
      "learned",
      "achieved",
      "completed",
      "milestone",
    ],
    medium: [
      "updated",
      "modified",
      "changed",
      "progress",
      "partial",
      "attempted",
    ],
    low: ["checked", "verified", "queried", "fetched", "routine", "standard"],
  };

  const resultLower = result.toLowerCase();

  // Calculate term-based score
  let termScore = 0;
  keyTerms.high.forEach((term) => {
    if (resultLower.includes(term)) termScore += 0.3;
  });
  keyTerms.medium.forEach((term) => {
    if (resultLower.includes(term)) termScore += 0.2;
  });
  keyTerms.low.forEach((term) => {
    if (resultLower.includes(term)) termScore += 0.1;
  });

  // Cap term score at 0.7
  termScore = Math.min(termScore, 0.7);

  // Calculate complexity score based on result length and structure
  const complexityScore = Math.min(
    result.length / 1000 +
      result.split("\n").length / 20 +
      (JSON.stringify(result).match(/{/g)?.length || 0) / 10,
    0.3
  );

  // Combine scores
  return Math.min(termScore + complexityScore, 1);
};

export const getValidatedLLMResponse = async <T>({
  prompt,
  systemPrompt,
  schema,
  maxRetries = 3,
  onRetry,
  llmClient,
  logger,
}: LLMValidationOptions<T>): Promise<T> => {
  const ajv = new Ajv();

  const jsonSchema = zodToJsonSchema(schema, "mySchema");
  const validate = ajv.compile(jsonSchema as JSONSchemaType<T>);
  let attempts = 0;

  const formattedPrompt = `
    ${prompt}

    <response_structure>
    Return a JSON object matching this schema. Do not include any markdown formatting.

    ${JSON.stringify(jsonSchema, null, 2)}
    </response_structure>
  `;

  while (attempts < maxRetries) {
    try {
      const response = await llmClient.analyze(formattedPrompt, {
        system: systemPrompt,
      });

      let responseText = response.toString();

      // Remove markdown code block formatting if present
      responseText = responseText.replace(/```json\n?|\n?```/g, "");

      let parsed: T;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(
          "getValidatedLLMResponse",
          "Failed to parse LLM response as JSON",
          {
            response: responseText,
            error: parseError,
          }
        );
        attempts++;
        onRetry?.(parseError as Error, attempts);
        continue;
      }

      if (!validate(parsed)) {
        logger.error(
          "getValidatedLLMResponse",
          "Response failed schema validation",
          {
            errors: validate.errors,
            response: parsed,
          }
        );
        attempts++;
        onRetry?.(
          new Error(
            `Schema validation failed: ${JSON.stringify(validate.errors)}`
          ),
          attempts
        );
        continue;
      }

      return parsed;
    } catch (error) {
      logger.error(
        "getValidatedLLMResponse",
        `Attempt ${attempts + 1} failed`,
        { error }
      );
      attempts++;
      onRetry?.(error as Error, attempts);

      if (attempts >= maxRetries) {
        throw new Error(
          `Failed to get valid LLM response after ${maxRetries} attempts: ${error}`
        );
      }
    }
  }

  throw new Error("Maximum retries exceeded");
};
