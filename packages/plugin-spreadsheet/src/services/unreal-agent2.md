import { AgentRuntime, embed, getEmbeddingConfig } from "@ai16z/eliza";
import { PropertyData } from "../types";

interface PropertyMetadata {
    createdAt: Date;
    version: number;
    previousVersion?: string;
}

interface StoredProperty extends PropertyData {
    id: string;
    embedding: number[];
    metadata: PropertyMetadata;
}

interface AgentConfig {
    embeddingModel: string;
    dimensions: number;
    similarityThreshold: number;
}

export class UnrealAgent2 {
    private runtime: AgentRuntime;
    private config: AgentConfig;

    constructor(runtime: AgentRuntime) {
        this.runtime = runtime;
    }

    async initialize(): Promise<void> {
        const embeddingConfig = getEmbeddingConfig();
        this.config = {
            embeddingModel: process.env.EMBEDDING_OPENAI_MODEL || 'text-embedding-3-small',
            dimensions: embeddingConfig.dimensions,
            similarityThreshold: 0.8
        };

        // Ensure tables exist
        await this.runtime.databaseAdapter.query(`
            CREATE TABLE IF NOT EXISTS property_store (
                id UUID PRIMARY KEY,
                data JSONB NOT NULL,
                embedding vector(${this.config.dimensions}),
                metadata JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await this.runtime.databaseAdapter.query(`
            CREATE TABLE IF NOT EXISTS property_versions (
                id UUID PRIMARY KEY,
                property_id UUID NOT NULL REFERENCES property_store(id),
                version INTEGER NOT NULL,
                previous_version UUID REFERENCES property_versions(id),
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    async getConfig(): Promise<AgentConfig> {
        return { ...this.config };
    }

    async storeProperty(property: PropertyData): Promise<StoredProperty> {
        // Generate embedding for the property
        const propertyText = this.propertyToText(property);
        const embedding = await embed(this.runtime, propertyText);

        // Get current version if exists
        const currentVersion = await this.getCurrentVersion(property.id);
        const version = currentVersion ? currentVersion.metadata.version + 1 : 1;
        const previousVersion = currentVersion?.id;

        // Create stored property object
        const storedProperty: StoredProperty = {
            ...property,
            embedding,
            metadata: {
                createdAt: new Date(),
                version,
                previousVersion
            }
        };

        // Store in database
        await this.runtime.databaseAdapter.query(
            `INSERT INTO property_store (id, data, embedding, metadata)
             VALUES ($1, $2, $3, $4)`,
            [
                property.id,
                JSON.stringify(property),
                embedding,
                JSON.stringify(storedProperty.metadata)
            ]
        );

        // Store version history
        await this.runtime.databaseAdapter.query(
            `INSERT INTO property_versions (id, property_id, version, previous_version, data)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                property.id,
                property.id,
                version,
                previousVersion,
                JSON.stringify(property)
            ]
        );

        return storedProperty;
    }

    async getProperty(id: string): Promise<StoredProperty | null> {
        const result = await this.runtime.databaseAdapter.query(
            `SELECT * FROM property_store WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            ...row.data,
            id: row.id,
            embedding: row.embedding,
            metadata: row.metadata
        };
    }

    async getPropertyHistory(id: string): Promise<StoredProperty[]> {
        const result = await this.runtime.databaseAdapter.query(
            `SELECT * FROM property_versions 
             WHERE property_id = $1 
             ORDER BY version DESC`,
            [id]
        );

        return result.rows.map(row => ({
            ...row.data,
            id: row.id,
            embedding: row.embedding,
            metadata: {
                createdAt: row.created_at,
                version: row.version,
                previousVersion: row.previous_version
            }
        }));
    }

    private async getCurrentVersion(id: string): Promise<StoredProperty | null> {
        const result = await this.runtime.databaseAdapter.query(
            `SELECT * FROM property_versions 
             WHERE property_id = $1 
             ORDER BY version DESC 
             LIMIT 1`,
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            ...row.data,
            id: row.id,
            embedding: row.embedding,
            metadata: {
                createdAt: row.created_at,
                version: row.version,
                previousVersion: row.previous_version
            }
        };
    }

    private propertyToText(property: PropertyData): string {
        return `
            Property: ${property.name}
            Location: ${property.neighborhood}
            Type: ${property.zoningType}
            Size: ${property.plotSize} (${property.buildingSize})
            Floors: ${property.minFloors}-${property.maxFloors}
            Height: ${property.minBuildingHeight}-${property.maxBuildingHeight} feet
            Distance to Ocean: ${property.oceanDistanceMeters}m
            Distance to Bay: ${property.bayDistanceMeters}m
            Description: ${property.description}
            Price: ${property.market?.currentPrice} ${property.market?.currency}
        `.trim().replace(/\s+/g, ' ');
    }
}
