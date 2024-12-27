import { PropertyData, SearchOptions, SearchResult, FilterGroup, StorageError, StorageErrorCode } from '../types';
import { BasePropertyStorage } from '../storage';

/**
 * In-memory implementation of PropertyStorage
 */
export class MemoryPropertyStorage extends BasePropertyStorage {
    private properties: Map<string, PropertyData> = new Map();
    private nextId: number = 1;

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
        // Basic implementation - return all properties with a default score
        return Array.from(this.properties.entries()).map(([id, property]) => ({
            id,
            property,
            similarity: 1.0,
            matchedFilters: []
        }));
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
        if (!property.name || !property.neighborhood) {
            throw new StorageError('Invalid property data', StorageErrorCode.INVALID_DATA);
        }
    }
}
