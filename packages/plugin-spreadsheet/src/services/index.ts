import { Service, IAgentRuntime } from '@ai16z/eliza';
import { PropertyStorage } from '../storage';
import { FilterGroup, SearchOptions, SearchResult } from '../types';

export class PropertyStorageService implements Service {
    private storage: PropertyStorage;
    private runtime: IAgentRuntime;

    constructor(storage: PropertyStorage, runtime: IAgentRuntime) {
        this.storage = storage;
        this.runtime = runtime;
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        return this.storage.searchByFilters(filters);
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return this.storage.searchByVector(vector, options);
    }
}
