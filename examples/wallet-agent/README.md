# 🏦 Multi-Context Wallet Management Agent

A sophisticated cryptocurrency wallet management agent built with the Daydreams framework, demonstrating advanced context composition and multi-platform integration.

## Overview

This agent showcases Daydreams' powerful **context composition pattern** where multiple specialized contexts work together to create a comprehensive wallet management system. Each user gets isolated wallet state while sharing common functionality through composed contexts.

## Architecture

### Context Composition Design

```
WalletAgentContext (Main Context)
├── AccountsContext    - Wallet accounts and balances
├── TasksContext       - Conditional trading tasks  
├── AnalyticsContext   - User behavior tracking
└── Composed Actions   - Unified functionality
```

### Key Features

- **🏦 Account Management** - Create and manage multiple wallet accounts
- **🤖 Conditional Tasks** - Automate trading with price-based triggers
- **📊 Portfolio Analytics** - Track performance and user behavior
- **📱 Multi-Platform** - Discord, Telegram, Twitter/X integration
- **🔒 User Isolation** - Each user has completely separate wallet state
- **💰 Price Monitoring** - Real-time cryptocurrency price data
- **📈 Trade Simulation** - Test trades without actual execution

## Context Architecture Details

### AccountsContext
Manages wallet accounts, balances, and portfolio operations:
- Create/manage multiple accounts per user
- Track token balances and portfolio value
- Simulate trades and calculate outcomes
- Portfolio summaries and analytics

### TasksContext  
Handles conditional trading tasks and automation:
- Create price-based conditional tasks
- Monitor conditions and execute when met
- Task management (enable/disable/delete)
- Execution history and analytics

### AnalyticsContext
Tracks user behavior and provides insights:
- Record all user interactions and events
- Session management and activity tracking
- Usage pattern analysis and recommendations
- Export data in multiple formats

### WalletAgentContext (Main Composed Context)
Orchestrates all functionality using `.use()` pattern:
- Composes all other contexts automatically
- Provides unified instructions and behavior
- Handles onboarding and preferences
- Cross-context coordination

## Platform Integrations

### Discord Bot (`discord-wallet-bot.ts`)
- Slash commands: `/wallet balance`, `/wallet portfolio`, `/wallet tasks`
- Natural language in DMs: "Create an account called Trading Wallet"
- Rich embeds for portfolio and price information
- Private DM support for sensitive operations

### Telegram Bot (`telegram-wallet-bot.ts`)
- Bot commands: `/portfolio`, `/balance [token]`, `/prices`
- Inline keyboards for interactive navigation
- HTML formatting with emojis and structure
- Real-time alerts and notifications

### Twitter/X Bot (`twitter-wallet-bot.ts`)
- Mention responses: `@walletbot portfolio`, `@walletbot prices BTC,ETH`
- Direct messages for private wallet operations
- Scheduled market update tweets
- Character-optimized formatting for Twitter limits

## Installation & Setup

1. **Install Dependencies**
   ```bash
   cd examples/wallet-agent
   npm install
   ```

2. **Environment Variables**
   ```bash
   # Required for AI models
   export OPENAI_API_KEY="your-openai-key"
   export GROQ_API_KEY="your-groq-key"
   
   # Platform-specific (as needed)
   export DISCORD_TOKEN="your-discord-token"
   export TELEGRAM_BOT_TOKEN="your-telegram-token"  
   export TWITTER_USERNAME="your-twitter-username"
   export TWITTER_PASSWORD="your-twitter-password"
   export TWITTER_EMAIL="your-twitter-email"
   ```

3. **Run the CLI**
   ```bash
   # Start interactive CLI
   npm run cli
   
   # Quick start with demo data
   npm run quick-start
   
   # Start with specific user ID
   npm run cli alice
   
   # Run platform-specific bots
   npm run discord-bot
   npm run telegram-bot  
   npm run twitter-bot
   ```

## Usage Examples

### Interactive CLI Commands

```bash
# Start the CLI
npm run cli

# In the CLI, try these commands:
wallet> Create an account called 'Main Wallet' with 10 ETH and 5000 USDC
wallet> Show me my portfolio summary
wallet> What's my ETH balance?
wallet> Create a task to alert me when ETH goes above $4000
wallet> Check current crypto prices
wallet> Show my analytics
wallet> help
wallet> exit
```

### Quick Shortcuts

The CLI includes several shortcuts for common operations:
- `portfolio` or `balance` - Show portfolio summary
- `prices` or `market` - Get current cryptocurrency prices  
- `tasks` - Show conditional tasks status
- `analytics` or `stats` - Display usage analytics
- `help` or `features` - Show all available features

### Programmatic Usage

```typescript
import { createWalletAgent, sendToWalletAgent } from './wallet-agent';

const agent = createWalletAgent();
await agent.start();

// Create account
await sendToWalletAgent(
  agent,
  "Create an account called 'Main Wallet' with 10 ETH and 5000 USDC",
  "user123",
  "cli"
);

// Check portfolio
await sendToWalletAgent(
  agent, 
  "Show me my portfolio summary",
  "user123",
  "cli"
);
```

### Conditional Tasks

