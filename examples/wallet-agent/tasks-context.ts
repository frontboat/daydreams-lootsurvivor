import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { randomUUID } from "crypto";

// Define conditional task structure
export interface ConditionalTask {
  id: string;
  name: string;
  description: string;
  condition: TaskCondition;
  action: TaskAction;
  isEnabled: boolean;
  createdAt: number;
  lastChecked?: number;
  executionCount: number;
  maxExecutions?: number; // Optional limit
}

export interface TaskCondition {
  type: "price_above" | "price_below" | "price_change" | "time_based" | "portfolio_value";
  token?: string; // For price conditions
  value: number;
  timeframe?: string; // For time-based conditions
}

export interface TaskAction {
  type: "trade" | "alert" | "rebalance" | "transfer";
  parameters: Record<string, any>;
}

// Define what our tasks context stores
export interface TasksMemory {
  tasks: ConditionalTask[];
  executionHistory: Array<{
    taskId: string;
    executedAt: number;
    result: any;
    success: boolean;
  }>;
  lastCheckTime: number;
}

// Mock price data (same as accounts context - in real app would be shared service)
const MOCK_PRICES: Record<string, number> = {
  ETH: 3200,
  BTC: 67000,
  USDC: 1,
  USDT: 1,
  MATIC: 0.85,
  LINK: 12.5,
};

export const tasksContext = context({
  type: "tasks",
  schema: z.object({
    userId: z.string().describe("User ID for task management"),
  }),
  create: (): TasksMemory => ({
    tasks: [],
    executionHistory: [],
    lastCheckTime: Date.now(),
  }),
  render: (state) => {
    const { tasks, executionHistory } = state.memory;
    const activeTasks = tasks.filter(task => task.isEnabled);
    const recentExecutions = executionHistory.slice(-5);
    
    return `
🤖 Conditional Tasks for User: ${state.args.userId}
📝 Total Tasks: ${tasks.length}
✅ Active Tasks: ${activeTasks.length}
⏰ Last Check: ${new Date(state.memory.lastCheckTime).toLocaleTimeString()}

Active Tasks:
${activeTasks
  .map((task) => `🔹 ${task.name} | ${task.condition.type} ${task.condition.value} | Runs: ${task.executionCount}`)
  .join("\n") || "No active tasks"}

Recent Executions:
${recentExecutions
  .map((exec) => `${exec.success ? "✅" : "❌"} ${new Date(exec.executedAt).toLocaleTimeString()}`)
  .join("\n") || "No recent executions"}
    `.trim();
  },
}).setActions([
  action({
    name: "create-task",
    description: "Create a conditional task that executes when conditions are met",
    schema: z.object({
      name: z.string().describe("Name for the task"),
      description: z.string().describe("Description of what the task does"),
      conditionType: z.enum(["price_above", "price_below", "price_change", "portfolio_value"])
        .describe("Type of condition to monitor"),
      token: z.string().optional().describe("Token to monitor (for price conditions)"),
      value: z.number().describe("Threshold value for the condition"),
      actionType: z.enum(["trade", "alert", "rebalance", "transfer"])
        .describe("Action to execute when condition is met"),
      actionParameters: z.record(z.string(), z.any())
        .describe("Parameters for the action"),
      maxExecutions: z.number().optional().describe("Maximum number of times to execute (optional)"),
    }),
    handler: async ({ 
      name, 
      description, 
      conditionType, 
      token, 
      value, 
      actionType, 
      actionParameters,
      maxExecutions 
    }, ctx) => {
      const newTask: ConditionalTask = {
        id: randomUUID(),
        name,
        description,
        condition: {
          type: conditionType,
          token,
          value,
        },
        action: {
          type: actionType,
          parameters: actionParameters,
        },
        isEnabled: true,
        createdAt: Date.now(),
        executionCount: 0,
        maxExecutions,
      };

      ctx.memory.tasks.push(newTask);

      return {
        success: true,
        task: newTask,
        message: `Created task "${name}" - will ${actionType} when ${token || "portfolio"} ${conditionType.replace("_", " ")} ${value}`,
      };
    },
  }),

  action({
    name: "list-tasks",
    description: "List all conditional tasks",
    schema: z.object({
      showDisabled: z.boolean().optional().describe("Include disabled tasks"),
    }),
    handler: async ({ showDisabled = false }, ctx) => {
      const tasks = showDisabled 
        ? ctx.memory.tasks 
        : ctx.memory.tasks.filter(task => task.isEnabled);

      return {
        tasks,
        totalTasks: ctx.memory.tasks.length,
        activeTasks: ctx.memory.tasks.filter(t => t.isEnabled).length,
        executionHistory: ctx.memory.executionHistory.slice(-10),
      };
    },
  }),

  action({
    name: "toggle-task",
    description: "Enable or disable a task",
    schema: z.object({
      taskId: z.string().describe("Task ID to toggle"),
      enabled: z.boolean().optional().describe("Enable (true) or disable (false). If not specified, will toggle current state"),
    }),
    handler: async ({ taskId, enabled }, ctx) => {
      const task = ctx.memory.tasks.find(t => t.id === taskId);
      
      if (!task) {
        return {
          success: false,
          message: "Task not found",
        };
      }

      const newState = enabled !== undefined ? enabled : !task.isEnabled;
      task.isEnabled = newState;

      return {
        success: true,
        task: task.name,
        enabled: newState,
        message: `Task "${task.name}" ${newState ? "enabled" : "disabled"}`,
      };
    },
  }),

  action({
    name: "delete-task",
    description: "Delete a conditional task",
    schema: z.object({
      taskId: z.string().describe("Task ID to delete"),
    }),
    handler: async ({ taskId }, ctx) => {
      const taskIndex = ctx.memory.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          message: "Task not found",
        };
      }

      const deletedTask = ctx.memory.tasks.splice(taskIndex, 1)[0];

      return {
        success: true,
        deletedTask: deletedTask.name,
        message: `Deleted task "${deletedTask.name}"`,
      };
    },
  }),

  action({
    name: "check-tasks",
    description: "Manually check all tasks and execute those with met conditions",
    schema: z.object({}),
    handler: async (_, ctx) => {
      const activeTasks = ctx.memory.tasks.filter(task => task.isEnabled);
      const executedTasks: string[] = [];
      const checkedTasks: string[] = [];

      for (const task of activeTasks) {
        checkedTasks.push(task.name);
        
        // Check if task has reached max executions
        if (task.maxExecutions && task.executionCount >= task.maxExecutions) {
          continue;
        }

        const conditionMet = await checkTaskCondition(task.condition);
        
        if (conditionMet) {
          // Execute the task
          const executionResult = await executeTaskAction(task.action, task.id);
          
          // Record execution
          ctx.memory.executionHistory.push({
            taskId: task.id,
            executedAt: Date.now(),
            result: executionResult,
            success: executionResult.success,
          });

          task.executionCount++;
          task.lastChecked = Date.now();
          executedTasks.push(task.name);

          // Disable task if max executions reached
          if (task.maxExecutions && task.executionCount >= task.maxExecutions) {
            task.isEnabled = false;
          }
        }
      }

      ctx.memory.lastCheckTime = Date.now();

      return {
        checkedTasks,
        executedTasks,
        totalExecuted: executedTasks.length,
        nextCheck: "Tasks will be checked again in 1 hour",
        message: `Checked ${checkedTasks.length} tasks, executed ${executedTasks.length}`,
      };
    },
  }),

  action({
    name: "get-task-details",
    description: "Get detailed information about a specific task",
    schema: z.object({
      taskId: z.string().describe("Task ID to get details for"),
    }),
    handler: async ({ taskId }, ctx) => {
      const task = ctx.memory.tasks.find(t => t.id === taskId);
      
      if (!task) {
        return {
          success: false,
          message: "Task not found",
        };
      }

      const taskExecutions = ctx.memory.executionHistory.filter(exec => exec.taskId === taskId);
      const lastExecution = taskExecutions[taskExecutions.length - 1];

      return {
        success: true,
        task,
        executionHistory: taskExecutions,
        lastExecution,
        totalExecutions: taskExecutions.length,
        currentStatus: await checkTaskCondition(task.condition) ? "Condition Met" : "Waiting",
      };
    },
  }),
]);

