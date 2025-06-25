# Action Parsing Error Fix

## Problem Analysis

The error `ACTION_MISMATCH` occurs because:
1. LLM outputs: `{"name":"solana.token.analyzeToken","arguments":{...}}`
2. System expects: `<action_call name="solana.token.analyzeToken">{...}</action_call>`

The action call has `name: undefined` because the XML parser expects the action name in an attribute, not in the content.

## Root Causes

1. **Model Confusion**: Some models default to JSON function calling format instead of XML
2. **Prompt Ambiguity**: The prompt doesn't clearly show the expected format
3. **No Format Detection**: System assumes XML without checking content format
4. **No Fallback Parser**: When XML parsing fails, there's no JSON fallback

## Immediate Fix (Hot Patch)

### 1. Add JSON Detection to Action Parser

```typescript
// In packages/core/src/handlers.ts, update parseActionCallContent:

export function parseActionCallContent({
  call,
  action,
}: {
  call: ActionCall;
  action: AnyAction;
}) {
  try {
    const content = call.content.trim();
    let data: any;

    // Check if content looks like JSON function call
    if (content.startsWith('{') && content.includes('"name"')) {
      try {
        const jsonCall = JSON.parse(content);
        // If JSON contains name field, this is likely a function call format
        if (jsonCall.name) {
          // Extract the actual arguments
          data = jsonCall.arguments || jsonCall.parameters || {};
          // Update the call name if it was undefined
          if (!call.name) {
            call.name = jsonCall.name;
          }
        } else {
          data = jsonCall;
        }
      } catch (e) {
        // Not valid JSON, continue with normal parsing
        if (action.parser) {
          data = action.parser(call);
        } else if (action.schema && action.schema?._def?.typeName !== "ZodString") {
          if (action.callFormat === "xml") {
            data = parseXMLContent(content);
          } else {
            data = parseJSONContent(content);
          }
        } else {
          data = content;
        }
      }
    } else if (action.parser) {
      data = action.parser(call);
    } else if (action.schema && action.schema?._def?.typeName !== "ZodString") {
      if (action.callFormat === "xml") {
        data = parseXMLContent(content);
      } else {
        data = parseJSONContent(content);
      }
    } else {
      data = content;
    }

    return data;
  } catch (error) {
    throw new ParsingError(call, error);
  }
}
```

### 2. Update Stream Parser to Handle JSON Format

```typescript
// In packages/core/src/streaming.ts, add JSON action detection:

function streamHandler(el: StackElement) {
  if (abortSignal?.aborted) return;
  
  switch (el.tag) {
    // ... existing cases ...
    
    case "action_call": {
      const ref = getOrCreateRef(el.index, {
        ref: "action_call",
      });
      const { name, ...params } = el.attributes;
      
      // Check if content is JSON function call
      let actionName = name;
      let actionContent = el.content;
      
      if (!name && el.content.trim().startsWith('{')) {
        try {
          const jsonCall = JSON.parse(el.content);
          if (jsonCall.name) {
            actionName = jsonCall.name;
            actionContent = JSON.stringify(jsonCall.arguments || jsonCall.parameters || {});
          }
        } catch (e) {
          // Keep original content if not valid JSON
        }
      }
      
      pushLog(
        {
          ...ref,
          name: actionName,
          params,
          content: actionContent,
          data: undefined,
          processed: false,
        },
        el.done
      );
      break;
    }
  }
}
```

## Comprehensive Solution

### 1. Multi-Format Action Parser

Create `packages/core/src/parsers/action-parser.ts`:

