import Ajv, { type ValidateFunction } from "ajv";
import type { JSONSchemaType } from "ajv";

import { Logger } from "./logger";
import { Room } from "./room";
import { RoomManager } from "./room-manager";
import type { VectorDB } from "./vector-db";
import { LogLevel } from "../types";
import type { Processor, SuggestedOutput } from "./processor";

/**
 * Defines a scheduled or one-time task to be processed as 'input'.
 */
export interface Input<T = unknown> {
  name: string;
  handler: (...args: unknown[]) => Promise<T>;
  response: T;
  interval?: number;
}

/**
 * Defines an action ('output') that sends data somewhere, e.g. HTTP or other side effects.
 */
export interface Output<T = unknown> {
  name: string;
  handler: (data: T) => Promise<unknown>;
  response: T;
  schema: JSONSchemaType<T>;
}

export interface CoreConfig {
  logging?: {
    level: LogLevel;
    enableColors?: boolean;
    enableTimestamp?: boolean;
  };
}

export class Core {
  private readonly inputs = new Map<string, Input & { lastRun?: number }>();
  private readonly outputs = new Map<string, Output>();
  private readonly logger: Logger;
  private readonly processor: Processor;
  public readonly vectorDb: VectorDB;

  private ajv: Ajv;
  private validatorCache = new Map<string, ValidateFunction>();
  private inputProcessingIntervalId?: NodeJS.Timeout;

  constructor(
    private readonly roomManager: RoomManager,
    vectorDb: VectorDB,
    processor: Processor,
    config?: CoreConfig
  ) {
    this.vectorDb = vectorDb;
    this.processor = processor;
    this.logger = new Logger(
      config?.logging ?? {
        level: LogLevel.ERROR,
        enableColors: true,
        enableTimestamp: true,
      }
    );
    this.ajv = new Ajv();

    // Start the input processing on an interval (every 1 second by default).
    this.startProcessingInputs(1000);
  }

  /**
   * Registers a new input source.
   */
  public registerInput(input: Input): void {
    this.logger.info("Core.registerInput", "Registering input", {
      name: input.name,
    });
    this.inputs.set(input.name, input);
  }

  /**
   * Registers a new output destination.
   */
  public registerOutput(output: Output): void {
    this.logger.info("Core.registerOutput", "Registering output", {
      name: output.name,
    });
    this.outputs.set(output.name, output);

    // Optionally, register the output as "available" to the Processor
    this.processor.registerAvailableOutput(output);
  }

  /**
   * Removes an existing input.
   */
  public removeInput(name: string): void {
    if (this.inputs.has(name)) {
      this.logger.info("Core.removeInput", `Removing input: ${name}`);
      this.inputs.delete(name);
    }
  }

  /**
   * Removes an existing output.
   */
  public removeOutput(name: string): void {
    if (this.outputs.has(name)) {
      this.logger.info("Core.removeOutput", `Removing output: ${name}`);
      this.outputs.delete(name);
    }
  }

  /**
   * Starts periodically processing all registered inputs.
   */
  private startProcessingInputs(pollIntervalMs: number): void {
    if (this.inputProcessingIntervalId) {
      clearInterval(this.inputProcessingIntervalId);
    }

    this.inputProcessingIntervalId = setInterval(() => {
      const tasks = [...this.inputs.entries()].map(([name, input]) =>
        this.handleInput(name, input)
      );
      // We don't await here to avoid blocking if tasks take a long time.
      Promise.all(tasks).catch((err) => {
        this.logger.error(
          "Core.startProcessingInputs",
          "Error in concurrent input processing",
          err
        );
      });
    }, pollIntervalMs) as unknown as NodeJS.Timeout;
  }

  /**
   * Stop the periodic input processing (if running).
   */
  public stopProcessing(): void {
    if (this.inputProcessingIntervalId) {
      clearInterval(this.inputProcessingIntervalId);
      this.inputProcessingIntervalId = undefined;
    }
  }

  /**
   * Processes a single input, if its interval has elapsed.
   */
  private async handleInput(
    name: string,
    input: Input & { lastRun?: number }
  ): Promise<void> {
    const now = Date.now();

    if (
      input.interval &&
      input.lastRun &&
      now - input.lastRun < input.interval
    ) {
      return;
    }

    try {
      this.logger.debug("Core.handleInput", "Processing input", { name });
      const result = await input.handler();

      // Update last run
      input.lastRun = now;
      this.inputs.set(name, input);

      if (result) {
        const room = await this.roomManager.ensureRoom(name, "core");
        const processed = await this.processor.process(result, room);

        // Only proceed if content hasn't been processed before
        if (!processed.alreadyProcessed) {
          // Store input result in memory
          await this.roomManager.addMemory(
            room.id,
            JSON.stringify(processed.content),
            {
              source: name,
              type: "input",
              ...processed.metadata,
              ...processed.enrichedContext,
            }
          );

          // Handle any suggested outputs
          await this.handleSuggestedOutputs(processed.suggestedOutputs);
        }
      }
    } catch (error) {
      this.logger.error("Core.handleInput", "Error processing input", {
        name,
        error,
      });
    }
  }

