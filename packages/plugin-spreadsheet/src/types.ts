/**
 * Core property data interface
 */
export interface PropertyData {
    id: string;
    name: string;
    neighborhood: string;
    zoningType: string;
    plotSize: string;
    buildingSize: string;
    maxFloors: number;
    minFloors: number;
    plotArea: number;
    maxBuildingHeight: number;
    minBuildingHeight: number;
    oceanDistanceMeters: number;
    bayDistanceMeters: number;
    description: string;
    nft?: NFTMetadata;
    market?: MarketStatus;
}

/**
 * NFT-specific metadata
 */
export interface NFTMetadata {
    tokenId: string;
    contractAddress: string;
    blockchain: 'ethereum' | 'polygon';
    lastSalePrice?: number;
    lastSaleDate?: Date;
}

/**
 * Real-time market status
 */
export interface MarketStatus {
    isListed: boolean;
    currentPrice?: number;
    currency?: string;
    marketplace: 'opensea' | 'other';
    listingUrl?: string;
    lastUpdated: Date;
}

/**
 * Options for search operations
 */
export interface SearchOptions {
    limit: number;
    threshold?: number;
    includeMetadata?: boolean;
    sortBy?: 'similarity' | 'price' | 'date';
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
    id: string;
    property?: PropertyData;
    similarity: number;
    matchedFilters?: string[];
}

/**
 * Filter types and operators
 */
export type FilterOperator = 
    | '$eq' | '$ne'
    | '$gt' | '$gte'
    | '$lt' | '$lte'
    | '$in' | '$nin'
    | '$exists'
    | '$near';

/**
 * Single metadata filter
 */
export interface MetadataFilter {
    field: string;
    operator: FilterOperator;
    value: any;
}

/**
 * Group of filters with logical operator
 */
export interface FilterGroup {
    operator: 'AND' | 'OR';
    filters: (MetadataFilter | FilterGroup)[];
}
