# Property Storage Architecture Diagrams

## Class Hierarchy
```mermaid
classDiagram
    Service <|-- PropertyStorageService
    PropertyStorage <|.. PropertyStorageService
    PropertyStorage <|.. BasePropertyStorage
    BasePropertyStorage <|-- MemoryPropertyStorage

    class Service {
        +ServiceType serviceType
        +initialize(runtime: AgentRuntime)
    }

    class PropertyStorage {
        <<interface>>
        +addProperty(property: PropertyData)
        +getProperty(id: string)
        +updateProperty(id: string, property: PropertyData)
        +deleteProperty(id: string)
        +searchByFilters(filters: FilterGroup)
        +searchByVector(vector: number[], options: SearchOptions)
    }

    class PropertyStorageService {
        -storage: BasePropertyStorage
        -runtime: AgentRuntime
        +initialize(runtime: AgentRuntime)
        +searchByFilters(filters: FilterGroup)
        +searchByVector(vector: number[], options: SearchOptions)
    }

    class BasePropertyStorage {
        <<abstract>>
        #runtime: AgentRuntime
        +initialize(runtime: AgentRuntime)
        +abstract searchByFilters(filters: FilterGroup)
        +abstract searchByVector(vector: number[], options: SearchOptions)
    }

    class MemoryPropertyStorage {
        -properties: Map<string, PropertyData>
        -nextId: number
        +addProperty(property: PropertyData)
        +getProperty(id: string)
        +searchByFilters(filters: FilterGroup)
    }
```

## Component Interaction
```mermaid
sequenceDiagram
    participant Client
    participant PropertyStorageService
    participant MemoryPropertyStorage
    participant AgentRuntime
    participant Knowledge

    Client->>PropertyStorageService: new(storage)
    PropertyStorageService->>MemoryPropertyStorage: new()
    Client->>PropertyStorageService: initialize(runtime)
    PropertyStorageService->>MemoryPropertyStorage: initialize(runtime)
    
    Client->>PropertyStorageService: searchByFilters(filters)
    PropertyStorageService->>MemoryPropertyStorage: searchByFilters(filters)
    MemoryPropertyStorage->>AgentRuntime: get knowledge
    AgentRuntime->>Knowledge: search
    Knowledge-->>MemoryPropertyStorage: results
    MemoryPropertyStorage-->>PropertyStorageService: filtered results
    PropertyStorageService-->>Client: search results
```

## Runtime State Flow
```mermaid
stateDiagram-v2
    [*] --> Constructed: new PropertyStorageService(storage)
    Constructed --> Initialized: initialize(runtime)
    Initialized --> Ready: runtime available
    Ready --> Searching: searchByFilters/Vector
    Searching --> Ready: results returned
    Ready --> Error: runtime missing
    Error --> Ready: reinitialize
    Ready --> [*]: shutdown
```

## Data Flow
```mermaid
flowchart TD
    Client[Client] --> |1. search request| PSS[PropertyStorageService]
    PSS --> |2. validate| Check{Check State}
    Check --> |3a. error| Error[Return Error]
    Check --> |3b. ok| MPS[MemoryPropertyStorage]
    MPS --> |4. query| RT[Runtime]
    RT --> |5. search| K[Knowledge System]
    K --> |6. results| MPS
    MPS --> |7. filter| Results[Filter Results]
    Results --> |8. format| PSS
    PSS --> |9. response| Client
```

## Component Architecture
```mermaid
graph TB
    subgraph Eliza Framework
        Service
        AgentRuntime
        Knowledge
    end

    subgraph Plugin Spreadsheet
        subgraph Services
            PropertyStorageService --> Service
            PropertyStorageService --> PropertyStorage
        end
        
        subgraph Storage
            BasePropertyStorage --> PropertyStorage
            MemoryPropertyStorage --> BasePropertyStorage
        end

        subgraph Types
            PropertyData
            SearchResult
            FilterGroup
        end
    end

    PropertyStorageService --> MemoryPropertyStorage
    MemoryPropertyStorage --> Knowledge
    PropertyStorageService --> AgentRuntime
```

## Initialization Flow
```mermaid
sequenceDiagram
    participant Eliza
    participant PSS as PropertyStorageService
    participant MPS as MemoryPropertyStorage
    
    Note over Eliza: Framework startup
    
    Eliza->>PSS: new PropertyStorageService(storage)
    PSS->>MPS: new MemoryPropertyStorage()
    Note over MPS: Constructs empty Map<br/>Sets nextId = 1
    
    Eliza->>PSS: initialize(runtime)
    Note over PSS: Logs initialization start
    PSS->>PSS: Store runtime
    PSS->>MPS: initialize(runtime)
    Note over MPS: Stores runtime<br/>Ready for operations
    Note over PSS: Logs initialization complete
    
    Note over PSS,MPS: System ready for operations
```

This diagram shows the initialization sequence from framework startup to ready state.

## Error Handling Flow
```mermaid
flowchart TD
    Start[Operation Start] --> Check{Check Runtime}
    Check --> |Missing| E1[Throw INTERNAL_ERROR]
    Check --> |Present| Next{Check Storage}
    Next --> |Missing| E2[Throw INTERNAL_ERROR]
    Next --> |Present| Op[Perform Operation]
    Op --> |Success| Return[Return Results]
    Op --> |Failure| E3[Log & Throw Error]
    E1 --> Log[Log Error]
    E2 --> Log
    E3 --> Log
    Log --> End[End Operation]
```

These diagrams show different aspects of the property storage system:

1. **Class Hierarchy**: Shows the inheritance and implementation relationships between classes
2. **Component Interaction**: Illustrates how the different components communicate during operations
3. **Runtime State Flow**: Shows the different states a PropertyStorageService instance can be in
4. **Data Flow**: Demonstrates how data moves through the system during a search operation
5. **Component Architecture**: Shows how the components fit into the larger system
6. **Initialization Flow**: Shows the initialization sequence from framework startup to ready state
7. **Error Handling Flow**: Illustrates how errors are handled throughout the system

Each diagram provides a different perspective on how the system works, making it easier to understand the overall architecture and individual component responsibilities.
