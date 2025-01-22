import { Logger } from "./logger";
import { RoomManager } from "./room-manager";
import type { VectorDB } from "./vector-db";
import { LogLevel } from "../types";
import type { Processor } from "./processor";
import type { z } from "zod";

/**
 * Interface for defining input handlers that can be registered with the Core system.
 * @template T The type of data returned by the input handler
 */
export interface Input<T = unknown> {
  /** Unique identifier for this input */
  name: string;
  /** Handler function that processes the input and returns a Promise of type T */
  handler: (...args: unknown[]) => Promise<T>;
  /** Zod schema for validating the response */
  response: z.ZodType<T>;

  /**
   * Optional interval in milliseconds for recurring inputs.
   * If set, the input will run repeatedly at this interval.
   * @example
   * ```ts
   * // Run every minute
   * interval: 60000
   * ```
   */
  interval?: number;

  /**
   * Optional timestamp for when this input should next run.
   * If omitted, defaults to immediate execution (Date.now()).
   */
  nextRun?: number;
}

/**
 * Interface for defining output handlers that can be registered with the Core system.
 * @template T The type of data the output handler accepts
 */
export interface Output<T = unknown> {
  /** Unique identifier for this output */
  name: string;
  /** Handler function that processes the output data */
  handler: (data: T) => Promise<unknown>;
  /** Zod schema for validating the input data */
  schema: z.ZodType<T>;
}

/**
 * Configuration options for the Core system
 */
export interface CoreConfig {
  /** Logging configuration */
  logging?: {
    /** Log level to use */
    level: LogLevel;
    /** Whether to enable colored output */
    enableColors?: boolean;
    /** Whether to include timestamps in logs */
    enableTimestamp?: boolean;
  };
}

/**
 * Priority queue implementation for scheduling tasks.
 * Tasks are ordered by their nextRun timestamp.
 * @template T Type must include a nextRun timestamp property
 */
class TaskScheduler<T extends { nextRun: number }> {
  private tasks: T[] = [];
  private timerId?: NodeJS.Timeout;

  /**
   * @param onTaskDue Callback executed when a task is due to run
   */
  constructor(private readonly onTaskDue: (task: T) => Promise<void>) {}

  /**
   * Schedules a new task or updates an existing one.
   * Tasks are automatically sorted by nextRun timestamp.
   * @param task The task to schedule
   */
  public scheduleTask(task: T): void {
    this.tasks = this.tasks.filter((t) => t !== task);
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.nextRun - b.nextRun);
    this.start();
  }

  /**
   * Starts or restarts the scheduler timer for the next due task.
   * @private
   */
  private start() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
    if (this.tasks.length === 0) return;

    const now = Date.now();
    const earliestTask = this.tasks[0];
    const delay = Math.max(0, earliestTask.nextRun - now);

    this.timerId = setTimeout(async () => {
      this.timerId = undefined;
      const task = this.tasks.shift();
      if (!task) return;

      await this.onTaskDue(task);

      if (this.tasks.length) {
        this.start();
      }
    }, delay) as unknown as NodeJS.Timeout;
  }

  /**
   * Stops the scheduler and clears all pending tasks.
   */
  public stop() {
    if (this.timerId) clearTimeout(this.timerId);
    this.tasks = [];
  }
}

/**
 * Core system that manages inputs, outputs, and processing.
 * Coordinates between input sources, the processor, and output handlers.
 */
export class Core {
  private readonly inputs = new Map<string, Input & { nextRun: number }>();
  private readonly outputs = new Map<string, Output>();
  private readonly logger: Logger;
  private readonly processor: Processor;
  public readonly vectorDb: VectorDB;

  private readonly inputScheduler: TaskScheduler<Input & { nextRun: number }>;

  /**
   * Creates a new Core instance.
   * @param roomManager - Manager for handling rooms/spaces
   * @param vectorDb - Vector database for storing embeddings
   * @param processor - Processor for handling content
   * @param config - Optional configuration options
   */
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

    this.inputScheduler = new TaskScheduler(async (task) => {
      await this.handleInput(task);
    });
  }

  /**
   * Registers a new input handler with the system.
   * If the input is recurring (has an interval), it will be scheduled to run repeatedly.
   * @param input The input configuration to register
   */
  public registerInput(input: Input): void {
    const now = Date.now();
    const nextRun = input.nextRun ?? now;

    const scheduledInput = { ...input, nextRun };
    this.inputs.set(input.name, scheduledInput);
    this.inputScheduler.scheduleTask(scheduledInput);

    this.logger.info("Core.registerInput", "Registered input", {
      name: input.name,
      nextRun,
      interval: input.interval,
    });
  }

  /**
   * Removes a registered input handler.
   * @param name Name of the input to remove
   */
  public removeInput(name: string): void {
    const input = this.inputs.get(name);
    if (input) {
      this.inputs.delete(name);
      this.logger.info("Core.removeInput", `Removed input: ${name}`);
    }
  }

  /**
   * Registers a new output handler with the system.
   * @param output The output configuration to register
   */
  public registerOutput(output: Output): void {
    this.logger.info("Core.registerOutput", "Registering output", {
      name: output.name,
    });
    this.outputs.set(output.name, output);
    this.processor.registerAvailableOutput(output);
  }

  /**
   * Removes a registered output handler.
   * @param name Name of the output to remove
   */
  public removeOutput(name: string): void {
    if (this.outputs.has(name)) {
      this.outputs.delete(name);
      this.logger.info("Core.removeOutput", `Removing output: ${name}`);
    }
  }

  /**
   * Handles execution of an input when it's scheduled to run.
   * @param input The input to handle
   * @private
   */
  private async handleInput(input: Input & { nextRun: number }): Promise<void> {
    const { name, interval } = input;

    try {
      const result = await input.handler();
      if (!result) return;

      if (interval && interval > 0) {
        input.nextRun = Date.now() + interval;
        this.inputScheduler.scheduleTask(input);
      } else {
        this.inputs.delete(name);
      }

      const room = await this.roomManager.ensureRoom(name, "core");
      const items = Array.isArray(result) ? result : [result];

      for (const item of items) {
        const processed = await this.processor.process(item, room);
        if (!processed.alreadyProcessed) {
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
   * Executes a registered output handler with the provided data.
   * @param name Name of the output to execute
   * @param data Data to pass to the output handler
   * @returns The result of the output handler
   * @template T The type of data the output handler accepts
   */
  public async executeOutput<T>(name: string, data: T): Promise<T> {
    const output = this.outputs.get(name);
    if (!output) {
      throw new Error(`No output registered with name: ${name}`);
    }
    this.logger.debug("Core.executeOutput", "Executing output", { name, data });

    try {
      return data;
    } catch (error) {
      return error as T;
    }
  }

  /**
   * Stops all scheduled tasks and shuts down the Core system.
   */
  public stop(): void {
    this.inputScheduler.stop();
    this.logger.info("Core.stop", "All scheduled inputs stopped.");
  }
}
