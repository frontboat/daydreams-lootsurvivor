# Coinbase Server Wallet v2 + Daydreams Integration

Examples demonstrating CDP Server Wallet v2 integration with Daydreams contexts.

## Examples

### `wallet-context.ts`

Core wallet context providing CDP Server Wallet v2 functionality:

- EVM wallet creation and management
- Balance checking with 30-second cache
- Transaction sending with confirmation flow
- Testnet faucet requests
- Transaction history tracking

### `multi-context-wallet.tsx`

Demonstrates context composition with wallet, analytics, and profile contexts.

## Setup

### Prerequisites

1. CDP account at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
2. CDP API credentials from portal

### Environment Variables

```bash
# Required
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
CDP_WALLET_SECRET=your_wallet_secret
DREAMSROUTER_API_KEY=your_router_key
```

### Installation

```bash
pnpm install
```

### Running

```bash
# Default user and network
tsx examples/CDP/server-wallet/multi-context-wallet.tsx

# Specific user and network
tsx examples/CDP/server-wallet/multi-context-wallet.tsx alice base-sepolia
```

## Usage

### Creating a Wallet

```
User: "Create a wallet for me"
Agent: Successfully created wallet: 0x1234...5678
```

### Checking Balance

```
User: "Check my balance"
Agent: Current balance: 0.01 ETH
```

### Sending Transactions

```
User: "Send 0.001 ETH to 0xabcd...ef01"
Agent: Ready to send 0.001 ETH to 0xabcd...ef01. Please confirm to proceed.
User: "Confirm"
Agent: Successfully sent 0.001 ETH
       Transaction: https://sepolia.basescan.org/tx/0x...
```

### Requesting Testnet Funds

```
User: "Request test funds"
Agent: Successfully requested ETH from faucet
       Transaction: 0x9876...5432
```

## Architecture

### Wallet Memory Structure

```typescript
interface WalletMemory {
  accountAddress: string | null;
  accountName: string | null;
  network: string;
  createdAt: number | null;

  transactions: Array<{
    hash: string;
    to: string;
    value: string;
    status: "pending" | "confirmed" | "failed";
    timestamp: number;
    type: "send" | "receive" | "faucet";
  }>;

  lastBalanceCheck: number | null;
  cachedBalance: {
    eth: string;
    usdc?: string;
  } | null;

  totalTransactionsSent: number;
  totalTransactionsReceived: number;
  totalGasSpent: string;
}
```

### Actions

| Action                    | Description          | Parameters                              |
| ------------------------- | -------------------- | --------------------------------------- |
| `create-wallet`           | Create CDP wallet    | `name?`                                 |
| `check-balance`           | Check wallet balance | `forceRefresh?`                         |
| `send-transaction`        | Send ETH             | `to`, `amount`, `confirmBeforeSending?` |
| `request-faucet`          | Get testnet funds    | `token?`                                |
| `get-transaction-history` | List transactions    | `limit?`, `type?`                       |

### Networks

**Testnets (with faucet):**

- `base-sepolia` (default)

**Mainnets:**

- `base`
- `ethereum`
- `polygon`

## Security

### CDP Server Wallet v2

- Private keys secured in AWS Nitro Enclave TEE
- Keys never exposed to application code
- Single authentication for all accounts

### Application

- Credentials via environment variables
- Transaction confirmation flow
- Address validation
- Comprehensive error handling

## Context Composition

```typescript
const assistantContext = context({
  type: "assistant",
  // ...
}).use((state) => [
  { context: walletContext, args: { userId, network } },
  { context: analyticsContext, args: { userId } },
  { context: profileContext, args: { userId } },
]);
```

## Resources

- [CDP Documentation](https://docs.cdp.coinbase.com/)
- [Server Wallet v2 Guide](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/welcome)
- [CDP Portal](https://portal.cdp.coinbase.com/)
