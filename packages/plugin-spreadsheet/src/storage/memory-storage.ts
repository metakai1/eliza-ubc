import { PropertyData, SearchOptions, SearchResult, FilterGroup, StorageError, StorageErrorCode, MetadataFilter } from '../types';
import { BasePropertyStorage } from '../storage';
import { knowledge, elizaLogger, IAgentRuntime, Memory } from '@ai16z/eliza';

/**
 * In-memory implementation of PropertyStorage
 */
export class MemoryPropertyStorage extends BasePropertyStorage {
    private properties: Map<string, PropertyData> = new Map();
    private nextId: number = 1;

    constructor(private runtime: IAgentRuntime) {
        super();
    }

    async addProperty(property: PropertyData): Promise<string> {
        this.validateProperty(property);
        const id = String(this.nextId++);
        this.properties.set(id, { ...property, id });
        return id;
    }

    async getProperty(id: string): Promise<PropertyData> {
        const property = this.properties.get(id);
        if (!property) {
            throw new StorageError(`Property with ID ${id} not found`, StorageErrorCode.NOT_FOUND);
        }
        return { ...property };
    }

    async updateProperty(id: string, property: PropertyData): Promise<void> {
        if (!this.properties.has(id)) {
            throw new StorageError(`Property with ID ${id} not found`, StorageErrorCode.NOT_FOUND);
        }
        this.validateProperty(property);
        this.properties.set(id, { ...property, id });
    }

    async deleteProperty(id: string): Promise<void> {
        if (!this.properties.delete(id)) {
            throw new StorageError(`Property with ID ${id} not found`, StorageErrorCode.NOT_FOUND);
        }
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return Array.from(this.properties.entries()).map(([id, property]) => ({
            id,
            property,
            similarity: 1.0,
            matchedFilters: []
        }));
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        elizaLogger.info('Searching properties with filters:', filters);
        
        // Create a memory object for knowledge search
        const memory: Memory = {
            agentId: this.runtime.agentId,
            userId: this.runtime.agentId,
            roomId: this.runtime.agentId,
            content: {
                text: this.filtersToQuery(filters)
            }
        };

        // Get results from knowledge system
        const knowledgeItems = await knowledge.get(this.runtime, memory);
        elizaLogger.info('Retrieved knowledge items:', knowledgeItems);

        // Convert knowledge items to property results
        const knowledgeResults = knowledgeItems.map(item => ({
            id: item.id,
            property: item.content.metadata as PropertyData,
            similarity: 1.0,
            matchedFilters: []
        }));

        // Apply existing filter logic to in-memory properties
        const applyFilter = (property: PropertyData, filter: MetadataFilter): boolean => {
            const value = property[filter.field as keyof PropertyData];
            const searchValue = filter.value;

            switch (filter.operator) {
                case '$eq':
                    return value === searchValue;
                case '$in':
                    if (typeof value === 'string' && typeof searchValue === 'string') {
                        return value.toLowerCase().includes(searchValue.toLowerCase());
                    }
                    return false;
                default:
                    return false;
            }
        };

        const applyFilterGroup = (property: PropertyData, group: FilterGroup): boolean => {
            const results = group.filters.map(filter => {
                if ('operator' in filter && ('filters' in filter)) {
                    // Nested filter group
                    return applyFilterGroup(property, filter as FilterGroup);
                } else {
                    // Single filter
                    return applyFilter(property, filter as MetadataFilter);
                }
            });

            return group.operator === 'AND' 
                ? results.every(r => r)
                : results.some(r => r);
        };

        const directResults = Array.from(this.properties.values())
            .filter(property => applyFilterGroup(property, filters))
            .map(property => ({
                id: property.id,
                property,
                similarity: 1.0,
                matchedFilters: []
            }));

        elizaLogger.info('Direct search results:', directResults);
        
        // Combine and return all results
        return [...knowledgeResults, ...directResults];
    }

    private filtersToQuery(filters: FilterGroup): string {
        const filterToText = (filter: MetadataFilter): string => {
            return `${filter.field}:${filter.value}`;
        };

        const groupToText = (group: FilterGroup): string => {
            const filterTexts = group.filters.map(f => 
                'operator' in f ? groupToText(f as FilterGroup) : filterToText(f as MetadataFilter)
            );
            return filterTexts.join(group.operator === 'AND' ? ' AND ' : ' OR ');
        };

        return groupToText(filters);
    }

    async getCount(): Promise<number> {
        return this.properties.size;
    }
}
