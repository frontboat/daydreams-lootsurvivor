# Error Handling & Recovery Implementation Tasks

## Overview

This document outlines the implementation tasks for improving error handling and
recovery in the Daydreams framework, addressing the issues identified in
CLAUDE.md.

## Phase 1: Foundation (Week 1-2)

### 1.1 Create Typed Error Classes

- [ ] Create `packages/core/src/errors/base.ts`

  - [ ] Define `DaydreamsError` base class extending Error
  - [ ] Add error codes enum (`ERROR_CODES`)
  - [ ] Include context information (contextId, step, timestamp)
  - [ ] Add serialization methods for persistence

- [ ] Create specific error classes in `packages/core/src/errors/`:
  - [ ] `LLMError` - For model-related failures
  - [ ] `ActionError` - For action execution failures
  - [ ] `ContextError` - For context state issues
  - [ ] `MemoryError` - For storage/retrieval failures
  - [ ] `NetworkError` - For connectivity issues
  - [ ] `ValidationError` - For schema/input validation
  - [ ] `TimeoutError` - For operation timeouts

### 1.2 Error Context and Metadata

- [ ] Add error metadata types in `packages/core/src/types.ts`:

  ```typescript
  interface ErrorMetadata {
    code: ERROR_CODES;
    contextId?: string;
    actionName?: string;
    attempt?: number;
    maxAttempts?: number;
    retryable: boolean;
    userMessage?: string;
    developerMessage?: string;
    timestamp: number;
    stackTrace?: string;
  }
  ```

- [ ] Create error factory functions:
  - [ ] `createLLMError()`
  - [ ] `createActionError()`
  - [ ] `createContextError()`

## Phase 2: Retry Mechanisms (Week 2-3)

### 2.1 Retry Configuration

- [ ] Add retry configuration to `packages/core/src/types.ts`:

  ```typescript
  interface RetryConfig {
    maxAttempts: number;
    backoffStrategy: "exponential" | "linear" | "fixed";
    initialDelay: number;
    maxDelay: number;
    retryableErrors: ERROR_CODES[];
  }
  ```

- [ ] Update `Config` type to include default retry settings
- [ ] Add per-action retry overrides
- [ ] Add per-model retry configuration

### 2.2 Implement Retry Logic

- [ ] Create `packages/core/src/retry/retry-manager.ts`:

  - [ ] `RetryManager` class with backoff strategies
  - [ ] Jitter for avoiding thundering herd
  - [ ] Circuit breaker pattern for repeated failures

- [ ] Update `packages/core/src/tasks/index.ts`:

  - [ ] Wrap `runGenerate` with retry logic
  - [ ] Add retry for rate limit errors (429)
  - [ ] Add retry for network timeouts
  - [ ] Implement exponential backoff for model calls

- [ ] Update `packages/core/src/handlers.ts`:
  - [ ] Add retry wrapper for action execution
  - [ ] Respect action-specific retry config
  - [ ] Track retry attempts in error metadata

### 2.3 LLM-Specific Retry Handling

- [ ] Create `packages/core/src/errors/llm-errors.ts`:
  - [ ] Rate limit detection and handling
  - [ ] Model-specific error parsing
  - [ ] Token limit exceeded handling
  - [ ] Context window management

## Phase 3: Error Recovery (Week 3-4)

### 3.1 State Recovery Mechanisms

- [ ] Create `packages/core/src/recovery/checkpoint.ts`:

  - [ ] `CheckpointManager` for saving execution state
  - [ ] Checkpoint creation before risky operations
  - [ ] State restoration from checkpoint

- [ ] Update `packages/core/src/engine.ts`:
  - [ ] Add checkpoint creation before each step
  - [ ] Implement rollback mechanism
  - [ ] Add state validation after recovery

### 3.2 Recovery Strategies

