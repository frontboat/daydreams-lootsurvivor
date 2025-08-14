# A2A Protocol Integration for Daydreams

## Overview

This document outlines the design for integrating the Agent-to-Agent (A2A) protocol into the Daydreams framework, enabling standardized agent communication and interoperability.

## Architecture Comparison

### Daydreams Framework
- **Context-based**: Isolated state environments with type-safe management
- **XML streaming**: LLM responses parsed as structured XML
- **Extension system**: Modular plugin architecture
- **Working memory**: Tracks execution logs (inputs, outputs, thoughts, actions)
- **Engine-driven**: Orchestrates execution through router system

### A2A Protocol
- **Task-based**: Creates tasks with unique IDs and streaming updates
- **JSON-RPC**: Standard communication protocol
- **AgentCard**: Defines agent capabilities and metadata
- **SSE streaming**: Real-time task status and artifact updates
- **AgentExecutor**: Interface with execute() and cancelTask() methods

## Integration Architecture

The integration creates a bridge between Daydreams' internal architecture and A2A's standardized protocol:

```
Daydreams Agent
├── Core (existing XML-based engine)
├── A2A Extension Package (@daydreamsai/a2a)
│   ├── A2AServer (Express app exposing agent via A2A)
│   ├── A2AExecutor (bridges Daydreams contexts → A2A tasks)
│   ├── A2AClient (action for calling other A2A agents)
│   └── Protocol Bridge (XML ↔ JSON-RPC conversion)
```

## Package Structure

```
packages/a2a/
├── src/
│   ├── index.ts                    # Main exports
│   ├── extension.ts                 # A2A extension for Daydreams
│   ├── types.ts                     # A2A protocol types (reexport from SDK)
│   │
│   ├── server/
│   │   ├── a2a-server.ts           # Express/Hono server with A2A endpoints
│   │   ├── agent-card.ts           # AgentCard generator from Daydreams config
│   │   ├── executor.ts             # A2AExecutor implementation
│   │   ├── task-store.ts           # Bridge between contexts and tasks
│   │   ├── event-bridge.ts         # Convert WorkingMemory logs to A2A events
│   │   └── middleware.ts           # Optional x402 payment integration
│   │
│   ├── client/
│   │   ├── a2a-action.ts          # Action to call other A2A agents
│   │   ├── a2a-client.ts          # Client wrapper for Daydreams
│   │   └── discovery.ts           # Agent discovery utilities
│   │
│   ├── bridge/
│   │   ├── context-to-task.ts     # Convert context state to A2A task
│   │   ├── logs-to-events.ts      # Convert Daydreams logs to A2A events
│   │   ├── message-adapter.ts     # Convert between message formats
│   │   └── skill-mapper.ts        # Map actions to A2A skills
│   │
│   └── utils/
│       ├── streaming.ts           # SSE utilities for real-time updates
│       └── jsonrpc.ts            # JSON-RPC helpers
│
├── examples/
│   ├── basic-a2a-server.ts       # Simple A2A server
│   ├── a2a-with-payments.ts      # A2A + x402 nanoservice
│   └── multi-agent-chat.ts       # Agents calling each other
│
└── README.md
```

## Core Components

### 1. A2A Extension

```typescript
interface A2AExtensionConfig {
  // Server configuration
  server?: {
    enabled: boolean;
    port: number;
    basePath?: string;
    agentCard?: Partial<AgentCard>;
  };
  
  // Client capabilities
  client?: {
    enabled: boolean;
    discoveryUrl?: string;  // Registry of A2A agents
  };
  
  // Payment integration
  payments?: {
    provider: 'x402' | 'stripe' | 'custom';
    config: any;
  };
}

const a2aExtension = (config: A2AExtensionConfig) => Extension
```

### 2. Agent Card Generator

Maps Daydreams agent configuration to A2A AgentCard:
- Agent name/description from config
- Skills from registered actions
- Input/output modes from agent inputs/outputs
- Capabilities based on features (streaming always true)
- Security schemes from payment config

### 3. A2A Executor

Bridges Daydreams execution to A2A protocol:

```typescript
class DreamsA2AExecutor implements AgentExecutor {
  constructor(
    private agent: Agent,
    private contextMapper: ContextToTaskMapper
  )
  
  async execute(requestContext, eventBus) {
    // 1. Map A2A message to Daydreams input
    // 2. Create/retrieve context from task ID
    // 3. Subscribe to WorkingMemory logs
    // 4. Convert logs to A2A events in real-time
    // 5. Publish events through eventBus
  }
  
  async cancelTask(taskId, eventBus) {
    // Find running context by task ID
    // Abort the context execution
    // Publish cancelled status
  }
}
```

### 4. Event Bridge

Real-time conversion of Daydreams logs to A2A events:

