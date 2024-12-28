import { Service, IAgentRuntime, ServiceType } from '@ai16z/eliza';
import { PropertyStorage } from '../storage';
import { FilterGroup, SearchOptions, SearchResult } from '../types';

export class PropertyStorageService implements Service {
    readonly type = ServiceType.PROPERTY_STORAGE;
    
    constructor(
        private storage: PropertyStorage,
        private runtime: IAgentRuntime
    ) {}

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        return this.storage.searchByFilters(filters);
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return this.storage.searchByVector(vector, options);
    }
}
