# 2. Storage Abstraction

## Interface Design

```typescript
interface PropertyStorage {
    // Core operations
    addProperty(property: PropertyData): Promise<string>;
    getProperty(id: string): Promise<PropertyData>;
    updateProperty(id: string, property: PropertyData): Promise<void>;
    deleteProperty(id: string): Promise<void>;

    // Search operations
    searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]>;
    searchByFilters(filters: FilterGroup): Promise<SearchResult[]>;
    
    // Batch operations
    bulkLoad(properties: PropertyData[]): Promise<void>;
}
```

## Implementations

### 1. Local Storage
```typescript
class ElizaMemoryStorage implements PropertyStorage {
    private properties: Map<string, PropertyData & { vector: number[] }>;
    
    async searchByVector(vector: number[], options: SearchOptions) {
        return Array.from(this.properties.values())
            .map(prop => ({
                property: prop,
                similarity: cosineSimilarity(vector, prop.vector)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, options.limit);
    }
}
```

### 2. Cloud Storage
```typescript
class CloudPropertyStorage implements PropertyStorage {
    constructor(private apiClient: RealEstateAPI) {}
    
    async searchByVector(vector: number[], options: SearchOptions) {
        return this.apiClient.searchSimilar({
            vector,
            limit: options.limit,
            threshold: options.threshold
        });
    }
}
```

### 3. Hybrid Storage
```typescript
class HybridStorage implements PropertyStorage {
    constructor(
        private local: ElizaMemoryStorage,
        private cloud: CloudPropertyStorage,
        private options: {
            writeToCloud: boolean,
            readPreference: 'local' | 'cloud' | 'both'
        }
    ) {}
}
```

## Data Models

```typescript
interface PropertyData {
    id: string;
    name: string;
    neighborhood: string;
    zoningType: string;
    plotSize: string;
    buildingSize: string;
    maxFloors: number;
    minFloors: number;
    plotArea: number;
    maxBuildingHeight: number;
    minBuildingHeight: number;
    oceanDistanceMeters: number;
    bayDistanceMeters: number;
    description: string;
    nft?: NFTMetadata;
    market?: MarketStatus;
}

interface SearchOptions {
    limit: number;
    threshold: number;
    includeMetadata: boolean;
}

interface FilterGroup {
    operator: 'AND' | 'OR';
    filters: (MetadataFilter | FilterGroup)[];
}
```

## Implementation Strategy

### Phase 1: Basic Storage
1. Define interfaces
2. Implement local storage
3. Add basic search

### Phase 2: Enhanced Search
1. Add vector search
2. Implement filters
3. Add batch operations

### Phase 3: Cloud Integration
1. Implement cloud storage
2. Add hybrid options
3. Add caching

## Performance Considerations

1. **Local Storage**
   - In-memory operations
   - Vector calculations
   - Result caching

2. **Cloud Storage**
   - Connection pooling
   - Request batching
   - Response caching

3. **Hybrid Storage**
   - Cache synchronization
   - Write strategies
   - Read preferences
