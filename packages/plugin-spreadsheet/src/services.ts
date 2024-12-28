import { Service, ServiceType, IAgentRuntime } from '@ai16z/eliza';
import { PropertyStorage } from './storage';
import { BasePropertyStorage } from './storage';
import { FilterGroup, SearchResult, SearchOptions } from './types';

export class PropertyStorageService extends Service implements PropertyStorage {
    private storage: BasePropertyStorage;

    constructor(storage: BasePropertyStorage) {
        super();
        this.storage = storage;
    }

    static override get serviceType(): ServiceType {
        return ServiceType.PROPERTY_STORAGE;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        await this.storage.initialize(runtime);
    }

    async addProperty(property: any) {
        return this.storage.addProperty(property);
    }

    async getProperty(id: string) {
        return this.storage.getProperty(id);
    }

    async updateProperty(id: string, property: any) {
        return this.storage.updateProperty(id, property);
    }

    async deleteProperty(id: string) {
        return this.storage.deleteProperty(id);
    }

    async searchByFilters(filters: FilterGroup): Promise<SearchResult[]> {
        return this.storage.searchByFilters(filters);
    }

    async searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
        return this.storage.searchByVector(vector, options);
    }

    async getCount() {
        return this.storage.getCount();
    }

    async clear() {
        return this.storage.clear();
    }

    async bulkLoad(properties: any[]) {
        return this.storage.bulkLoad(properties);
    }
}
