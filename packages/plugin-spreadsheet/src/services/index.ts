import { Service, IAgentRuntime, ServiceType } from '@ai16z/eliza';
import { PropertyStorage } from '../storage';
import { FilterGroup, SearchOptions, SearchResult } from '../types';

export class PropertyStorageService implements Service {
    readonly type = ServiceType.PROPERTY_STORAGE;

    constructor(
        private storage: PropertyStorage
    ) {}

    get serviceType(): ServiceType {
        return ServiceType.PROPERTY_STORAGE;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        // No initialization needed for this service
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        return this.storage.searchByFilters(filters);
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return this.storage.searchByVector(vector, options);
    }
}
