import { Service, ServiceType, AgentRuntime, elizaLogger } from '@ai16z/eliza';
import { PropertyStorage } from '../storage';
import { MemoryPropertyStorage } from '../storage/memory-storage';
import { FilterGroup, SearchOptions, SearchResult } from '../types';

export class PropertyStorageService implements Service {
    readonly type = ServiceType.PROPERTY_STORAGE;
    private runtime: AgentRuntime | null = null;

    constructor(
        private storage: PropertyStorage
    ) {
        elizaLogger.debug('PropertyStorageService: Constructor called');
    }

    get serviceType(): ServiceType {
        return ServiceType.PROPERTY_STORAGE;
    }

    async initialize(runtime: AgentRuntime): Promise<void> {
        elizaLogger.debug('PropertyStorageService: Initializing with runtime', {
            hasRuntime: !!runtime,
            runtimeType: runtime?.constructor?.name,
            agentId: runtime?.agentId
        });
        this.runtime = runtime;
        await this.storage.initialize(runtime);
        elizaLogger.debug('PropertyStorageService: Initialization complete');
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        elizaLogger.debug('PropertyStorageService.searchByFilters called', {
            hasRuntime: !!this.runtime,
            hasStorage: !!this.storage,
            operator: filters.operator,
            filterCount: filters.filters?.length,
            filterFields: filters.filters?.map(f => typeof f === 'object' && 'field' in f ? f.field : 'group')
        });
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
