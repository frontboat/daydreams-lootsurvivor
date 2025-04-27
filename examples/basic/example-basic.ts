/**
 * Basic example demonstrating a simple chat interface using Dreams
 */
import { anthropic } from "@ai-sdk/anthropic";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
  output,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { string, z } from "zod";

validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  })
);

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

These traits combine to create a unique personality profile that influences how {{name}} approaches problems, interacts with others, and makes decisions. The relative strength of each trait shapes their behavioral patterns and emotional responses.`;

type GoalMemory = {
  goal: string;
  tasks: string[];
  currentTask: string;
};

const goalContexts = context({
  type: "goal",
  schema: z.object({
    id: string(),
  }),

  key({ id }) {
    return id;
  },

  create() {
    return {
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

  render() {
    return render(template, {
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
  extensions: [cliExtension],
  context: goalContexts,
  actions: [
    action({
      name: "addTask",
      description: "Add a task to the goal",
      schema: z.object({ task: z.string() }),
      handler(data, ctx, _agent) {
        const agentMemory = ctx.agentMemory as GoalMemory;
        agentMemory.tasks.push(data.task);
        return {};
      },
    }),
    action({
      name: "completeTask",
      description: "Complete a task",
      schema: z.object({ task: z.string() }),
      handler(data, ctx, _agent) {
        const agentMemory = ctx.agentMemory as GoalMemory;
        agentMemory.tasks = agentMemory.tasks.filter(
          (task) => task !== data.task
        );
        return {};
      },
    }),
  ],
  outputs: {
    test: output({}),
  },
}).start({ id: "test" });
