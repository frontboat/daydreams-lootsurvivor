import { action, context } from "@daydreamsai/core";
import { z } from "zod";

export type PlannerTask = {
  id: number;
  task: string;
  completed: boolean;
  active: boolean;
};

export type PlannerMemory = {
  plan: string | null;
  tasks: PlannerTask[];
  finalized?: boolean;
};

export const planner = context({
  type: "planner",
  schema: {
    id: z.string(),
  },
  key: ({ id }) => id,
  description: "",
  instructions: `\
Use planner when u need to create a plan to complete the task in hand.
You should separate the task into small tasks.
You should then try to complete all the tasks until the plan is complete.
You can keep adding, removing tasks to allow to manage the plan.
If you start a plan you must activate a task and start completing the task.
Only work on the active tasks, if u need update the state.
`,
  events: {
    "plan:initialized": {},
    "plan:finalized": {},
    "task:created": {
      id: z.number(),
    },
    "task:updated": {
      id: z.number(),
    },
    "task:removed": {
      id: z.number(),
    },
  },
  create(): PlannerMemory {
    return {
      plan: null,
      tasks: [],
    };
  },
  // shouldContinue({ memory }) {
  //   return memory.plan ? memory.finalized === false : false;
  // },
}).setActions([
  action({
    name: "planner.initialize",
    schema: {
      plan: z.string(),
      tasks: z.array(z.string()),
    },
    enabled: ({ memory }) => memory.plan === null || memory.finalized === true,
    handler: ({ plan, tasks }, { memory, emit }) => {
      memory.plan = plan;
      memory.tasks = tasks.map((task, id) => ({
        id,
        task,
        active: false,
        completed: false,
      }));
      memory.finalized = false;

      emit("plan:initialized", {});
      return "Success";
    },
  }),
  action({
    name: "planner.finalize",
    schema: undefined,
    enabled: ({ memory }) => (memory.plan ? memory.finalized !== true : false),
    handler: ({ memory, emit }) => {
      memory.tasks = memory.tasks.map((task) => ({
        ...task,
        completed: true,
      }));

      memory.finalized = true;

      emit("plan:finalized", {});
      return "Success";
    },
  }),
  action({
    name: "planner.createTask",
    schema: { id: z.number(), task: z.string() },
    enabled: ({ memory }) => memory.plan !== null,
    handler: ({ id, task }, { memory, emit }) => {
      memory.tasks.push({ id, task, completed: false, active: false });
      emit("task:created", { id });
      return "Success";
    },
  }),
  action({
    name: "planner.updateTask",
    schema: {
      id: z.number(),
      task: z.string().optional(),
      active: z.boolean().optional(),
      completed: z.boolean().optional(),
    },
    enabled: ({ memory }) => memory.plan !== null,
    handler: (params, { memory, emit }) => {
      const task = memory.tasks.find((task) => task.id === params.id);
      if (!task) {
        return "Task not found";
      }
      task.task = params.task ?? task.task;
      task.active = params.active ?? task.active;
      task.completed = params.completed ?? task.completed;
      emit("task:updated", { id: params.id });
      return "Success";
    },
  }),
  action({
    name: "planner.removeTask",
    schema: {
      id: z.number(),
    },
    enabled: ({ memory }) => memory.plan !== null,
    handler: (params, { memory, emit }) => {
      const taskIndex = memory.tasks.findIndex((task) => task.id === params.id);
      if (taskIndex === -1) {
        return "Task not found";
      }
      memory.tasks.splice(taskIndex, 1);
      emit("task:removed", { id: params.id });
      return "Success";
    },
  }),
]);
