Ah yes, let me revise the guide with the correct file structure and implementation flow:

# Guide: Adding Custom Actions to Daydreams

## File Structure
```
packages/core/
  └── src/
      ├── types/
      │   └── index.ts         # Type definitions
      └── core/
          ├── validation.ts    # Validation schemas
          ├── providers.ts     # API/Service providers
          ├── env.ts          # Environment configuration
          └── actions/
              └── your-action.ts  # Action implementation
examples/
  └── example-basic.ts        # Action registration and usage
```

## Implementation Steps

### 1. Define Types (`packages/core/src/types/index.ts`)
```typescript
// Define your action's parameter interface
export interface YourActionParams {
  param1: string;
  param2: number;
}

// If needed, define response types
export interface YourActionResponse {
  result: string;
}
```

### 2. Add Provider Functions (`packages/core/src/core/providers.ts`)
```typescript
import { YourActionParams, YourActionResponse } from "../types";

export async function yourProvider(
  params: YourActionParams
): Promise<YourActionResponse | Error> {
  try {
    // Implement API calls or core logic here
    return {
      result: "success"
    };
  } catch (error) {
    return error instanceof Error ? error : new Error("Unknown error");
  }
}
```

### 3. Define Validation Schema (`packages/core/src/core/validation.ts`)
```typescript
import type { JSONSchemaType } from "ajv";
import type { YourActionParams } from "../types";

export const yourActionSchema: JSONSchemaType<YourActionParams> = {
  type: "object",
  properties: {
    param1: { type: "string" },
    param2: { type: "number" }
  },
  required: ["param1", "param2"]
};
```

### 4. Create Action Handler (`packages/core/src/core/actions/your-action.ts`)
```typescript
import type { ActionHandler } from "../../types";
import { yourProvider } from "../providers";

export const yourAction: ActionHandler = async (action) => {
  try {
    const payload = action.payload as YourActionParams;
    const result = await yourProvider(payload);
    
    if (result instanceof Error) {
      throw result;
    }

    return JSON.stringify({
      success: true,
      result,
      message: `Successfully performed action with ${payload.param1}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to perform action: ${errorMessage}`
    });
  }
};
```

### 5. Register Action (`examples/example-basic.ts`)
```typescript
// Import your action and schema
import { yourAction } from "../packages/core/src/core/actions/your-action";
import { yourActionSchema } from "../packages/core/src/core/validation";

// Register with Dreams instance
dreams.registerAction(
  "YOUR_ACTION",
  yourAction,
  {
    description: "Description of what your action does",
    example: JSON.stringify({
      param1: "example",
      param2: 123
    })
  },
  yourActionSchema as JSONSchemaType<any>
);
```

## Real Example: Jupiter Quote Action

Here's how we implemented the Jupiter quote functionality:

1. **Types** (`packages/core/src/types/index.ts`):
```typescript
export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}
```

2. **Provider** (`packages/core/src/core/providers.ts`):
```typescript
export async function fetchJupiterQuote(
  params: JupiterQuoteParams
): Promise<QuoteResponse | Error> {
  // Implementation of Jupiter API call
}
```

3. **Validation** (`packages/core/src/core/validation.ts`):
```typescript
export const jupiterQuoteSchema: JSONSchemaType<JupiterQuoteParams> = {
  type: "object",
  properties: {
    inputMint: { type: "string" },
    outputMint: { type: "string" },
    amount: { type: "string" },
    slippageBps: { type: "number" }
  },
  required: ["inputMint", "outputMint", "amount", "slippageBps"]
};
```

4. **Action** (`packages/core/src/core/actions/jupiter-actions.ts`):
```typescript
export const jupiterQuoteAction: ActionHandler = async (action) => {
  try {
    const payload = action.payload as JupiterQuoteParams;
    const rawAmount = isRawAmount(payload.amount) 
      ? payload.amount 
      : Math.floor(parseFloat(payload.amount) * MULTIPLIER).toString();
    
    const result = await fetchJupiterQuote({
      ...payload,
      amount: rawAmount
    });
    
    if (result instanceof Error) throw result;

    return JSON.stringify({
      success: true,
      quote: result,
      message: `Successfully got quote for swapping ${toHumanAmount(rawAmount)} ${payload.inputMint} to ${payload.outputMint}`
    });
  } catch (error) {
    // Error handling
  }
};
```

5. **Registration** (`examples/example-basic.ts`):
```typescript
dreams.registerAction(
  "JUPITER_QUOTE",
  jupiterQuoteAction,
  {
    description: "Get a quote for swapping tokens using Jupiter",
    example: JSON.stringify({
      inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      amount: "1000000",
      slippageBps: 50
    })
  },
  jupiterQuoteSchema as JSONSchemaType<any>
);
```

## Best Practices
1. Keep provider logic separate from action handlers
2. Use proper error handling and type checking
3. Include clear success/error messages
4. Document expected formats and units (especially for financial values)
5. Use environment variables for sensitive data (`env.ts`)
6. Validate inputs using schemas
7. Return structured JSON responses

Would you like me to elaborate on any of these aspects?