// Helper function to check if a task condition is met
async function checkTaskCondition(condition: TaskCondition): Promise<boolean> {
  const currentPrice = condition.token ? MOCK_PRICES[condition.token] : 0;
  
  switch (condition.type) {
    case "price_above":
      return currentPrice > condition.value;
    case "price_below":
      return currentPrice < condition.value;
    case "price_change":
      // Mock implementation - in real app would compare to historical prices
      return Math.abs(currentPrice - condition.value) / condition.value > 0.05; // 5% change
    case "portfolio_value":
      // Mock implementation - would get actual portfolio value
      return 10000 > condition.value; // Mock portfolio value
    default:
      return false;
  }
}

// Helper function to execute a task action
async function executeTaskAction(action: TaskAction, taskId: string): Promise<any> {
  // Mock implementation - in real app would execute actual trades/transfers
  switch (action.type) {
    case "trade":
      return {
        success: true,
        type: "trade",
        details: action.parameters,
        message: `Executed trade: ${JSON.stringify(action.parameters)}`,
        mockExecution: true,
      };
    case "alert":
      return {
        success: true,
        type: "alert",
        message: action.parameters.message || "Condition met!",
        sentTo: action.parameters.channels || ["default"],
      };
    case "rebalance":
      return {
        success: true,
        type: "rebalance",
        message: "Portfolio rebalanced according to target allocation",
        mockExecution: true,
      };
    case "transfer":
      return {
        success: true,
        type: "transfer",
        details: action.parameters,
        message: `Transferred ${action.parameters.amount} ${action.parameters.token} to ${action.parameters.destination}`,
        mockExecution: true,
      };
    default:
      return {
        success: false,
        error: "Unknown action type",
      };
  }
}