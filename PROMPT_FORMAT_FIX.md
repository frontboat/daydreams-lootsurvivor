# Better Solution: Prompt Format Fix

## Root Cause
The `ACTION_MISMATCH` error occurs because LLMs are outputting function calling format instead of the expected XML format due to:

1. **Lack of concrete examples** in the prompt
2. **Abstract format description** that doesn't show exact usage
3. **LLM training bias** toward function calling format
4. **Insufficient format constraints** in the prompt

## Solution: Enhanced Prompt Clarity

### 1. Added Explicit Format Instructions
Updated `packages/core/src/prompts/main.ts` with:

```
IMPORTANT ACTION CALL FORMAT:
- Use XML format with name as attribute: <action_call name="actionName">{"arg": "value"}</action_call>
- DO NOT use function calling format: {"name": "actionName", "arguments": {...}}
- The action name goes in the XML attribute, not in the JSON content

Examples:
<action_call name="search">{"query": "AI news", "limit": 10}</action_call>
<action_call name="sendMessage">{"recipient": "user", "content": "Hello"}</action_call>
```

### 2. Enhanced Footer with Critical Rules
```
CRITICAL FORMATTING RULES: 
- Action calls: <action_call name="actionName">{"arguments": "here"}</action_call>
- Output calls: <output type="outputType">content here</output>
- DO NOT use function calling format like {"name": "action", "arguments": {...}}
- The action name MUST be in the XML attribute, NOT in the JSON content
```

### 3. Improved Assistant Message Prefill
- Changed from just `<response>` to `<response>\n<reasoning>`
- This guides the model toward the structured XML format immediately

## Why This Solution is Better

### 1. **Addresses Root Cause**
- Fixes the prompt ambiguity that caused the confusion
- Doesn't patch parsing logic (which was treating symptoms)

### 2. **Explicit Prevention**
- Directly tells the LLM NOT to use function calling format
- Shows exactly what TO do vs what NOT to do

### 3. **Concrete Examples**
- Provides actual working examples the LLM can follow
- Removes ambiguity about format expectations

### 4. **Backward Compatible**
- Doesn't change any existing code logic
- Only improves prompt clarity

### 5. **Model Agnostic**
- Works regardless of which LLM provider is used
- Doesn't require model-specific patches

## Expected Results

After this fix:
- **Before**: `{"name":"solana.token.analyzeToken","arguments":{...}}`
- **After**: `<action_call name="solana.token.analyzeToken">{...}</action_call>`

## Monitoring

To verify the fix is working:
1. Check logs for `ACTION_MISMATCH` errors (should decrease)
2. Monitor action parsing success rate
3. Look for properly formatted action calls in LLM responses

## Additional Enhancements (Optional)

If needed, we could also:
1. Add model-specific format instructions
2. Include more examples for complex action patterns
3. Add validation warnings during development
4. Create prompt testing utilities

This solution fixes the core issue: **the LLM didn't know what format to use**. Now it has crystal clear instructions and examples.