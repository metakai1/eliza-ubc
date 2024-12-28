import { PropertyData, SearchOptions, SearchResult, FilterGroup, StorageError, StorageErrorCode, MetadataFilter } from '../types';
import { BasePropertyStorage } from '../storage';
import { knowledge, elizaLogger, IAgentRuntime, Memory } from '@ai16z/eliza';

/**
 * In-memory implementation of PropertyStorage
 */
export class MemoryPropertyStorage extends BasePropertyStorage {
    private properties: Map<string, PropertyData> = new Map();
    private nextId: number = 1;
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
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

        // Apply existing filter logic
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
                // Add more operators as needed
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

        const matchedProperties = Array.from(this.properties.values())
            .filter(property => applyFilterGroup(property, filters))
            .map(property => ({
                id: property.id,
                property,
                similarity: 1.0,
                matchedFilters: []
            }));

        console.log('Matched properties:', matchedProperties);
        return [...knowledgeResults, ...matchedProperties];
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

    async clear(): Promise<void> {
        this.properties.clear();
        this.nextId = 1;
    }

    async bulkLoad(properties: PropertyData[]): Promise<void> {
        for (const property of properties) {
            await this.addProperty(property);
        }
    }

    protected validateProperty(property: PropertyData): void {
        // Check required string fields
        const requiredStringFields: (keyof PropertyData)[] = [
            'name', 'neighborhood', 'zoningType', 'plotSize', 
            'buildingSize', 'description'
        ];
        
        for (const field of requiredStringFields) {
            if (!property[field] || typeof property[field] !== 'string' || property[field].trim() === '') {
                throw new StorageError(
                    `Missing or invalid required field: ${field}`,
                    StorageErrorCode.MISSING_REQUIRED_FIELD,
                    { field }
                );
            }
        }

        // Validate numeric fields
        const numericValidations: [keyof PropertyData, number, number, string][] = [
            ['maxFloors', 1, 200, 'Maximum floors must be between 1 and 200'],
            ['minFloors', 1, 200, 'Minimum floors must be between 1 and 200'],
            ['plotArea', 0, 1000000, 'Plot area must be positive and less than 1,000,000 square feet'],
            ['maxBuildingHeight', 0, 2000, 'Maximum building height must be between 0 and 2000 feet'],
            ['minBuildingHeight', 0, 2000, 'Minimum building height must be between 0 and 2000 feet'],
            ['oceanDistanceMeters', 0, 100000, 'Ocean distance must be between 0 and 100,000 meters'],
            ['bayDistanceMeters', 0, 100000, 'Bay distance must be between 0 and 100,000 meters']
        ];

        for (const [field, min, max, message] of numericValidations) {
            const value = property[field];
            if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
                throw new StorageError(
                    message,
                    StorageErrorCode.INVALID_NUMERIC_VALUE,
                    { field, value, min, max }
                );
            }
        }

        // Validate min/max relationships
        if (property.minFloors > property.maxFloors) {
            throw new StorageError(
                'Minimum floors cannot be greater than maximum floors',
                StorageErrorCode.INVALID_NUMERIC_VALUE,
                { minFloors: property.minFloors, maxFloors: property.maxFloors }
            );
        }

        if (property.minBuildingHeight > property.maxBuildingHeight) {
            throw new StorageError(
                'Minimum building height cannot be greater than maximum building height',
                StorageErrorCode.INVALID_NUMERIC_VALUE,
                { minHeight: property.minBuildingHeight, maxHeight: property.maxBuildingHeight }
            );
        }

        // Validate market data if present
        if (property.market) {
            if (typeof property.market.isListed !== 'boolean') {
                throw new StorageError(
                    'Market listing status must be a boolean',
                    StorageErrorCode.INVALID_MARKET_DATA,
                    { market: property.market }
                );
            }

            if (property.market.currentPrice !== undefined && 
                (typeof property.market.currentPrice !== 'number' || property.market.currentPrice <= 0)) {
                throw new StorageError(
                    'Market price must be a positive number',
                    StorageErrorCode.INVALID_MARKET_DATA,
                    { price: property.market.currentPrice }
                );
            }

            if (property.market.marketplace !== 'opensea' && property.market.marketplace !== 'other') {
                throw new StorageError(
                    'Invalid marketplace specified',
                    StorageErrorCode.INVALID_MARKET_DATA,
                    { marketplace: property.market.marketplace }
                );
            }

            if (!(property.market.lastUpdated instanceof Date)) {
                throw new StorageError(
                    'Market last updated must be a valid date',
                    StorageErrorCode.INVALID_MARKET_DATA,
                    { lastUpdated: property.market.lastUpdated }
                );
            }
        }

        // Validate NFT data if present
        if (property.nft) {
            if (!property.nft.tokenId || !property.nft.contractAddress) {
                throw new StorageError(
                    'NFT token ID and contract address are required',
                    StorageErrorCode.INVALID_NFT_DATA,
                    { nft: property.nft }
                );
            }

            if (property.nft.blockchain !== 'ethereum' && property.nft.blockchain !== 'polygon') {
                throw new StorageError(
                    'Invalid blockchain specified',
                    StorageErrorCode.INVALID_NFT_DATA,
                    { blockchain: property.nft.blockchain }
                );
            }

            if (property.nft.lastSalePrice !== undefined && 
                (typeof property.nft.lastSalePrice !== 'number' || property.nft.lastSalePrice <= 0)) {
                throw new StorageError(
                    'NFT last sale price must be a positive number',
                    StorageErrorCode.INVALID_NFT_DATA,
                    { lastSalePrice: property.nft.lastSalePrice }
                );
            }

            if (property.nft.lastSaleDate && !(property.nft.lastSaleDate instanceof Date)) {
                throw new StorageError(
                    'NFT last sale date must be a valid date',
                    StorageErrorCode.INVALID_NFT_DATA,
                    { lastSaleDate: property.nft.lastSaleDate }
                );
            }
        }
    }
}
