# Daydreams - Loot Survivor Agent

Real quick: Manually (you) start a new adventurer, defeat starter beast, and handle first upgrade screen and item purchases, and then, with that adventurer ID, update eternum-context.ts with the adventurer ID. control-f to find all the current adventurer IDs, and update the one you want to use. Then, `bun dev`. Feel free to reach out to me on twitter if you have any questions. @0xdogwater

Daydreams is a generative agent library for playing anything onchain. It is chain agnostic and can be used to play any onchain game by simply injecting context. Base, Solana, Ethereum, Starknet, etc.

You can drop daydreams into Eliza or any typescript agent framework via their plugin system.

_How it works:_

- Agent or human designs a Context (text file) about the game or app.
- The Context is injected into the agent or fetched from the agents memory.
- The agent then plays the game or app dynamically without any additional configuration.

_Design directions:_

- Daydreams should be as 'lite' as possible. We want to keep the codebase as small as possible, and have the agent dynamically generate the code it needs to play the game.
- Daydreams should be as 'composable' as possible. It should be easy to compose together functions and tools.

> ⚠️ **Warning**: Daydreams is currently in pre-alpha stage, we are looking for feedback and collaboration.

See the [POC](https://x.com/0xtechnoir/status/1869835800088907938) website for more information.

Roadmap (not in order):

- [x] Chain of Thought
- [ ] Context Layers
- [ ] Graph memory system
- [ ] Agent
- [ ] Swarm Rooms
- [ ] Integration with External Agents
- [ ] Create 'sleeves' abstract. Allowing dynamic context generation for any game or app.

# Getting Started

You must have bun installed. Then

```bash
pnpm i

# we use bun as it is nice for development
bun dev
```

## 1. Overview

Daydreams provides a blueprint for creating autonomous, onchain game agents—programmatic entities that interpret game states, recall historical data, and refine strategies over time. By leveraging vector databases as long-term memory and multi-agent swarm rooms for collective knowledge sharing, Daydreams fosters rapid, continuous improvement among agents.

- **Seamless Dojo Integration**: Built to work smoothly with the Dojo onchain game engine.
- **Low Configuration Overhead**: Minimal steps required to plug into any Dojo-based onchain game.

### 1.1 Dojo Integration

Daydream uses a [MCP](https://github.com/modelcontextprotocol) for exposing context natively to the agent. Developers only have to implement game guides and the agent will be able to query the game state and execute actions accordingly.

### 1.2 Event Driven CoT

Daydreams uses an event driven CoT kernel where all thoughts processed.

![bg](./daydream.png)

## 2. Motivation

### 2.1 Why Games?

Games present complex, high-stakes environments that challenge agents to adapt rapidly, plan strategically, and solve problems creatively. Success in these arenas demonstrates a capability for:

- **Uncertainty Handling**: Dealing with incomplete or changing information.
- **Optimal Decision-Making**: Balancing long-term goals with short-term opportunities.
- **Real-Time Adaptation**: Responding to adversarial or evolving game states.

If such skills prove extensible beyond games, it brings us closer to Artificial General Intelligence (AGI).

### 2.2 Why Onchain Games?

Onchain games embed a profit motive in the environment—agents are economically incentivized to maximize onchain rewards like tokens, NFTs, or other assets. This introduces a real-world gain function that drives agent improvement.

Advantages:

- **Direct Economic Feedback**: Every action has a measurable onchain outcome.
- **Transparent State**: Game data can be reliably queried via standardized, open interfaces.
- **Community Adoption**: A financial reward structure encourages fast adoption and fosters network effects.

## 3. Core Concepts

### Onchain Games as Standardized Environments

- **Uniform JSON/RPC Schemas**: Onchain games expose consistent endpoints detailing states, actions, and player data.
- **Low Integration Overhead**: Agents can parse and generate valid actions using these standardized schemas.

### Agent Self-Improvement and Incentives

- **Economic Drivers**: Tie agent success directly to assets (tokens/NFTs). This fosters relentless optimization.
- **Adaptive Learning**: Agents store past successes as vector embeddings, guiding future decisions toward higher expected value.

### Chain of Thought (CoT)

- **Contextual Reasoning**: Agents synthesize current state, historical data, and known tactics to produce well-informed moves.
- **Dynamic Queries**: Agents fetch additional insights from SQL-like databases or other APIs on demand.
- **Memory Retrieval**: Vector embeddings help recall similar scenarios to refine strategies.

## 4. Protocol Design

### 4.1 Modular Architecture

The Daydreams protocol is intentionally open and modular, enabling easy customization and extension. You can integrate any or all components depending on your use case.

#### Context Layers

##### Game Context

- Represents the real-time onchain state: entities, resources, turn counters, etc.
- Retrieved via RPC calls to smart contracts or sidechain services.

##### SQL Context

- Historical gameplay logs stored in a relational database (e.g., moves, outcomes, player_stats, world_events).
- Agents query these tables for patterns and data-driven insights.

##### Execution Context

- Provides transactional details on how to interact with the blockchain.
- Includes RPC endpoints, transaction formatting, and gas/fee considerations.
- Ensures agent actions can be reliably and safely executed onchain.

#### Chain of Thought (CoT) Kernel

- The reasoning engine that integrates data from all context layers.
- Dynamically queries SQL and vector databases to augment decision-making.
- Evaluates possible moves and commits the best action.

![bg](./chain.png)

#### Embedded Vector Database (Long-Term Memory)

- **Storage**: Each completed CoT is embedded into a vector representing the agent's reasoning steps, decisions, and outcomes.
- **Retrieval**: Similarity-based lookups provide relevant historical insights for new situations.
- **Feedback Loops**: Successful outcomes incrementally boost the weight of their associated embeddings.

#### Swarm Rooms (Multi-Agent Collaboration)

- **Knowledge Sharing**: Agents publish their successful CoTs in a shared "swarm room."
- **Federated Memory Updates**: Other agents can subscribe and incorporate these embeddings into their own vector DBs, accelerating group learning.
- **Privacy Controls**: Agents may choose to share only certain data or employ cryptographic proofs to validate the authenticity of shared embeddings. Eg, agents will sign their messages and will be able to rank each others CoT

#### Integration with External Agents

- **Plug-and-Play**: Daydreams can be extended and integrated with any agent infrastructure (e.g., Eliza, Rig).

## 5. Example Daydream Flow

### Initialization

- A Daydream agent boots up, loading its vector DB and connecting to the game's SQL logs.

### Acquire Context

- Agent queries the Game Context (onchain state) to get the current turn number, player holdings, and any relevant events.
- Agent optionally queries the SQL Context to retrieve historical moves/outcomes.

### Inference (CoT Kernel)

- Agent compares the current game state against similar historical embeddings in the vector DB.
- Agent formulates a plan using the retrieved best practices, factoring in any real-time changes or newly discovered strategies.

### Action Execution

- Agent formats a transaction or game action payload according to the Execution Context.
- Action is sent onchain (or to the relevant sidechain/RPC endpoint).

### Post-Action Feedback

- The agent records the outcome of its move (e.g., resource gain/loss, updated game state).
- This new CoT embedding is stored in the vector DB and, if successful, can be published to a swarm room (telegram or elsewhere)

### Swarm Collaboration

- Other agents subscribe, retrieving the newly shared CoT embedding and integrating it into their memory store, thus spreading successful strategies network-wide.

## 6. Recent Architectural Improvements

### Enhanced Contract Interaction
- **Smart Response Parsing**: Implemented structured parsing for all contract read and transaction responses based on the ABI, converting hex values to human-readable numbers.
- **Stateful Context Management**: Added `lastTransactionResult` and `lastContractRead` to track the most recent blockchain interactions with timestamps.
- **Combat-Aware Logic**: Implemented checks to prevent exploration during active combat, ensuring proper game flow.

### Goal Management System
- **Hierarchical Goals**: Goals can now have dependencies, sub-goals, and parent-child relationships.
- **Dynamic Priority**: Combat resolution goals are automatically created with high priority when needed.
- **State-Aware Blocking**: Goals are properly blocked during combat and unblocked when combat resolves.
- **Completion Validation**: Added robust validation of goal success criteria against current context.

### Chain of Thought Improvements
- **Asynchronous Processing**: All blockchain interactions are properly awaited and handled asynchronously.
- **Step Tracking**: Added detailed step tracking for transactions and contract reads with pending/completed/failed states.
- **Error Recovery**: Enhanced error handling with specific error conditions and appropriate goal state updates.
- **Context Updates**: Automatic context merging after successful actions to maintain accurate game state.

### Data Parsing Enhancements
- **Structured Data**: All contract responses are parsed into structured objects matching the game's data model.
- **Equipment Handling**: Proper parsing of equipped items, inventory, and item specials.
- **Stats Management**: Accurate tracking of adventurer stats, health, XP, and available upgrade points.
- **Combat Data**: Detailed parsing of beast encounters, combat results, and battle rewards.

These improvements ensure more reliable game state management, better decision-making, and smoother gameplay progression while maintaining the system's extensibility and composability.

## 7. Loot Survivor Implementation

### Game Loop Management
- **Combat Priority System**: Automatically detects and prioritizes combat resolution when a beast is encountered, preventing exploration until combat is resolved.
- **Resource Tracking**: Precise tracking of adventurer's gold, XP, and stat points to make optimal upgrade decisions.
- **Inventory Management**: Smart handling of equipment and items, including parsing of item specials and XP for each equipped item.

### State Machine Integration
- **Adventurer State**: Structured parsing of the `get_adventurer` response into a complete state object:
  ```typescript
  {
    health: number,
    xp: number,
    gold: number,
    beast_health: number,
    stat_upgrades_available: number,
    stats: {
      strength, dexterity, vitality, intelligence,
      wisdom, charisma, luck
    },
    equipment: {
      weapon, chest, head, waist, foot, hand, neck, ring
    }
  }
  ```
- **Beast Encounters**: Detailed parsing of `get_attacking_beast` responses:
  ```typescript
  {
    id: number,
    starting_health: number,
    combat_spec: {
      tier: number,
      item_type: number,
      level: number,
      specials: {special1, special2, special3}
    }
  }
  ```

### Action Handling
- **Combat Actions**: 
  - `attack`: Tracks damage dealt/taken, beast slain status, XP/gold earned
  - `flee`: Monitors success status and damage taken
- **Progression Actions**:
  - `explore`: Parses discovery types (Beast, Obstacle, Discovery)
  - `upgrade`: Manages stat point allocation with validation
  - `equip`: Handles equipment changes with slot tracking
  - `buy_item`/`buy_potion`: Validates gold availability and manages purchases

### Strategic Decision Making
- **Combat Strategy**: Evaluates beast tier, level, and specials against adventurer stats to decide between attacking and fleeing
- **Upgrade Optimization**: Prioritizes stat upgrades based on:
  - Current health status
  - Combat performance
  - Equipment requirements
- **Resource Management**:
  - Balances gold spending between potions and market items
  - Tracks potion prices through `get_potion_price`
  - Monitors market availability via `get_market`

### Error Prevention
- **Pre-action Validation**:
  - Prevents exploration during active combat
  - Validates sufficient gold before purchases
  - Checks stat points availability before upgrades
- **State Consistency**:
  - Maintains accurate tracking of adventurer state between actions
  - Prevents invalid action sequences
  - Handles transaction failures gracefully

This implementation ensures optimal gameplay in Loot Survivor by maintaining accurate state tracking, making informed strategic decisions, and preventing common failure modes that could lead to adventurer death or resource waste.
