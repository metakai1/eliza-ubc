# Plugin Spreadsheet Initialization Flow

## Overview
This document describes the proper initialization flow for the Plugin Spreadsheet package, specifically focusing on the PropertyStorage system.

## Initialization Chain

1. **Plugin Creation** (`index.ts`)
   ```typescript
   const storage = new MemoryPropertyStorage();
   const service = new PropertyStorageService(storage);
   ```
   - MemoryPropertyStorage constructor is called
   - PropertyStorageService is created with the storage instance

2. **Plugin Registration**
   - Plugin is registered with the Eliza runtime
   - Runtime calls initialize on the plugin
   - Plugin should initialize its services

3. **Service Initialization** (`services.ts`)
   ```typescript
   class PropertyStorageService {
     async initialize(runtime: IAgentRuntime) {
       // Should initialize the underlying storage
       await this.storage.initialize(runtime);
     }
   }
   ```
   - Service receives runtime during initialization
   - Service should pass runtime to storage layer

4. **Storage Initialization** (`memory-storage.ts`)
   ```typescript
   class MemoryPropertyStorage {
     initialize(runtime: AgentRuntime) {
       this.runtime = runtime;
       elizaLogger.info('MemoryPropertyStorage: Initializing with runtime', {
         hasRuntime: !!runtime,
         runtimeType: runtime?.constructor?.name,
         agentId: runtime?.agentId
       });
     }
   }
   ```
   - Storage receives and stores runtime reference
   - Ready for operations like search

## Common Issues

1. **Missing Runtime**
   - Symptom: `StorageError: Runtime not initialized`
   - Cause: Operations attempted before proper initialization chain completion
   - Fix: Ensure service.initialize() is called and propagates to storage layer

2. **Initialization Order**
   - The plugin must be fully initialized before any actions are handled
   - All search operations should check this.runtime exists before proceeding

## Best Practices

1. **Logging**
   - Use INFO level for initialization steps
   - Log runtime details during initialization for debugging
   - Log errors when runtime is missing

2. **Error Handling**
   - Use StorageErrorCode.INTERNAL_ERROR for initialization issues
   - Provide clear error messages indicating initialization state

3. **Runtime Validation**
   - Always check runtime exists before operations
   - Log detailed diagnostics when runtime is missing

## Verification
To verify proper initialization:
1. Check logs for "MemoryPropertyStorage: Constructor called"
2. Check logs for "MemoryPropertyStorage: Initializing with runtime"
3. Verify runtime details are logged (hasRuntime, runtimeType, agentId)
4. Test a simple search operation to confirm runtime is available
