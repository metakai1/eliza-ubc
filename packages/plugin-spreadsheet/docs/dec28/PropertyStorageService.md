# PropertyStorageService Documentation

## Overview

Hi! I'm the PropertyStorageService. I'm a service class that manages property storage in the spreadsheet plugin. I act as a middleman between the Eliza runtime and the actual storage implementation. Think of me as a manager - I don't do the actual storage work myself, but I make sure everything runs smoothly.

## My Family Tree

I come from a distinguished lineage:
- I extend the `Service` class from Eliza
- I implement the `PropertyStorage` interface
- I work closely with my friend `BasePropertyStorage` who does the actual storage work

## My Components

### State
I maintain two important pieces of state:
```typescript
private storage: BasePropertyStorage;  // My storage implementation
private runtime: AgentRuntime | null = null;  // My connection to the Eliza runtime
```

### Identity
I identify myself to the Eliza system using:
```typescript
readonly type = ServiceType.PROPERTY_STORAGE;
static override get serviceType(): ServiceType {
    return ServiceType.PROPERTY_STORAGE;
}
```

## My Life Cycle

### Birth (Construction)
When I'm created, I need a storage implementation:
```typescript
constructor(storage: BasePropertyStorage) {
    super();  // First, I initialize my Service parent
    this.storage = storage;  // Then I store my storage helper
}
```

### Initialization
Before I can do real work, I need to be initialized with a runtime:
```typescript
async initialize(runtime: AgentRuntime): Promise<void> {
    await this.storage.initialize(runtime);
}
```

## My Main Responsibilities

### Searching Properties
I handle two types of searches:

1. Filter-based Search:
```typescript
async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
    // I do extensive logging to help with debugging
    // I check that I'm properly initialized
    // I delegate the actual search to my storage implementation
    // I format and return the results
}
```

2. Vector-based Search:
```typescript
async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
    // Similar pattern to filter search
    // But using vector similarity instead
}
```

### Error Handling
I take error handling seriously:
- I check for initialization before operations
- I wrap storage errors with detailed logging
- I maintain proper error context for debugging

## How I Help Debug Issues

I use extensive logging to help developers understand what's happening:
```typescript
elizaLogger.debug('PropertyStorageService.searchByFilters called', {
    hasRuntime: !!this.runtime,
    hasStorage: !!this.storage,
    operator: filters.operator,
    filterCount: filters.filters?.length
});
```

## Best Practices When Working With Me

1. **Initialization**: Always initialize me before using my methods
   ```typescript
   const service = new PropertyStorageService(storage);
   await service.initialize(runtime);
   ```

2. **Error Handling**: Watch for my error messages - they're designed to help you understand what went wrong

3. **Logging**: I provide detailed logs at different levels:
   - DEBUG: For detailed operation tracking
   - INFO: For normal operation status
   - ERROR: For issues that need attention

## Common Issues

1. "Runtime not initialized"
   - Make sure you've called `initialize()` before using my methods
   - Check that the runtime was properly passed to me

2. "Storage not initialized"
   - Verify that the storage implementation was properly created
   - Make sure the storage was initialized with the runtime

## Future Improvements

1. Add more detailed error context
2. Implement caching for frequent searches
3. Add metrics for performance monitoring

Remember: I'm here to make property storage easy and reliable. Let me handle the complexity of storage management while you focus on your application logic!