```typescript
import { z } from 'zod';
import type { ActionCall, AnyAction } from '../types';
import { parseXMLContent } from '../xml';

interface ParsedAction {
  name: string;
  arguments: any;
  format: 'xml' | 'json' | 'custom';
}

export class ActionParser {
  /**
   * Detects and parses action calls in multiple formats
   */
  static parseActionCall(content: string, existingName?: string): ParsedAction {
    const trimmed = content.trim();
    
    // Try JSON function call format first
    if (trimmed.startsWith('{')) {
      const parsed = this.parseJSONFormat(trimmed);
      if (parsed) return parsed;
    }
    
    // Try XML format (for content within action_call tags)
    if (trimmed.startsWith('{') || trimmed.startsWith('<')) {
      const parsed = this.parseXMLFormat(trimmed);
      if (parsed) return parsed;
    }
    
    // Fallback: assume content is arguments for existing name
    if (existingName) {
      return {
        name: existingName,
        arguments: this.parseArguments(trimmed),
        format: 'custom'
      };
    }
    
    throw new Error('Unable to parse action call format');
  }
  
  private static parseJSONFormat(content: string): ParsedAction | null {
    try {
      const parsed = JSON.parse(content);
      
      // OpenAI function calling format
      if (parsed.name && (parsed.arguments || parsed.parameters)) {
        return {
          name: parsed.name,
          arguments: parsed.arguments || parsed.parameters,
          format: 'json'
        };
      }
      
      // Anthropic tool use format
      if (parsed.tool_name || parsed.function) {
        return {
          name: parsed.tool_name || parsed.function,
          arguments: parsed.input || parsed.arguments || {},
          format: 'json'
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  private static parseXMLFormat(content: string): ParsedAction | null {
    try {
      // For content that's already within action_call tags
      if (content.startsWith('{')) {
        return {
          name: '', // Will be filled from XML attributes
          arguments: JSON.parse(content),
          format: 'xml'
        };
      }
      
      // For nested XML content
      const parsed = parseXMLContent(content);
      return {
        name: '', // Will be filled from XML attributes
        arguments: parsed,
        format: 'xml'
      };
    } catch {
      return null;
    }
  }
  
  private static parseArguments(content: string): any {
    // Try JSON first
    try {
      return JSON.parse(content);
    } catch {}
    
    // Try key=value format
    if (content.includes('=')) {
      const args: Record<string, string> = {};
      const pairs = content.split(/[,\s]+/);
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          args[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
      }
      return args;
    }
    
    // Return as string
    return content;
  }
}
```

### 2. Update Action Resolution

```typescript
// In packages/core/src/handlers.ts:

export function parseActionCallContent({
  call,
  action,
}: {
  call: ActionCall;
  action: AnyAction;
}) {
  try {
    if (action.parser) {
      return action.parser(call);
    }
    
    // Use multi-format parser
    const parsed = ActionParser.parseActionCall(call.content, call.name);
    
    // Update call name if it was detected
    if (parsed.name && !call.name) {
      call.name = parsed.name;
    }
    
    // Return parsed arguments
    return parsed.arguments;
  } catch (error) {
    throw new ParsingError(call, error);
  }
}
```

### 3. Improve Prompt Clarity

Update `packages/core/src/prompts/main.ts` to show clear examples:

```typescript
const actionExamples = `
<action_examples>
<!-- XML Format (Preferred) -->
<action_call name="search">
{"query": "AI news", "limit": 10}
</action_call>

<!-- Also Acceptable JSON Format -->
<action_call>
{"name": "search", "arguments": {"query": "AI news", "limit": 10}}
</action_call>

<!-- DO NOT output raw JSON outside of tags -->
<!-- WRONG: {"name": "search", "arguments": {...}} -->
</action_examples>
`;
```

### 4. Add Model-Specific Configurations

```typescript
// In packages/core/src/configs.ts:

export const modelActionFormats: Record<string, 'xml' | 'json' | 'auto'> = {
  'gpt-4': 'auto',
  'gpt-3.5-turbo': 'json',
  'claude-3-opus': 'xml',
  'claude-3-sonnet': 'xml',
  // Models that tend to use function calling format
  'openai/*': 'json',
  'anthropic/*': 'xml',
};
```

## Testing the Fix

```typescript
// Test cases for action parser
describe('ActionParser', () => {
  it('parses OpenAI function format', () => {
    const content = '{"name":"search","arguments":{"query":"test"}}';
    const parsed = ActionParser.parseActionCall(content);
    expect(parsed.name).toBe('search');
    expect(parsed.arguments).toEqual({ query: 'test' });
  });
  
  it('parses XML content format', () => {
    const content = '{"query": "test"}';
    const parsed = ActionParser.parseActionCall(content, 'search');
    expect(parsed.name).toBe('search');
    expect(parsed.arguments).toEqual({ query: 'test' });
  });
  
  it('handles malformed JSON gracefully', () => {
    const content = 'search query=test';
    const parsed = ActionParser.parseActionCall(content, 'search');
    expect(parsed.arguments).toBe('search query=test');
  });
});
```

## Migration Steps

1. **Immediate**: Apply hot patch to handle JSON format
2. **Next Sprint**: Implement comprehensive ActionParser
3. **Following Sprint**: Update all prompts and model configs
4. **Long-term**: Add format auto-detection per model

## Prevention

1. **Clear Examples**: Show both XML and JSON formats in prompts
2. **Format Detection**: Auto-detect based on model and content
3. **Validation**: Validate action format before processing
4. **Logging**: Log format detection for debugging
5. **Graceful Fallback**: Try multiple formats before failing