# Provider Runtime Operation

## Overview

Providers are core components in Eliza that inject dynamic context and real-time information into agent interactions. They serve as a bridge between the agent and various external systems, enabling access to data, state management, and contextual information.

## Runtime Architecture

```mermaid
sequenceDiagram
    participant R as Runtime
    participant P as Provider Pool
    participant I as Individual Provider
    participant S as State
    participant M as Message

    R->>P: getProviders(runtime, message, state)
    loop For each provider
        P->>I: provider.get(runtime, message, state)
        I->>S: Check State
        I->>M: Process Message
        I-->>P: Return Context
    end
    P-->>R: Concatenated Results
```

## Provider Lifecycle

### 1. Provider Registration

```typescript
// In plugin definition
const myPlugin: Plugin = {
    name: "my-plugin",
    providers: [myProvider],
    // ...other plugin properties
};
```

### 2. Runtime Integration

```typescript
// Core runtime provider handling
async function getProviders(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
) {
    const providerResults = await Promise.all(
        runtime.providers.map(async (provider) => {
            return await provider.get(runtime, message, state);
        })
    );
    
    return providerResults
        .filter(result => result != null && result !== "")
        .join("\n");
}
```

### 3. Provider Execution Flow

1. **Initialization**
   - Runtime loads registered providers
   - Each provider is initialized with runtime context

2. **Message Processing**
   - Runtime receives incoming message
   - Current state is gathered
   - Providers are called in parallel

3. **State Management**
   - Provider checks current state
   - Updates state if necessary
   - Returns modified state

4. **Context Generation**
   - Provider processes message and state
   - Generates contextual information
   - Returns formatted context string

## Provider Interface

```typescript
interface Provider {
    get: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ) => Promise<any>;
}
```

### Key Components

1. **Runtime Access**
   - Full access to runtime services
   - Database operations
   - Message management
   - Cache control

2. **Message Context**
   - Current message details
   - User information
   - Room/conversation context
   - Content analysis

3. **State Management**
   - Current operation state
   - Historical context
   - Operation flags
   - Temporary data storage

## Provider Types

### 1. State Providers
```typescript
const stateProvider: Provider = {
    get: async (runtime, message, state) => {
        // Manage and return operation state
        return {
            ...state,
            operationStatus: "active",
            lastUpdate: Date.now()
        };
    }
};
```

### 2. Data Providers
```typescript
const dataProvider: Provider = {
    get: async (runtime, message, state) => {
        // Fetch and return external data
        const data = await runtime.database.query({
            table: "user_data",
            userId: message.userId
        });
        return formatData(data);
    }
};
```

### 3. Context Providers
```typescript
const contextProvider: Provider = {
    get: async (runtime, message, state) => {
        // Generate contextual information
        const context = await runtime.messageManager.getRecentContext(message);
        return processContext(context);
    }
};
```

## Best Practices

### 1. State Handling
- Always check state before modifications
- Return modified state consistently
- Handle null/undefined states gracefully

### 2. Error Management
```typescript
const robustProvider: Provider = {
    get: async (runtime, message, state) => {
        try {
            // Provider operations
            return result;
        } catch (error) {
            runtime.logger.error("Provider error", error);
            return state; // Return unchanged state on error
        }
    }
};
```

### 3. Performance Optimization
- Use caching when appropriate
- Implement rate limiting
- Handle async operations efficiently
- Filter out empty results

### 4. Context Formation
- Format data consistently
- Provide clear, structured output
- Handle missing data gracefully
- Maintain context relevance

## Runtime Considerations

1. **Parallel Execution**
   - Providers run concurrently
   - Results are aggregated
   - Empty results are filtered
   - Final context is concatenated

2. **State Consistency**
   - State updates are sequential
   - Last provider wins in conflicts
   - State is preserved across calls

3. **Error Handling**
   - Individual provider failures don't block others
   - System continues with available results
   - Errors are logged but not propagated

4. **Resource Management**
   - Providers should be lightweight
   - Heavy operations should be cached
   - Resources should be released properly

## Provider Implementation Template

```typescript
import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

interface CustomState extends State {
    customData?: any;
}

const customProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: CustomState
    ) => {
        // 1. Log operation start
        runtime.logger.debug("Custom provider started", {
            messageId: message.id
        });

        try {
            // 2. Check/initialize state
            const currentState = state || {};

            // 3. Process message
            const processedData = await processMessage(message);

            // 4. Update state
            const newState = {
                ...currentState,
                customData: processedData
            };

            // 5. Generate context
            const context = formatContext(processedData);

            // 6. Return result
            return {
                state: newState,
                context: context
            };

        } catch (error) {
            // 7. Handle errors
            runtime.logger.error("Custom provider error", error);
            return state;
        }
    }
};
```

This document outlines the core operation of providers in the Eliza runtime system. Providers are essential for maintaining state, providing context, and integrating external data into the agent's operation flow.