  /**
   * Executes all suggested outputs if their confidence meets the threshold.
   */
  private async handleSuggestedOutputs(
    suggestedOutputs: SuggestedOutput<any>[]
  ): Promise<void> {
    for (const suggestion of suggestedOutputs) {
      if (suggestion.confidence >= 0.7) {
        try {
          this.logger.info(
            "Core.handleSuggestedOutputs",
            "Executing suggested output",
            {
              name: suggestion.name,
              confidence: suggestion.confidence,
              reasoning: suggestion.reasoning,
            }
          );
          const result = await this.executeOutput(
            suggestion.name,
            suggestion.data
          );

          await this.handleFeedback(suggestion.name, {
            type: "output",
            notes:
              "IMPORTANT: This is the result of the output, you should only return more actions if you think the output was not accepted. Do not return more actions if the output was accepted or successful.",
            output: suggestion,
            result,
          });
        } catch (error) {
          this.logger.error(
            "Core.handleSuggestedOutputs",
            "Error executing suggested output",
            {
              error,
            }
          );
        }
      }
    }
  }

  /**
   * Executes a named output with the provided data (after schema validation).
   */
  public async executeOutput<T>(name: string, data: T): Promise<T> {
    const output = this.outputs.get(name);
    if (!output) {
      throw new Error(`No output registered with name: ${name}`);
    }

    // Validate against the output's schema
    const validateFn = this.getValidatorForSchema(name, output.schema);
    if (!validateFn(data)) {
      this.logger.error("Core.executeOutput", "Schema validation failed", {
        name,
        data,
        errors: validateFn.errors,
        schema: output.schema,
      });
      throw new Error(
        `Invalid data for output ${name}: ${JSON.stringify(validateFn.errors)}`
      );
    }

    this.logger.debug("Core.executeOutput", "Executing output", {
      name,
      data,
      schema: output.schema,
    });

    try {
      const result = await output.handler(data);

      // Store output result in memory
      const room = await this.roomManager.ensureRoom(name, "core");
      const processed = await this.processor.process(result, room);

      await this.roomManager.addMemory(
        room.id,
        JSON.stringify(processed.content),
        {
          source: name,
          type: "output",
          ...processed.metadata,
          ...processed.enrichedContext,
        }
      );

      return result as T;
    } catch (error) {
      this.logger.error("Core.executeOutput", "Error executing output", {
        name,
        data,
        error: error instanceof Error ? error.message : error,
      });
      return error as T;
    }
  }

  /**
   * Feeds the result of an output *back* into the agent's context.
   * This method is key to creating an agent "feedback loop,"
   * where output results can trigger new decisions.
   */
  private async handleFeedback<T>(
    outputName: string,
    outputResult: T
  ): Promise<void> {
    try {
      this.logger.debug(
        "Core.handleFeedback",
        "Handling output feedback as new input",
        {
          outputName,
          outputResult,
        }
      );

      const feedbackRoom = await this.roomManager.ensureRoom(
        `feedback_blackboard`,
        "core"
      );

      const processedFeedback = await this.processor.process(
        JSON.stringify(outputResult),
        feedbackRoom
      );

      // Only continue with suggested outputs if the previous output wasn't successful
      if (!processedFeedback.isOutputSuccess) {
        await this.handleSuggestedOutputs(processedFeedback.suggestedOutputs);
      } else {
        this.logger.debug(
          "Core.handleFeedback",
          "Output was successful, stopping feedback loop",
          { outputName }
        );
      }
    } catch (error) {
      this.logger.error("Core.handleFeedback", "Error handling feedback loop", {
        outputName,
        error,
      });
    }
  }

  /**
   * Returns a memoized validator for the given schema.
   * Avoids recompiling schemas repeatedly for the same output.
   */
  private getValidatorForSchema(
    outputName: string,
    schema: JSONSchemaType<unknown>
  ): ValidateFunction {
    if (!this.validatorCache.has(outputName)) {
      const validate = this.ajv.compile(schema);
      this.validatorCache.set(outputName, validate);
    }
    return this.validatorCache.get(outputName)!;
  }
}
