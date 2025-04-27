import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const anthropic = createAnthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  headers: {
    "anthropic-dangerous-direct-browser-access": "true",
  },
});

export const anthropicModels = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-opus-latest",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
];

export const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

export const openaiModels = [
  "o1",
  "o1-mini",
  "o1-preview",
  "o3-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-4.5-preview",
  "gpt-3.5-turbo",
];

export const groq = createGroq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
});

export const groqModels = [
  "qwen-qwq-32b",
  "deepseek-r1-distill-llama-70b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

export const openrouter = createOpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
});

export const openrouterModels = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.1-8b-instruct",
  "qwen/qwen2.5-vl-3b-instruct:free",
  "google/gemini-2.5-pro-exp-03-25:free",
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-flash-1.5-8b",
  "meta-llama/llama-4-scout",
  "meta-llama/llama-4-scout:free",
  "meta-llama/llama-4-maverick",
  "meta-llama/llama-4-maverick:free",
];

export const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GOOGLE_AI_API_KEY,
});

export const googleModels = [
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash-001",
  "gemini-2.5-pro-exp-03-25",
];
