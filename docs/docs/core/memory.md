# Memory Management System Documentation

## Overview
The `memory.ts` module provides a robust memory management system for the Eliza agent runtime. It implements the `IMemoryManager` interface and handles the storage, retrieval, and manipulation of memories in a database system.

## Key Components

### MemoryManager Class
The primary class that manages all memory-related operations. It provides an interface between the agent runtime and the underlying database.

#### Constructor
```typescript
constructor(opts: { tableName: string; runtime: IAgentRuntime })
```
- `tableName`: Name of the database table where memories are stored
- `runtime`: Instance of the agent runtime system

#### Properties
- `runtime`: The AgentRuntime instance associated with this manager
- `tableName`: The name of the database table this manager operates on

### Core Operations

#### Memory Creation and Storage
```typescript
async createMemory(memory: Memory, unique = false): Promise<void>
```
Creates a new memory in the database. If `unique` is true, it checks for similarity before insertion to avoid duplicates.

#### Memory Retrieval
Several methods are available for retrieving memories:

1. **Basic Retrieval**
```typescript
async getMemories({
    roomId,
    count = 10,
    unique = true,
    start,
    end
}): Promise<Memory[]>
```
Retrieves memories for a specific room with pagination support.

2. **Embedding-based Search**
```typescript
async searchMemoriesByEmbedding(
    embedding: number[],
    opts: {
        match_threshold?: number;
        count?: number;
        roomId: UUID;
        unique?: boolean;
    }
): Promise<Memory[]>
```
Searches for memories similar to a given embedding vector, useful for semantic search.

3. **Specific Memory Retrieval**
```typescript
async getMemoryById(id: UUID): Promise<Memory | null>
```
Retrieves a specific memory by its ID.

#### Memory Management

1. **Embedding Generation**
```typescript
async addEmbeddingToMemory(memory: Memory): Promise<Memory>
```
Adds an embedding vector to a memory object if one doesn't exist. The embedding is generated from the memory's text content.

2. **Memory Removal**
```typescript
async removeMemory(memoryId: UUID): Promise<void>
async removeAllMemories(roomId: UUID): Promise<void>
```
Methods for removing individual memories or all memories associated with a room.

3. **Memory Statistics**
```typescript
async countMemories(roomId: UUID, unique = true): Promise<number>
```
Counts the number of memories associated with a room.

### Advanced Features

#### Cached Embeddings
```typescript
async getCachedEmbeddings(content: string): Promise<{
    embedding: number[];
    levenshtein_score: number;
}[]>
```
Retrieves cached embeddings for similar content, optimizing performance by reducing redundant embedding generation.

## Memory Management System Components

The memory system in Eliza consists of three main components that work together:

#### 1. MemoryManager (Base Layer)
The foundational layer that provides basic memory operations:
- Memory storage and retrieval
- Embedding generation and vector search
- Memory lifecycle management

#### 2. DocumentsManager
A specialized MemoryManager instance that handles complete documents:
```typescript
documentsManager = new MemoryManager({
    runtime: this,
    tableName: "documents"
});
```

Key responsibilities:
- Stores complete, unmodified documents
- Maintains document metadata
- Serves as the source of truth for document content
- Manages document versioning and tracking
- Stores documents in their original form before chunking

Implementation details:
- Uses the "documents" table for storage
- Maintains references used by the KnowledgeManager
- Stores complete documents with their original structure
- Handles document-level operations (create, retrieve, delete)

#### 3. KnowledgeManager
A specialized MemoryManager that works with document fragments:
```typescript
knowledgeManager = new MemoryManager({
    runtime: this,
    tableName: "fragments"
});
```

Key responsibilities:
- Stores processed document fragments
- Manages embeddings for semantic search
- Handles fragment retrieval and matching
- Maintains links to source documents

### Document Processing Flow

1. **Document Ingestion**
```typescript
// Store original document
await documentsManager.createMemory({
    id: documentId,
    content: originalContent,
    embedding: zeroVector
});

// Process and store fragments
const fragments = await splitChunks(content, chunkSize, bleed);
for (const fragment of fragments) {
    await knowledgeManager.createMemory({
        id: fragmentId,
        content: {
            source: documentId,
            text: fragment
        },
        embedding: fragmentEmbedding
    });
}
```

2. **Knowledge Retrieval**
```typescript
// Search for relevant fragments
const fragments = await knowledgeManager.searchMemoriesByEmbedding(
    queryEmbedding,
    {
        count: 5,
        match_threshold: 0.1
    }
);

// Retrieve original documents
const documents = await Promise.all(
    fragments.map(f => documentsManager.getMemoryById(f.content.source))
);
```

### System Benefits

1. **Document Integrity**
- Original documents preserved in DocumentsManager
- Fragments optimized for retrieval in KnowledgeManager
- Clear traceability between fragments and sources

2. **Efficient Retrieval**
- Fast semantic search through fragments
- Easy access to original context
- Optimized storage and retrieval patterns

3. **Flexible Architecture**
- Separation of concerns between managers
- Easy to extend or modify each component
- Clear data flow and responsibility boundaries

