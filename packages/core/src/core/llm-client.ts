import { setTimeout } from "timers/promises";
import { EventEmitter } from "events";
import type {
  AnalysisOptions,
  LLMClientConfig,
  LLMResponse,
  StructuredAnalysis,
} from "../types";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

export class LLMClient extends EventEmitter {
  private readonly config: Required<LLMClientConfig>;

  constructor(config: LLMClientConfig) {
    super();
    this.setMaxListeners(50);

    this.config = {
      model: config.model || this.getDefaultModel(),
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      temperature: config.temperature || 0.3,
      maxTokens: config.maxTokens || 1000,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 10000,
    };

    this.initializeClient();
  }

  private initializeClient(): void {}

  public async complete(prompt: string): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeCompletion(prompt);
      } catch (error) {
        lastError = error as Error;

        if (this.shouldRetry(error as Error, attempt)) {
          const delay = this.calculateBackoff(attempt);
          await setTimeout(delay);
          continue;
        }

        throw this.enhanceError(error as Error);
      }
    }

    throw this.enhanceError(lastError!);
  }

  public getModelName(): string {
    return this.config.model;
  }

  public getModelVersion(): string {
    const versionMatch = this.config.model.match(/\d+(\.\d+)*/);
    return versionMatch ? versionMatch[0] : "unknown";
  }

  private async executeCompletion(prompt: string): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      return await this.call(prompt, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async call(
    prompt: string,
    signal: AbortSignal
  ): Promise<LLMResponse> {
    const response = await generateText({
      model: openrouter(this.config.model),
      prompt,
      abortSignal: signal,
    });

    return {
      text: response.text,
      model: this.config.model,
      usage: {
        prompt_tokens: response.usage.promptTokens,
        completion_tokens: response.usage.completionTokens,
        total_tokens:
          response.usage.promptTokens + response.usage.completionTokens,
      },
      metadata: {
        stop_reason: response.finishReason,
      },
    };
  }

  private getDefaultModel(): string {
    return "anthropic/claude-3.5-sonnet:beta";
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false;

    // Retry on rate limits, timeouts, and temporary server errors
    if (error.name === "AbortError") return true;
    if (error.message.includes("rate limit")) return true;
    if (error.message.includes("timeout")) return true;
    if (error.message.includes("5")) return true; // 5xx errors

    return false;
  }

  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.config.maxDelay);
  }

  private enhanceError(error: Error): Error {
    const enhancedError = new Error(
      `LLM Error (${this.config.model}): ${error.message}`
    );
    enhancedError.cause = error;
    return enhancedError;
  }

  async analyze(
    prompt: string,
    options: AnalysisOptions = {}
  ): Promise<string | StructuredAnalysis> {
    const {
      temperature = this.config.temperature,
      maxTokens = this.config.maxTokens,
      formatResponse = false,
    } = options;

    const response = await generateText({
      model: openrouter(this.config.model),
      temperature,
      messages: [
        {
          role: "system",
          content: "\n\nProvide response in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens,
    });

    // Emit token usage metrics
    this.emit("trace:tokens", {
      input: response?.usage.promptTokens,
      output: response?.usage.completionTokens,
    });

    const result = response?.text;

    if (formatResponse && result) {
      try {
        return JSON.parse(result) as StructuredAnalysis;
      } catch (e) {
        console.warn("Failed to parse structured response, returning raw text");
        return result;
      }
    }

    return result;
  }
}

// Error types
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(provider: string, timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms`, provider);
    this.name = "LLMTimeoutError";
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
      provider
    );
    this.name = "LLMRateLimitError";
  }
}