- [ ] Create `packages/core/src/recovery/strategies.ts`:

  - [ ] `RecoveryStrategy` interface
  - [ ] `SkipAndContinue` - Skip failed action
  - [ ] `RetryFromCheckpoint` - Restore and retry
  - [ ] `AlternativeAction` - Try different approach
  - [ ] `UserIntervention` - Ask user what to do

- [ ] Update `packages/core/src/context.ts`:
  - [ ] Add `onRecovery` hook to context
  - [ ] Store recovery history
  - [ ] Implement recovery state machine

### 3.3 Graceful Degradation

- [ ] Implement fallback mechanisms:
  - [ ] Fallback to simpler prompts on repeated failures
  - [ ] Reduce context size if token limit hit
  - [ ] Switch to different model on persistent errors
  - [ ] Cache successful responses for retry scenarios

## Phase 4: Error Aggregation & Reporting (Week 4-5)

### 4.1 Error Collection System

- [ ] Create `packages/core/src/errors/error-collector.ts`:

  - [ ] Centralized error collection
  - [ ] Error deduplication
  - [ ] Error categorization
  - [ ] Metrics aggregation

- [ ] Update engine to use error collector:
  - [ ] Replace `state.errors` array with collector
  - [ ] Add error correlation (group related errors)
  - [ ] Track error frequency and patterns

### 4.2 Error Reporting

- [ ] Create `packages/core/src/errors/error-reporter.ts`:

  - [ ] Error summary generation
  - [ ] Error report formatting (JSON, HTML, Markdown)
  - [ ] Integration points for external services

- [ ] Add error reporting methods to Agent:
  - [ ] `agent.getErrorReport()`
  - [ ] `agent.getErrorSummary()`
  - [ ] `agent.clearErrors()`

## Phase 5: Integration & Testing (Week 5-6)

### 5.1 Update Existing Code

- [ ] Refactor `packages/core/src/engine.ts`:

  - [ ] Replace try-catch blocks with typed errors
  - [ ] Integrate retry manager
  - [ ] Add recovery checkpoints

- [ ] Update all actions to use new error system:
  - [ ] Convert thrown errors to typed errors
  - [ ] Add retry configurations
  - [ ] Implement recovery strategies

### 5.2 Testing Infrastructure

- [ ] Create test utilities in `packages/core/src/__tests__/errors/`:

  - [ ] Error simulation helpers
  - [ ] Retry behavior tests
  - [ ] Recovery scenario tests
  - [ ] Error aggregation tests

- [ ] Add integration tests:
  - [ ] LLM failure scenarios
  - [ ] Action failure cascades
  - [ ] Recovery from checkpoints
  - [ ] Error reporting accuracy

### 5.3 Documentation

- [ ] Create error handling guide:

  - [ ] Error types and when they occur
  - [ ] Recovery strategies and configuration
  - [ ] Best practices for error handling
  - [ ] Debugging error scenarios

- [ ] Update API documentation:
  - [ ] Document all error classes
  - [ ] Add error handling examples
  - [ ] Migration guide for existing code

## Phase 6: Monitoring & Observability (Week 6)

### 6.1 Error Metrics

- [ ] Add error tracking to structured logger:
  - [ ] Error rate by type
  - [ ] Recovery success rate
  - [ ] Retry attempt distribution
  - [ ] Error resolution time

### 6.2 Alerts and Notifications

- [ ] Create alert system:
  - [ ] Critical error thresholds
  - [ ] Repeated failure detection
  - [ ] Recovery failure alerts
  - [ ] Performance degradation warnings

## Success Metrics

- [ ] 90% of transient errors automatically recovered
- [ ] Average error resolution time < 5 seconds
- [ ] Zero data loss during error recovery
- [ ] 50% reduction in error-related user reports

## Dependencies

- Current error handling code audit
- Agreement on error taxonomy
- Performance baseline measurements
- Testing environment setup

## Risks

- Breaking changes to existing error handling
- Performance overhead from checkpointing
- Complexity increase for developers
- Storage requirements for checkpoints
