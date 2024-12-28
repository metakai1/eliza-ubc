import { Service, IAgentRuntime, ServiceType, AgentRuntime } from '@ai16z/eliza';
import { PropertyStorage } from '../storage';
import { MemoryPropertyStorage } from '../storage/memory-storage';
import { FilterGroup, SearchOptions, SearchResult } from '../types';
import { elizaLogger } from '@ai16z/eliza';

export class PropertyStorageService implements Service {
    readonly type = ServiceType.PROPERTY_STORAGE;
    private runtime: IAgentRuntime | null = null;

    constructor(
        private storage: PropertyStorage
    ) {}

    get serviceType(): ServiceType {
        return ServiceType.PROPERTY_STORAGE;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        this.storage.initialize(runtime);
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        elizaLogger.info('PropertyStorageService.searchByFilters called with:', {
            operator: filters.operator,
            filterCount: filters.filters?.length,
            filterFields: filters.filters?.map(f => typeof f === 'object' && 'field' in f ? f.field : 'group')
        });
        if (!this.storage) {
            throw new Error('PropertyStorageService not initialized');
        }
        try {
            const results = await this.storage.searchByFilters(filters);
            elizaLogger.info('PropertyStorageService search results:', {
                count: results.length,
                results: results.map(r => ({ id: r.property.id, name: r.property.name }))
            });
            return results;
        } catch (error) {
            elizaLogger.error('Error in PropertyStorageService.searchByFilters:', error);
            throw error;
        }
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        if (!this.storage) {
            throw new Error('PropertyStorageService not initialized');
        }
        return this.storage.searchByVector(vector, options);
    }
}