### Usage Guidelines

1. **Document Storage**
- Use DocumentsManager for storing complete documents
- Maintain proper metadata and references
- Ensure document IDs are properly tracked

2. **Fragment Management**
- Configure appropriate chunk sizes for your use case
- Monitor fragment quality and relevance
- Maintain proper source references

3. **System Integration**
- Initialize both managers at runtime
- Handle errors and edge cases appropriately
- Implement proper cleanup and maintenance

## Memory Manager Architecture

### MemoryManager Class In-Depth
The `MemoryManager` class is the foundational component of Eliza's memory system. It implements the `IMemoryManager` interface and provides a comprehensive set of operations for managing memories in the database.

#### Design Philosophy
The MemoryManager follows these key principles:
1. **Single Responsibility**: Each instance manages memories for a specific table
2. **Runtime Integration**: Tightly integrated with the AgentRuntime for access to database and embedding services
3. **Atomic Operations**: Each memory operation is atomic and self-contained
4. **Error Resilience**: Includes fallback mechanisms and robust error handling

#### Key Components

1. **Runtime Integration**
```typescript
runtime: IAgentRuntime;
```
- Provides access to the database adapter
- Handles embedding generation
- Manages agent-specific configurations

2. **Table Management**
```typescript
tableName: string;
```
- Each manager instance operates on a single table
- Enables separation of different types of memories
- Supports multiple memory spaces per agent

#### Implementation Details

1. **Memory Storage**
- Uses the database adapter for persistent storage
- Supports both raw text and vector embeddings
- Maintains metadata including creation time and ownership

2. **Vector Search**
- Implements similarity-based memory retrieval
- Uses configurable match thresholds
- Supports both exact and fuzzy matching

3. **Memory Lifecycle**
- Handles memory creation, retrieval, and deletion
- Manages memory updates and modifications
- Implements memory cleanup and maintenance

### Knowledge Management Layer

The Knowledge Management system builds on top of the MemoryManager to provide higher-level knowledge operations. It consists of two main components:

#### 1. KnowledgeManager
The KnowledgeManager is a specialized implementation of MemoryManager that:
- Handles document-level knowledge storage
- Manages knowledge retrieval and querying
- Implements knowledge-specific preprocessing

#### 2. DocumentsManager
Works alongside KnowledgeManager to:
- Store complete documents
- Manage document metadata
- Handle document versioning

#### Knowledge Operations

1. **Knowledge Storage**
```typescript
async set(runtime: AgentRuntime, item: KnowledgeItem, chunkSize: number = 512, bleed: number = 20)
```
- Stores knowledge items in the database
- Chunks large documents for efficient retrieval
- Maintains relationships between fragments and source documents

2. **Knowledge Retrieval**
```typescript
async get(runtime: AgentRuntime, message: Memory): Promise<KnowledgeItem[]>
```
- Performs semantic search using embeddings
- Returns relevant knowledge items
- Handles preprocessing and validation

3. **Text Preprocessing**
```typescript
function preprocess(content: string): string
```
- Cleans and normalizes text content
- Removes unnecessary formatting
- Optimizes text for embedding generation

#### Architecture Benefits

1. **Layered Abstraction**
- MemoryManager handles low-level memory operations
- KnowledgeManager adds document-level operations
- Clear separation of concerns

2. **Flexible Integration**
- Supports multiple knowledge sources
- Extensible for different types of knowledge
- Configurable for different use cases

3. **Performance Optimization**
- Efficient chunking for large documents
- Cached embeddings for frequent queries
- Optimized search algorithms

## Usage Examples

### Basic Memory Operations
```typescript
// Create a new memory
await memoryManager.createMemory({
    id: uuid(),
    content: { text: "Important information" },
    roomId: agentId
});

// Retrieve memories
const memories = await memoryManager.getMemories({
    roomId: agentId,
    count: 10
});
```

### Knowledge Operations
```typescript
// Store knowledge
await knowledgeManager.set(runtime, {
    id: documentId,
    content: { text: documentContent }
});

// Query knowledge
const relevantKnowledge = await knowledgeManager.get(runtime, queryMemory);
```

## Best Practices

1. **Memory Management**
- Use appropriate table names for different memory types
- Implement regular memory cleanup
- Monitor memory usage and performance

2. **Knowledge Organization**
- Structure documents for optimal chunking
- Use meaningful document IDs
- Maintain clear source references

3. **Error Handling**
- Implement proper error recovery
- Log important operations
- Validate inputs and outputs

## Configuration Constants

- `defaultMatchThreshold`: 0.1 - Default similarity threshold for memory matching
- `defaultMatchCount`: 10 - Default number of memories to retrieve in search operations

## Error Handling
The system includes robust error handling:
- Throws errors for empty memory content during embedding generation
- Falls back to zero vector if embedding generation fails
- Returns null for memory retrieval when agent IDs don't match

## Dependencies
- `embedding.ts`: Provides embedding generation functionality
- `logger.ts`: Handles logging operations
- `types.ts`: Contains interface definitions