```typescript
// Set up price alerts
await sendToWalletAgent(
  agent,
  "Create a task to alert me when ETH price goes above $4000",
  "user123", 
  "cli"
);

// Conditional trading
await sendToWalletAgent(
  agent,
  "Create a task to sell 2 ETH when the price hits $4500",
  "user123",
  "cli"
);

// Check task status
await sendToWalletAgent(
  agent,
  "Check all my tasks and execute any that meet conditions",
  "user123",
  "cli" 
);
```

### Multi-Platform Usage

```typescript
// Discord interaction
await sendToWalletAgent(agent, "What's my BTC balance?", "discord-user-123", "discord");

// Telegram interaction  
await sendToWalletAgent(agent, "Simulate trading 1 ETH for USDC", "telegram-user-456", "telegram");

// Twitter interaction
await sendToWalletAgent(agent, "Show current crypto prices", "twitter-user-789", "twitter");
```

## API Reference

### Core Actions

#### Account Management
- `create-account` - Create new wallet account
- `list-accounts` - Show all user accounts  
- `get-balance` - Check token balances
- `set-active-account` - Switch active account
- `add-funds` - Add tokens to account (mock)
- `get-portfolio-summary` - Complete portfolio overview

#### Task Management
- `create-task` - Create conditional trading task
- `list-tasks` - Show all user tasks
- `toggle-task` - Enable/disable task
- `delete-task` - Remove task
- `check-tasks` - Evaluate and execute tasks
- `get-task-details` - Get task information

#### Analytics & Insights
- `track-event` - Record user interaction
- `start-session` - Begin user session
- `end-session` - End user session  
- `get-interaction-stats` - User statistics
- `get-usage-patterns` - Behavior analysis
- `export-analytics` - Export data

#### Market Data
- `get-current-prices` - Current crypto prices
- `simulate-trade` - Test trade outcomes
- `get-market-summary` - Market overview
- `set-user-preferences` - Update user settings

## Context Memory Structures

### AccountsMemory
```typescript
interface AccountsMemory {
  accounts: WalletAccount[];
  activeAccountId?: string;
  totalPortfolioValue: number;
  lastUpdated: number;
}

interface WalletAccount {
  id: string;
  name: string;
  address: string;
  balances: Record<string, number>;
  createdAt: number;
  isActive: boolean;
}
```

### TasksMemory
```typescript
interface TasksMemory {
  tasks: ConditionalTask[];
  executionHistory: ExecutionRecord[];
  lastCheckTime: number;
}

interface ConditionalTask {
  id: string;
  name: string;
  condition: TaskCondition;
  action: TaskAction;
  isEnabled: boolean;
  executionCount: number;
  maxExecutions?: number;
}
```

### AnalyticsMemory
```typescript
interface AnalyticsMemory {
  events: AnalyticsEvent[];
  sessions: UserSession[];
  totalInteractions: number;
  dailyStats: Record<string, number>;
  featureUsage: Record<string, number>;
}
```

## Advanced Features

### Context Composition Benefits
- **Modular Design** - Each context handles specific functionality  
- **Automatic Integration** - Composed contexts share actions seamlessly
- **Isolated Memory** - Each context maintains separate state
- **Cross-Context Communication** - Contexts can interact when needed

### Multi-User Isolation
- Each user ID gets completely separate context instances
- `wallet-agent:user123` vs `wallet-agent:user456`
- No data leakage between users
- Scalable to thousands of users

### Episode Tracking
- Automatic conversation episode detection
- Rich episode metadata for analytics
- Episode classification and analysis
- Export capabilities for data analysis

### Real-Time Features
- Price monitoring and alerts
- Task condition evaluation
- Live portfolio updates  
- Multi-platform notifications

## Security & Safety

- **Simulation Mode** - No actual trading or transactions
- **Data Isolation** - Users cannot access others' data
- **Private Operations** - DM/private chat support
- **Rate Limiting** - Built-in abuse protection
- **Mock Data** - Uses simulated prices and accounts

## Development

### Project Structure
```
wallet-agent/
├── accounts-context.ts      # Account management context
├── tasks-context.ts         # Conditional tasks context  
├── analytics-context.ts     # User analytics context
├── wallet-agent-context.ts  # Main composed context
├── wallet-agent.ts          # Base agent implementation
├── discord-wallet-bot.ts    # Discord integration
├── telegram-wallet-bot.ts   # Telegram integration
├── twitter-wallet-bot.ts    # Twitter/X integration
├── examples.ts              # Usage examples
└── README.md               # This documentation
```

### Adding New Features
1. Add actions to relevant contexts
2. Update memory interfaces if needed
3. Test with base agent
4. Add platform-specific formatting
5. Update documentation

### Testing
```bash
# Run base agent tests
npm test

# Test individual platforms
npm run test:discord
npm run test:telegram
npm run test:twitter
```

## Key Learnings

This implementation demonstrates several advanced Daydreams patterns:

1. **Context Composition** - Using `.use()` to combine multiple contexts
2. **Multi-Platform Architecture** - Same agent across different interfaces
3. **State Management** - Isolated user state with shared functionality
4. **Episode Tracking** - Automatic conversation analysis and export
5. **Real-Time Operations** - Continuous monitoring and execution
6. **Type Safety** - Full TypeScript integration throughout

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Add your changes with proper TypeScript types
4. Test across all platforms
5. Update documentation
6. Submit pull request

## License

This project is part of the Daydreams framework examples and follows the same licensing terms.