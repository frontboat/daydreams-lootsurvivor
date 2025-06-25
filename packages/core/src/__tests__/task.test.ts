import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskRunner, task } from "../task";
import { delay, ExecutionTracker } from "../__tests__/utils";

describe("TaskRunner", () => {
  let runner: TaskRunner;

  beforeEach(() => {
    runner = new TaskRunner(2); // Create runner with concurrency of 2
  });

  it("should execute tasks with proper concurrency", async () => {
    const tracker = new ExecutionTracker();

    // Create tasks with different durations
    const shortTask = task({
      key: "short-task",
      handler: async () => {
        tracker.track(1);
        await delay(50);
        tracker.complete(1);
        return "short";
      },
    });

    const mediumTask = task({
      key: "medium-task",
      handler: async () => {
        tracker.track(2);
        await delay(100);
        tracker.complete(2);
        return "medium";
      },
    });

    const longTask = task({
      key: "long-task",
      handler: async () => {
        tracker.track(3);
        await delay(150);
        tracker.complete(3);
        return "long";
      },
    });

    // Enqueue all tasks
    const results = await Promise.all([
      runner.enqueueTask(longTask, {}),
      runner.enqueueTask(shortTask, {}),
      runner.enqueueTask(mediumTask, {}),
    ]);

    expect(results).toEqual(["long", "short", "medium"]);
    expect(tracker.maxConcurrency).toBeLessThanOrEqual(2);
  });

  it("should respect priority ordering", async () => {
    const executionOrder: number[] = [];

    const lowPriorityTask = task({
      key: "low",
      handler: async () => {
        await delay(20);
        executionOrder.push(1);
        return 1;
      },
      priority: 1,
    });

    const mediumPriorityTask = task({
      key: "medium",
      handler: async () => {
        await delay(20);
        executionOrder.push(2);
        return 2;
      },
      priority: 2,
    });

    const highPriorityTask = task({
      key: "high",
      handler: async () => {
        await delay(20);
        executionOrder.push(3);
        return 3;
      },
      priority: 3,
    });

    // Enqueue in non-priority order
    const results = await Promise.all([
      runner.enqueueTask(lowPriorityTask, {}),
      runner.enqueueTask(highPriorityTask, {}),
      runner.enqueueTask(mediumPriorityTask, {}),
    ]);

    expect(executionOrder).toEqual([3, 2, 1]); // Highest priority first
    expect(results).toEqual([1, 3, 2]); // Results match original order
  });

  it("should handle errors properly", async () => {
    const errorTask = task({
      key: "error-task",
      handler: async () => {
        throw new Error("Task failed");
      },
    });

    await expect(runner.enqueueTask(errorTask, {})).rejects.toThrow(
      "Task failed"
    );
  });

  it("should maintain concurrency limit", async () => {
    const tracker = new ExecutionTracker();
    const tasks = [];

    // Create 5 tasks that track concurrency
    for (let i = 0; i < 5; i++) {
      const taskDef = task({
        key: `task-${i}`,
        handler: async () => {
          tracker.track(i);
          await delay(50);
          tracker.complete(i);
          return i;
        },
      });

      tasks.push(runner.enqueueTask(taskDef, {}));
    }

    await Promise.all(tasks);

    expect(tracker.maxConcurrency).toBe(2); // Should never exceed concurrency limit
    expect(tracker.completedCount).toBe(5); // All tasks should complete
  });

  it("should handle task options correctly", async () => {
    const debugFn = vi.fn();

    const testTask = task({
      key: "test-task",
      handler: async (params: { value: number }) => {
        debugFn("executed", params);
        return params.value * 2;
      },
      priority: 2,
    });

    const result = await runner.enqueueTask(testTask, { value: 5 });

    expect(result).toBe(10);
    expect(debugFn).toHaveBeenCalledWith("executed", { value: 5 });
  });

  it("should handle retry logic", async () => {
    let attempts = 0;

    const retryTask = task({
      key: "retry-task",
      handler: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "success";
      },
      retry: 3,
    });

    const result = await runner.enqueueTask(retryTask, {});

    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("should handle custom queue", async () => {
    runner.setQueue("custom", 1); // Different concurrency for custom queue

    const tracker = new ExecutionTracker();
    const customTasks = [];

    // Create tasks for custom queue
    for (let i = 0; i < 3; i++) {
      const taskDef = task({
        key: `custom-task-${i}`,
        handler: async () => {
          tracker.track(i);
          await delay(50);
          tracker.complete(i);
          return i;
        },
        queueKey: "custom",
      });

      customTasks.push(runner.enqueueTask(taskDef, {}, { queueKey: "custom" }));
    }

    await Promise.all(customTasks);

    expect(tracker.maxConcurrency).toBe(1); // Custom queue concurrency
  });
});

describe("task function", () => {
  it("should create a task definition", () => {
    const testTask = task({
      key: "test-task",
      handler: async (params: { value: number }) => {
        return params.value * 2;
      },
      priority: 1,
    });

    expect(testTask).toMatchObject({
      key: "test-task",
      handler: expect.any(Function),
      priority: 1,
    });
  });

  it("should work with TaskRunner", async () => {
    const runner = new TaskRunner(1);

    const testTask = task({
      key: "integration-test",
      handler: async (params: { message: string }) => {
        return `Hello, ${params.message}!`;
      },
    });

    const result = await runner.enqueueTask(testTask, { message: "World" });
    expect(result).toBe("Hello, World!");
  });
});
