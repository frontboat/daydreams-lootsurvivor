# JSON Action Detection Fix

## Problem Fixed
The system was failing with `ACTION_MISMATCH` errors when LLMs output action calls in JSON function-calling format instead of the expected XML format.

## Changes Made

### 1. Updated `parseActionCallContent` in `handlers.ts`
- Added detection for JSON function call format: `{"name": "action", "arguments": {...}}`
- Extracts the action name from JSON and updates the call object
- Supports both `arguments` and `parameters` field names
- Falls back to normal parsing if JSON detection fails

### 2. Updated streaming handlers in `streaming.ts`
- Added JSON format detection in `streamHandler` for action_call elements
- Added JSON format detection in `__streamChunkHandler` for action_call elements
- Extracts action name from JSON content when XML name attribute is missing

### 3. Added comprehensive tests
- Created `action-parsing.test.ts` with test cases for:
  - JSON function call format parsing
  - Name extraction and call object updates
  - Fallback behavior for non-JSON content
  - Graceful handling of malformed JSON
  - Custom parser precedence

## How It Works

When an action call is processed:

1. **Before**: System expected `<action_call name="search">{"query": "test"}</action_call>`
2. **Now**: System also accepts `<action_call>{"name": "search", "arguments": {"query": "test"}}</action_call>`

The fix detects when:
- Content starts with `{` and contains `"name"`
- The JSON has a `name` field
- The call object's name is undefined

Then it:
- Extracts the arguments/parameters from the JSON
- Updates the call's name field
- Returns the parsed arguments

## Benefits

1. **Compatibility**: Works with multiple LLM output formats
2. **Backward Compatible**: Doesn't break existing XML format
3. **Graceful Fallback**: Continues with normal parsing if JSON detection fails
4. **No Breaking Changes**: Existing code continues to work

## Testing

Run tests with:
```bash
pnpm test packages/core/src/__tests__/action-parsing.test.ts
```

## Next Steps

This is a tactical fix. For a more comprehensive solution, consider:
1. Implementing the full `ActionParser` class from `ACTION_PARSING_FIX.md`
2. Adding model-specific format configurations
3. Updating prompts to show both acceptable formats
4. Adding format detection metrics for monitoring