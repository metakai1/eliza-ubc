# Storage Abstraction Design

## Core Interfaces

```typescript
// Base interface for all property operations
interface PropertyStorage {
    // Basic CRUD
    addProperty(property: PropertyData): Promise<string>;  // Returns ID
    getProperty(id: string): Promise<PropertyData>;
    updateProperty(id: string, property: PropertyData): Promise<void>;
    deleteProperty(id: string): Promise<void>;

    // Search operations
    searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]>;
    searchByFilters(filters: FilterGroup): Promise<SearchResult[]>;
    
    // Batch operations
    bulkLoad(properties: PropertyData[]): Promise<void>;
}

// Current in-memory implementation
class ElizaMemoryStorage implements PropertyStorage {
    private properties: Map<string, PropertyData & { vector: number[] }>;
    
    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        // Current Eliza implementation
        return Array.from(this.properties.values())
            .map(prop => ({
                property: prop,
                similarity: cosineSimilarity(vector, prop.vector)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, options.limit);
    }
    
    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        // Current filter implementation
        return Array.from(this.properties.values())
            .filter(prop => applyFilterGroup(prop, filters));
    }
}

// Future cloud implementation
class CloudPropertyStorage implements PropertyStorage {
    constructor(private apiClient: RealEstateAPI) {}
    
    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return this.apiClient.searchSimilar({
            vector,
            limit: options.limit,
            threshold: options.threshold
        });
    }
    
    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        return this.apiClient.queryProperties(filters);
    }
}
```

## Plugin Using Abstraction

```typescript
export const spreadsheetPlugin: Plugin = {
    name: "spreadsheet",
    description: "Load and query spreadsheet data using semantic search",
    actions: [
        {
            name: "load-spreadsheet",
            handler: async (runtime: AgentRuntime, params) => {
                // Get storage implementation from runtime
                const storage = runtime.getPropertyStorage();
                
                // Parse and load data
                const properties = parseCSV(params.content);
                await storage.bulkLoad(properties);
            }
        },
        {
            name: "query-spreadsheet",
            handler: async (runtime: AgentRuntime, params) => {
                const storage = runtime.getPropertyStorage();
                
                // 1. Get query vector
                const queryVector = await runtime.getEmbedding(params.query);
                
                // 2. Get filter structure
                const filters = await parseQueryToFilters(runtime, params.query);
                
                // 3. Search in two stages
                const vectorMatches = await storage.searchByVector(queryVector, {
                    limit: params.limit * 3,
                    threshold: 0.6
                });
                
                const filteredResults = await storage.searchByFilters(filters);
                
                // 4. Combine and rank results
                return rankResults(vectorMatches, filteredResults);
            }
        }
    ]
};
```

## Runtime Configuration

```typescript
// In Eliza's runtime configuration
interface AgentRuntime {
    // Add storage factory method
    getPropertyStorage(): PropertyStorage;
}

// Configure storage implementation
const runtime = new AgentRuntime({
    propertyStorage: process.env.STORAGE_TYPE === 'cloud'
        ? new CloudPropertyStorage(new RealEstateAPI(apiKey))
        : new ElizaMemoryStorage()
});
```

## Benefits of This Design

1. **Separation of Concerns** 🎯
   - Storage logic separate from search logic
   - Easy to test different implementations
   - Clean interface boundaries

2. **Future Flexibility** 🔄
   - Can add new storage backends
   - Switch implementations without changing plugin
   - Support multiple storage types

3. **Gradual Migration Path** 📈
   ```typescript
   // Could even do hybrid storage
   class HybridStorage implements PropertyStorage {
       constructor(
           private local: ElizaMemoryStorage,
           private cloud: CloudPropertyStorage,
           private options: {
               writeToCloud: boolean,
               readPreference: 'local' | 'cloud' | 'both'
           }
       ) {}
       
       async searchByVector(vector: number[], options: SearchOptions) {
           if (this.options.readPreference === 'both') {
               // Merge results from both sources
               const [localResults, cloudResults] = await Promise.all([
                   this.local.searchByVector(vector, options),
                   this.cloud.searchByVector(vector, options)
               ]);
               return mergeResults(localResults, cloudResults);
           }
           // Use preferred storage
           return this.options.readPreference === 'local'
               ? this.local.searchByVector(vector, options)
               : this.cloud.searchByVector(vector, options);
       }
   }
   ```

4. **Easy Testing** 🧪
   ```typescript
   // Can create mock storage for tests
   class MockPropertyStorage implements PropertyStorage {
       async searchByVector() {
           return TEST_RESULTS;
       }
       // ... other methods
   }
   ```

## Implementation Strategy

1. **Phase 1: Interface Definition**
   - Define core interfaces
   - Document expected behaviors
   - Create basic tests

2. **Phase 2: Current Implementation**
   - Wrap current code in ElizaMemoryStorage
   - Ensure all tests pass
   - No functionality changes

3. **Phase 3: New Features**
   - Add cloud implementation
   - Add configuration options
   - Maintain backward compatibility

4. **Phase 4: Optimization**
   - Add caching layer
   - Implement hybrid storage
   - Performance tuning

This design maintains all current functionality while making it easy to add cloud storage or other implementations in the future.
