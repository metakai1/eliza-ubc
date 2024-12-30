# Save Memory Component Flow

This document illustrates the exact flow of how our save memory components interact with the Eliza runtime.

## Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant R as Runtime
    participant P as Provider
    participant E as Evaluators
    participant L as LLM
    participant A as Actions

    Note over U: "Tell me about real estate"
    U->>R: Message

    %% Provider Stage
    R->>P: Call provider.get()
    Note over P: Check for save commands<br/>Return state unchanged
    P-->>R: Return state (adds context)

    %% Parallel Evaluator Stage
    par Parallel Evaluator Validation
        R->>E: saveMemoryEvaluator.validate()
        Note over E: Check for save_memory<br/>in message
        E-->>R: resolve(false)
    end

    %% LLM Stage
    R->>L: Generate response with context
    Note over L: Generate text and<br/>choose action (e.g., CONTINUE)
    L-->>R: {text, action: "CONTINUE"}

    %% Action Processing Stage
    R->>A: Process action "CONTINUE"
    Note over A: saveMemoryAction not called<br/>(action doesn't match)
    A-->>R: Complete

    R-->>U: LLM Response

    Note over U,R: Later: User says "save this"

    U->>R: "save this"
    R->>P: Call provider.get()
    Note over P: Detect save command<br/>Set state.shouldSave = true
    P-->>R: Return modified state

    par Parallel Evaluator Validation
        R->>E: saveMemoryEvaluator.validate()
        Note over E: Detect save command
        E-->>R: resolve(true)
    end

    R->>L: Generate response with<br/>evaluator context
    Note over L: Choose evaluator and<br/>set action: "SAVE_MEMORY"
    L-->>R: {text, action: "SAVE_MEMORY"}

    R->>A: Process action "SAVE_MEMORY"
    Note over A: saveMemoryAction.validate()<br/>saveMemoryAction.handler()
    A-->>R: Complete

    R-->>U: "I've saved that for you"
```

## Key Points

1. **Initial Flow (Real Estate Question)**
   - Provider checks message → no save command → state unchanged
   - Evaluator validates → false → not included in LLM context
   - LLM generates normal response
   - Action doesn't match our save action → not called

2. **Save Command Flow**
   - Provider detects save command → sets state.shouldSave
   - Evaluator validates → true → included in LLM context
   - LLM sees evaluator context → can choose SAVE_MEMORY action
   - Action matches → handler processes save with state.shouldSave = true

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> Initial
    Initial --> NoSave: No save command
    Initial --> SaveRequested: "save this"
    
    NoSave --> LLMResponse: Normal flow
    
    SaveRequested --> EvaluatorValidated: Evaluator true
    EvaluatorValidated --> ActionTriggered: LLM chooses SAVE_MEMORY
    ActionTriggered --> Saved: Handler processes
    
    LLMResponse --> [*]
    Saved --> [*]
```

## Component Responsibilities

1. **Provider**
   - First to see message
   - Sets up state for potential save
   - Adds context for LLM

2. **Evaluator**
   - Validates save intent
   - Adds save context for LLM
   - Influences LLM's action choice

3. **Action**
   - Performs actual save operation
   - Uses state set by provider
   - Only runs if LLM chooses it

4. **LLM**
   - Makes final decision on action
   - Uses context from provider and evaluator
   - Controls action triggering
