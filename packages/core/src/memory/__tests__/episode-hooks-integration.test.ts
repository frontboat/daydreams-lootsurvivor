import { describe, it, expect } from 'vitest';
import { handleEpisodeHooks } from '../episode-hooks';
import type { AnyRef, WorkingMemory } from '../../types';

describe('Episode hooks integration (handleEpisodeHooks)', () => {
  it('default hooks start on input and end on processed output, calling memory.remember', async () => {
    const now = Date.now();
    const workingMemory: WorkingMemory = {
      inputs: [],
      outputs: [],
      thoughts: [],
      calls: [],
      results: [],
      events: [],
      steps: [],
      runs: [],
    } as any;

    const inputRef: AnyRef = {
      id: 'r1',
      ref: 'input',
      timestamp: now,
      content: 'Hello',
    } as any;

    const outputRef: AnyRef = {
      id: 'r2',
      ref: 'output',
      timestamp: now + 100,
      content: 'Hi there',
      processed: true,
    } as any;

    const rememberCalls: any[] = [];
    const agent = {
      memory: {
        remember: async (content: any, options: any) => {
          rememberCalls.push({ content, options });
        },
      },
      logger: { debug: () => {}, warn: () => {} },
    } as any;

    const contextState = {
      id: 'ctx-ep',
      args: {},
      context: {},
    } as any;

    // Start episode on input
    await handleEpisodeHooks(workingMemory, inputRef, contextState, agent);
    // End and store episode on processed output
    await handleEpisodeHooks(workingMemory, outputRef, contextState, agent);

    expect(rememberCalls.length).toBe(1);
    const call = rememberCalls[0];
    expect(call.options?.type).toBe('episode');
    expect(call.options?.contextId).toBe('ctx-ep');
    expect(call.options?.metadata?.logCount).toBeGreaterThan(0);
  });
});

