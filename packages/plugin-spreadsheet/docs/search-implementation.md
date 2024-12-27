# Property Search Implementation Plan

## Overview
The property search system will consist of two main components:
1. **Filter-Based Search**: Exact matching and range queries on property attributes
2. **Semantic Search**: Finding properties based on natural language descriptions

## 1. Filter-Based Search

### Data Structure
```typescript
interface FilterOperator {
    eq?: any;      // Exact match
    gt?: number;   // Greater than
    gte?: number;  // Greater than or equal
    lt?: number;   // Less than
    lte?: number;  // Less than or equal
    contains?: string;  // String contains
    in?: any[];    // Value in array
}

interface PropertyFilter {
    field: keyof PropertyData;
    operator: FilterOperator;
}

interface FilterGroup {
    operator: 'AND' | 'OR';
    filters: (PropertyFilter | FilterGroup)[];
}
```

### Implementation Steps

1. **Create Filter Evaluator**
   ```typescript
   class FilterEvaluator {
       evaluateFilter(property: PropertyData, filter: PropertyFilter): boolean;
       evaluateFilterGroup(property: PropertyData, group: FilterGroup): boolean;
   }
   ```
   - Implement each operator type (eq, gt, lt, etc.)
   - Support nested filter groups
   - Add type checking for numeric vs string operations

2. **Add Index Support**
   ```typescript
   interface PropertyIndex {
       field: keyof PropertyData;
       type: 'numeric' | 'string' | 'boolean';
       values: Map<any, Set<string>>; // value -> Set of property IDs
   }
   ```
   - Create indexes for commonly filtered fields
   - Update indexes during CRUD operations
   - Use indexes to optimize filter evaluation

3. **Implement Filter Optimization**
   - Reorder filters to use indexed fields first
   - Combine overlapping range conditions
   - Short-circuit evaluation for AND/OR groups

## 2. Semantic Search

### Components

1. **Text Embedding**
   ```typescript
   interface TextEmbedding {
       vector: number[];
       dimension: number;
   }

   interface PropertyEmbeddings {
       description: TextEmbedding;
       combinedText: TextEmbedding;  // name + neighborhood + description
   }
   ```

2. **Vector Storage**
   ```typescript
   interface VectorIndex {
       vectors: Map<string, PropertyEmbeddings>;  // propertyId -> embeddings
       dimension: number;
   }
   ```

### Implementation Steps

1. **Text Processing**
   - Create text preprocessing pipeline
     - Remove stop words
     - Normalize text
     - Extract key terms
   - Generate combined text for each property
   - Cache processed text

2. **Vector Generation**
   ```typescript
   interface VectorGenerator {
       generateVector(text: string): Promise<number[]>;
       batchGenerateVectors(texts: string[]): Promise<number[][]>;
   }
   ```
   - Use OpenAI embeddings API
   - Implement batching for efficiency
   - Add caching for common queries

3. **Similarity Search**
   ```typescript
   interface SimilaritySearch {
       findSimilar(query: number[], count: number): Promise<SearchResult[]>;
       findSimilarByText(text: string, count: number): Promise<SearchResult[]>;
   }
   ```
   - Implement cosine similarity
   - Add approximate nearest neighbor search for large datasets
   - Support weighted combination of multiple embeddings

## Integration Plan

1. **Update MemoryPropertyStorage**
```typescript
class MemoryPropertyStorage {
    private properties: Map<string, PropertyData>;
    private filterEvaluator: FilterEvaluator;
    private vectorIndex: VectorIndex;
    private propertyIndexes: Map<string, PropertyIndex>;

    async searchProperties(options: SearchOptions): Promise<SearchResult[]> {
        const filterResults = await this.filterProperties(options.filters);
        const vectorResults = await this.vectorSearch(options.query);
        return this.combineResults(filterResults, vectorResults, options);
    }
}
```

2. **Update PropertyStorageService**
```typescript
class PropertyStorageService {
    async searchProperties(query: string, filters?: FilterGroup): Promise<SearchResult[]> {
        const searchOptions = await this.buildSearchOptions(query, filters);
        return this.storage.searchProperties(searchOptions);
    }
}
```

## Performance Considerations

1. **Memory Usage**
   - Implement vector quantization for embeddings
   - Use sparse indexes for low-cardinality fields
   - Add LRU cache for search results

2. **Search Speed**
   - Use approximate nearest neighbor search for vectors
   - Optimize filter evaluation order
   - Cache common query results

3. **Update Performance**
   - Batch index updates
   - Lazy vector generation
   - Background index maintenance

## Testing Strategy

1. **Unit Tests**
   - Filter evaluation
   - Vector similarity calculation
   - Index maintenance

2. **Integration Tests**
   - Combined filter and vector search
   - Large dataset performance
   - Memory usage patterns

3. **Performance Tests**
   - Search latency benchmarks
   - Memory usage monitoring
   - Index update performance

## Implementation Order

1. Basic Filter Search (1-2 days)
   - Implement FilterEvaluator
   - Add basic property indexes
   - Create filter optimization

2. Vector Search (2-3 days)
   - Add vector generation
   - Implement similarity search
   - Create vector indexes

3. Integration (1-2 days)
   - Combine filter and vector search
   - Add result ranking
   - Implement caching

4. Optimization (2-3 days)
   - Add performance monitoring
   - Optimize memory usage
   - Implement advanced indexing

## Dependencies Required

```json
{
    "@ai16z/eliza": "workspace:*",
    "cosine-similarity": "^1.0.0",
    "vector-quantize": "^1.0.0",
    "lru-cache": "^7.0.0"
}
```
