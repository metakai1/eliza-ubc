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

## Abstract Class Structure
```mermaid
classDiagram
    class PropertyStorage {
        <<interface>>
        +initialize(runtime)
        +addProperty(property)
        +getProperty(id)
        +updateProperty(id, property)
        +deleteProperty(id)
        +searchByVector(vector, options)
        +searchByFilters(filters)
    }
    
    class BasePropertyStorage {
        <<abstract>>
        #runtime: AgentRuntime
        +initialize(runtime)
        +abstract addProperty(property)*
        +abstract getProperty(id)*
        +abstract updateProperty(id, property)*
        +abstract deleteProperty(id)*
        #validateProperty(property)
    }
    
    class MemoryPropertyStorage {
        -properties: Map
        -nextId: number
        +addProperty(property)
        +getProperty(id)
        +updateProperty(id, property)
        +deleteProperty(id)
    }
    
    PropertyStorage <|.. BasePropertyStorage : implements
    BasePropertyStorage <|-- MemoryPropertyStorage : extends
    
    note for BasePropertyStorage "Provides common functionality\nand enforces contract"
    note for MemoryPropertyStorage "Concrete implementation\nusing in-memory Map"
```

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

## Map Operations
```mermaid
graph TD
    subgraph Map Operations
        direction LR
        M[Map<string, PropertyData>]
        
        subgraph Add Property
            A1[Generate ID] --> A2[properties.set]
            A2 --> A3[Store Property]
        end
        
        subgraph Get Property
            G1[properties.get] --> G2{Found?}
            G2 -->|Yes| G3[Return Copy]
            G2 -->|No| G4[Throw Error]
        end
        
        subgraph Update Property
            U1[properties.has] --> U2{Exists?}
            U2 -->|Yes| U3[Validate] --> U4[properties.set]
            U2 -->|No| U5[Throw Error]
        end
        
        subgraph Delete Property
            D1[properties.delete] --> D2{Success?}
            D2 -->|Yes| D3[Done]
            D2 -->|No| D4[Throw Error]
        end
    end
    
    style M fill:#f9f,stroke:#333,stroke-width:4px
```

The Map in [MemoryPropertyStorage](cci:1://file:///home/kai/eliza/eliza/packages/plugin-spreadsheet/src/storage/memory-storage.ts:8:0-172:1) provides these key operations:

1. **Set**: `properties.set(id, property)`
   - Stores or updates a property with a given ID
   - Example: `properties.set("1", { id: "1", name: "Property 1" })`

2. **Get**: `properties.get(id)`
   - Retrieves a property by ID
   - Returns undefined if not found
   - Example: `properties.get("1")`

3. **Has**: `properties.has(id)`
   - Checks if a property exists
   - Example: `if (properties.has("1")) { ... }`

4. **Delete**: `properties.delete(id)`
   - Removes a property
   - Returns true if successful
   - Example: `properties.delete("1")`

5. **Entries**: `properties.entries()`
   - Gets all properties for iteration
   - Example: `Array.from(properties.entries())`

These diagrams show different aspects of the property storage system:

1. **Class Hierarchy**: Shows the inheritance and implementation relationships between classes
2. **Component Interaction**: Illustrates how the different components communicate during operations
3. **Runtime State Flow**: Shows the different states a PropertyStorageService instance can be in
4. **Data Flow**: Demonstrates how data moves through the system during a search operation
5. **Component Architecture**: Shows how the components fit into the larger system
6. **Initialization Flow**: Shows the initialization sequence from framework startup to ready state
7. **Abstract Class Structure**: Shows the relationship between the interface, abstract class, and concrete implementation
8. **Error Handling Flow**: Illustrates how errors are handled throughout the system
9. **Map Operations**: Shows the operations performed on the Map in MemoryPropertyStorage

Each diagram provides a different perspective on how the system works, making it easier to understand the overall architecture and individual component responsibilities.