| WorkingMemory Log | A2A Event |
|------------------|-----------|
| InputRef | (internal, not exposed) |
| ThoughtRef | TaskStatusUpdateEvent (working) |
| ActionCall | TaskStatusUpdateEvent (action: {name}) |
| ActionResult | TaskArtifactUpdateEvent |
| OutputRef | TaskStatusUpdateEvent (with message) |
| StepRef | TaskStatusUpdateEvent (step complete) |
| RunRef | TaskStatusUpdateEvent (final) |

### 5. Task Store Bridge

```typescript
class ContextTaskStore implements TaskStore {
  // Maps context IDs to task IDs bidirectionally
  // Persists using Daydreams memory system
  // Handles task lifecycle (submitted → working → completed)
}
```

### 6. A2A Action

```typescript
const callA2AAgent = action({
  name: 'call_a2a_agent',
  description: 'Call another A2A-compliant agent',
  schema: z.object({
    agentUrl: z.string().url(),
    message: z.string(),
    streaming: z.boolean().optional(),
    taskId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const client = new A2AClient(args.agentUrl);
    if (args.streaming) {
      // Stream responses back through context
    } else {
      // Blocking call
    }
  }
});
```

## Integration Patterns

### Pattern 1: Pure A2A Server

```typescript
// Expose any Daydreams agent via A2A
const agent = createDreams({...});
const a2aServer = createA2AServer(agent, {
  port: 3000,
  agentCard: {...}
});
```

### Pattern 2: A2A + Payments (Enhanced Nanoservice)

```typescript
// Combine A2A protocol with x402 payments
const agent = createDreams({
  extensions: [
    a2aExtension({
      server: { enabled: true, port: 3000 },
      payments: {
        provider: 'x402',
        config: { 
          price: '$0.01',
          network: 'base-sepolia'
        }
      }
    })
  ]
});
```

### Pattern 3: Multi-Agent System

```typescript
// Agent that can call other A2A agents
const agent = createDreams({
  actions: [callA2AAgent],
  extensions: [
    a2aExtension({
      client: { 
        enabled: true,
        discoveryUrl: 'https://a2a-registry.example.com'
      }
    })
  ]
});
```

## Key Mappings

### Context → Task
Each Daydreams context becomes an A2A task with:
- Task ID derived from context ID
- Status tracking through context lifecycle
- History from WorkingMemory

### Working Memory → Event Stream
- OutputRef → TaskStatusUpdateEvent
- ActionResult → TaskArtifactUpdateEvent
- Execution progress → Real-time SSE updates

### Actions → Skills
Daydreams actions exposed as A2A skills with:
- Skill ID from action name
- Input/output modes from action schema
- Examples from action description

### Engine Execution → Task Execution
Engine's step-by-step processing maps to task status updates:
- submitted → Context created
- working → Engine processing
- completed → Execution finished

## Key Design Decisions

1. **Extension-based**: A2A is an optional extension, not core functionality
2. **Bidirectional mapping**: Full support for both serving and consuming A2A
3. **Payment-agnostic**: Works with or without payment systems
4. **Stream-first**: Leverages Daydreams' streaming architecture
5. **Context preservation**: Maintains Daydreams' context isolation
6. **Progressive enhancement**: Can add A2A to any existing agent

## Migration Path for x402 Nanoservice

Current nanoservice uses custom HTTP endpoints. With A2A:

1. **Keep existing endpoints** for backward compatibility
2. **Add A2A endpoints** alongside:
   - `/.well-known/agent-card.json` - Agent capabilities
   - `/invoke` - JSON-RPC endpoint
3. **Unified payment middleware** works for both
4. **Result**: Agent accessible via custom API OR standard A2A protocol

## Benefits

1. **Interoperability**: Daydreams agents can communicate with any A2A-compliant agent
2. **Standardization**: External clients use standard A2A protocol instead of custom APIs
3. **Streaming**: Native support for real-time updates via SSE
4. **Discovery**: AgentCard enables automatic agent discovery and capability negotiation
5. **Monetization**: Combine A2A protocol with x402 micropayments for agent economies

## Implementation Roadmap

### Phase 1: Core Protocol Support
- Implement A2AExecutor and EventBridge
- Create basic A2A server with AgentCard
- Map contexts to tasks

### Phase 2: Client Capabilities
- Build A2A client action
- Add agent discovery
- Enable agent-to-agent communication

### Phase 3: Advanced Features
- Payment integration (x402, Stripe)
- Multi-agent orchestration
- Registry and marketplace support

### Phase 4: Ecosystem Integration
- Standard compliance testing
- Interoperability certification
- Community agent registry

## Conclusion

This integration positions Daydreams agents as first-class citizens in the emerging multi-agent ecosystem while maintaining the framework's powerful internal architecture. The A2A extension provides a standards-compliant interface without compromising Daydreams' unique features like context isolation, working memory, and XML-based streaming.