# UnrealAgent2 - Storage Design

## Storage Interface

### Core Interface
```typescript
interface PropertyStorage {
    // Core operations
    get(id: string): Promise<PropertyData | null>;
    set(property: PropertyData): Promise<void>;
    delete(id: string): Promise<void>;
    
    // Search operations
    searchByEmbedding(query: string, options: SearchOptions): Promise<SearchResult[]>;
    searchByFilter(filter: FilterCriteria): Promise<SearchResult[]>;
    
    // Batch operations
    bulkSet(properties: PropertyData[]): Promise<void>;
    bulkGet(ids: string[]): Promise<Map<string, PropertyData>>;
}
```

### Data Models

```typescript
interface PropertyData {
    id: string;
    content: string;
    metadata: PropertyMetadata;
    embedding?: number[];
}

interface PropertyMetadata {
    type: 'property' | 'listing' | 'sale';
    createdAt: Date;
    updatedAt: Date;
    version: number;
    tags: string[];
    custom: Record<string, any>;
}

interface SearchOptions {
    limit?: number;
    offset?: number;
    includeEmbeddings?: boolean;
    minSimilarity?: number;
    orderBy?: 'similarity' | 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
}

interface SearchResult {
    property: PropertyData;
    similarity?: number;
    score?: number;
}

interface FilterCriteria {
    metadata?: Partial<PropertyMetadata>;
    tags?: string[];
    custom?: Record<string, any>;
    dateRange?: {
        start?: Date;
        end?: Date;
        field: 'createdAt' | 'updatedAt';
    };
}
```

## Implementation Strategy

### 1. PostgreSQL Implementation
```typescript
class PostgresPropertyStorage implements PropertyStorage {
    constructor(private db: PostgresDatabaseAdapter) {}

    async searchByEmbedding(query: string, options: SearchOptions): Promise<SearchResult[]> {
        const embedding = await embed(query);
        return this.db.queryVectorSimilarity(embedding, options);
    }
}
```

### 2. In-Memory Implementation (for Testing)
```typescript
class InMemoryPropertyStorage implements PropertyStorage {
    private store: Map<string, PropertyData> = new Map();

    async searchByEmbedding(query: string, options: SearchOptions): Promise<SearchResult[]> {
        const embedding = await embed(query);
        return Array.from(this.store.values())
            .map(property => ({
                property,
                similarity: cosineSimilarity(embedding, property.embedding!)
            }))
            .sort((a, b) => b.similarity! - a.similarity!)
            .slice(0, options.limit);
    }
}
```

## Migration Plan

1. **Phase 1: Basic Interface**
   - Implement core CRUD operations
   - Add basic search functionality
   - Create in-memory implementation

2. **Phase 2: Advanced Features**
   - Add batch operations
   - Implement filtering
   - Add sorting options

3. **Phase 3: Optimization**
   - Add caching layer
   - Implement connection pooling
   - Add query optimization

## Testing Strategy

1. **Unit Tests**
   - Test each operation independently
   - Verify error handling
   - Test edge cases

2. **Integration Tests**
   - Test with real database
   - Verify search accuracy
   - Test performance

3. **Performance Tests**
   - Measure operation latency
   - Test with large datasets
   - Verify memory usage
