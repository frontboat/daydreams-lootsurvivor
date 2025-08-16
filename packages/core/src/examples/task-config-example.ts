/**
 * Example demonstrating task configuration with priority and concurrency settings
 */

import { createDreams } from '../dreams';
import type { TaskConfiguration } from '../types';

// High-traffic Discord bot configuration
const discordBotConfig: TaskConfiguration = {
  concurrency: {
    default: 5, // Higher default queue concurrency for handling multiple users
    llm: 8,     // Allow more concurrent LLM calls for faster responses
  },
  priority: {
    default: 10,  // Standard messages
    high: 20,     // Premium users or urgent commands
    low: 5,       // Background tasks or rate-limited users
  },
};

// Resource-constrained environment
const constrainedConfig: TaskConfiguration = {
  concurrency: {
    default: 1, // Conservative default
    llm: 2,     // Limited LLM concurrency
  },
  priority: {
    default: 10,
    high: 15,   // Modest priority boost
  },
};

// Rate-limited API provider
const rateLimitedConfig: TaskConfiguration = {
  concurrency: {
    default: 3,
    llm: 1,     // Very conservative for rate limits
  },
  priority: {
    default: 10,
    high: 15,
    low: 3,     // Very low priority for bulk operations
  },
};

// Example usage with different configurations
export function createDiscordAgent() {
  return createDreams({
    // ... other config
    tasks: discordBotConfig,
  });
}

export function createConstrainedAgent() {
  return createDreams({
    // ... other config
    tasks: constrainedConfig,
  });
}

// Example of using priority levels at runtime
export async function handleUserMessage(agent: any, context: any, args: any, userType: string) {
  const priorities = agent.getPriorityLevels();
  
  let messagePriority: number;
  switch (userType) {
    case 'premium':
      messagePriority = priorities.high;
      break;
    case 'rate_limited':
      messagePriority = priorities.low;
      break;
    default:
      messagePriority = priorities.default;
  }

  return await agent.run({
    context,
    args,
    priority: messagePriority, // Use dynamic priority based on user type
  });
}

// Example of accessing task configuration
export function logTaskConfiguration(agent: any) {
  const config = agent.getTaskConfig();
  
  console.log('Task Configuration:', {
    'Default Queue Concurrency': config.concurrency.default,
    'LLM Queue Concurrency': config.concurrency.llm,
    'Default Priority': config.priority.default,
    'High Priority': config.priority.high || 'Auto: 2x default',
    'Low Priority': config.priority.low || 'Auto: 0.5x default',
  });

  const priorities = agent.getPriorityLevels();
  console.log('Resolved Priority Levels:', priorities);
}