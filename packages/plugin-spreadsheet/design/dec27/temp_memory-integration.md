# Property Memory Integration Implementation

## Overview
This document outlines the implementation of memory integration for property data in the spreadsheet plugin. The goal is to store property information in Eliza's memory system, enabling semantic search and retrieval of property data.

## Implementation Details

### 1. Knowledge Item Structure
Property data is converted into a `KnowledgeItem` with the following structure:

```typescript
interface KnowledgeItem {
    id: string;          // UUID generated from property text
    content: {
        text: string;    // Formatted property description
        source: string;  // "property-data"
        metadata: {
            propertyId: string;
            propertyType: string;
            createdAt: string;
        }
    }
}
```

### 2. Text Format
Properties are converted to a standardized text format for embedding:
```
Property: [name]
Location: [neighborhood]
Type: [zoningType]
Size: [plotSize] ([buildingSize])
Floors: [minFloors]-[maxFloors]
Height: [minBuildingHeight]-[maxBuildingHeight] feet
Distance to Ocean: [oceanDistanceMeters]m
Distance to Bay: [bayDistanceMeters]m
Description: [description]
Price: [currentPrice] [currency]
```

### 3. Memory Storage Process
1. Convert `PropertyData` to formatted text
2. Generate document ID using `stringToUuid`
3. Create `KnowledgeItem` with property metadata
4. Store using `knowledge.set()`

### 4. Memory Retrieval Process
1. Create a query message with property-related text
2. Use `knowledge.get()` to retrieve relevant memories
3. Process and filter results based on metadata

## Testing
The implementation includes integration tests that:
1. Create a test property
2. Store it in the memory system
3. Retrieve it using a natural language query
4. Verify the retrieved data matches the original property

## Dependencies
- OpenAI API for text embeddings
- PostgreSQL database for memory storage
- Eliza core knowledge system

## Configuration
Required environment variables:
- `POSTGRES_URL`: Database connection string
- `OPENAI_API_KEY`: API key for embeddings
- `EMBEDDING_OPENAI_MODEL`: Set to 'text-embedding-3-small'

## Future Enhancements
1. Batch processing for multiple properties
2. Enhanced metadata for better filtering
3. Caching layer for frequently accessed properties
4. Custom embedding templates for different property types
