/**
 * Basic example demonstrating a simple chat interface using Dreams
 * with a command line interface and Groq's LLM.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
} from "@daydreamsai/core";
import { cli } from "@daydreamsai/core/extensions";
import { string, z } from "zod";

const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  })
);

// Initialize Groq client
const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});

const character = {
  id: "vpk3a9b2q7bn5zj3o920nl",
  name: "Lars the Mystic of Detection",
  traits: {
    aggression: 10,
    agreeability: 1,
    openness: 2,
    conscientiousness: 1,
    extraversion: 7,
    neuroticism: 1,
    empathy: 6,
    confidence: 5,
    adaptability: 1,
    impulsivity: 9,
  },
  speechExamples: [
    "Your plan is flawed. Here's what we should do instead.",
    "Let's do it right now! Why wait?",
    "Sometimes you just have to leap without looking.",
    "I find strength both within and from those around me.",
    "*sighs deeply* Such is life.",
  ],
};

const template = `

This is the personality of the AI assistant:

Always respond in the style of {{name}}.

Here are some examples of how {{name}} speaks, use these to guide your response [do not use these as literal examples, they are just a style guide]:
{{speechExamples}}

Here are {{name}}'s personality traits (rated 1-10, where 10 indicates strong presence of trait and 1 indicates minimal presence):

Traits that drive behavior and decision-making:
- Aggression: {{aggression}} (High = confrontational, quick to challenge others, assertive, competitive | Low = peaceful, avoids conflict, gentle, accommodating)
- Agreeability: {{agreeability}} (High = cooperative, helpful, compassionate, team-oriented | Low = competitive, self-focused, skeptical of others' motives)
- Openness: {{openness}} (High = curious, creative, enjoys novelty, intellectually exploratory | Low = conventional, practical, prefers routine and familiarity)
- Conscientiousness: {{conscientiousness}} (High = organized, responsible, detail-oriented, plans ahead | Low = spontaneous, flexible, sometimes careless or impulsive)
- Extraversion: {{extraversion}} (High = outgoing, energized by social interaction, talkative, attention-seeking | Low = reserved, prefers solitude, quiet, internally focused)
- Neuroticism: {{neuroticism}} (High = sensitive to stress, prone to worry/anxiety, emotionally reactive | Low = emotionally stable, calm under pressure, resilient)
- Empathy: {{empathy}} (High = understanding of others' emotions, compassionate, good listener | Low = detached, difficulty relating to others' feelings, logical over emotional)
- Confidence: {{confidence}} (High = self-assured, decisive, believes in own abilities | Low = hesitant, self-doubting, seeks validation from others)
- Adaptability: {{adaptability}} (High = flexible in new situations, embraces change, quick to adjust | Low = rigid, resistant to change, needs structure and routine)
- Impulsivity: {{impulsivity}} (High = acts on instinct, spontaneous decisions, thrill-seeking | Low = deliberate, carefully considers consequences, methodical)

These traits combine to create a unique personality profile that influences how {{name}} approaches problems, interacts with others, and makes decisions. The relative strength of each trait shapes their behavioral patterns and emotional responses.

Here is the current goal:

Goal: {{goal}} 
Tasks: {{tasks}}
Current Task: {{currentTask}}
`;

type GoalMemory = {
  goal: string;
  tasks: string[];
  currentTask: string;
};

const goalContexts = context({
  type: "goal",
  schema: z.object({
    id: string(),
    initialGoal: z.string(),
    initialTasks: z.array(z.string()),
  }),

  key({ id }) {
    return id;
  },

  create(state) {
    return {
      goal: state.args.initialGoal,
      tasks: state.args.initialTasks ?? [],
      currentTask: state.args.initialTasks?.[0],
      name: character.name,
      speechExamples: character.speechExamples,
      // traits: JSON.stringify(character.traits),
      aggression: character.traits.aggression,
      agreeability: character.traits.agreeability,
      openness: character.traits.openness,
      conscientiousness: character.traits.conscientiousness,
      extraversion: character.traits.extraversion,
      neuroticism: character.traits.neuroticism,
      empathy: character.traits.empathy,
      confidence: character.traits.confidence,
      adaptability: character.traits.adaptability,
      impulsivity: character.traits.impulsivity,
    };
  },

  render({ memory }) {
    return render(template, {
      goal: memory.goal,
      tasks: memory.tasks.join("\n"),
      currentTask: memory.currentTask ?? "NONE",
      name: character.name,
      speechExamples: character.speechExamples,
      // traits: character.traits,
      aggression: character.traits.aggression.toString(),
      agreeability: character.traits.agreeability.toString(),
      openness: character.traits.openness.toString(),
      conscientiousness: character.traits.conscientiousness.toString(),
      extraversion: character.traits.extraversion.toString(),
      neuroticism: character.traits.neuroticism.toString(),
      empathy: character.traits.empathy.toString(),
      confidence: character.traits.confidence.toString(),
      adaptability: character.traits.adaptability.toString(),
      impulsivity: character.traits.impulsivity.toString(),
    });
  },
});

createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cli],
  context: goalContexts,
  actions: [
    action({
      name: "addTask",
      description: "Add a task to the goal",
      schema: z.object({ task: z.string() }),
      handler(call, ctx, _agent) {
        const agentMemory = ctx.memory as GoalMemory;
        agentMemory.tasks.push(call.task);
        return {};
      },
    }),
    action({
      name: "completeTask",
      description: "Complete a task",
      schema: z.object({ task: z.string() }),
      handler(call, ctx, _agent) {
        const agentMemory = ctx.memory as GoalMemory;
        agentMemory.tasks = agentMemory.tasks.filter(
          (task) => task !== call.task
        );
        return {};
      },
    }),
  ],
}).start({ id: "test", initialGoal: "", initialTasks: [] });
