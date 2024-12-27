import { Plugin, Memory, Content, AgentRuntime, generateText } from "@ai16z/eliza";
import Papa from "papaparse";

interface PropertyData {
    rank: number;
    name: string;
    neighborhood: string;
    zoningType: string;
    plotSize: string;
    buildingSize: string;
    distanceToOcean: string;
    distanceToBay: string;
    maxFloors: number;
    minFloors: number;
    plotArea: number;
    minBuildingHeight: number;
    maxBuildingHeight: number;
    oceanDistanceMeters: number;
    bayDistanceMeters: number;
}

interface MetadataFilter {
    field: keyof PropertyData;
    operator: '$lt' | '$lte' | '$gt' | '$gte' | '$eq';
    value: number | string;
}

interface FilterGroup {
    operator: 'AND' | 'OR';
    filters: (MetadataFilter | FilterGroup)[];
}

// Helper to apply metadata filters with AND/OR logic
function applyFilterGroup(property: PropertyData, group: FilterGroup): boolean {
    return group.operator === 'AND'
        ? group.filters.every(filter => {
            if ('operator' in filter && ('AND' === filter.operator || 'OR' === filter.operator)) {
                return applyFilterGroup(property, filter);
            } else {
                return applyMetadataFilter(property, filter as MetadataFilter);
            }
        })
        : group.filters.some(filter => {
            if ('operator' in filter && ('AND' === filter.operator || 'OR' === filter.operator)) {
                return applyFilterGroup(property, filter);
            } else {
                return applyMetadataFilter(property, filter as MetadataFilter);
            }
        });
}

function applyMetadataFilter(property: PropertyData, filter: MetadataFilter): boolean {
    const value = property[filter.field];
    const compareValue = filter.value;
    
    switch (filter.operator) {
        case '$lt': return value < compareValue;
        case '$lte': return value <= compareValue;
        case '$gt': return value > compareValue;
        case '$gte': return value >= compareValue;
        case '$eq': return value === compareValue;
        default: return false;
    }
}

// Use LLM to parse natural language query into structured filters
async function parseQueryWithLLM(runtime: AgentRuntime, query: string): Promise<FilterGroup> {
    const prompt = `Parse the following real estate query into a structured filter format. The available fields are:
- maxFloors, minFloors (number of floors)
- maxBuildingHeight, minBuildingHeight (in meters)
- plotArea (in square meters)
- oceanDistanceMeters, bayDistanceMeters (distance in meters)
- neighborhood (string)
- zoningType (string)
- buildingSize (string: "Megatall", "Supertall", etc.)
- plotSize (string: "Giga", "Mega", etc.)

Query: "${query}"

Return the filter in this JSON format:
{
    "operator": "AND" or "OR",
    "filters": [
        {
            "field": "fieldName",
            "operator": "$lt", "$lte", "$gt", "$gte", or "$eq",
            "value": number or string
        },
        // Can nest with AND/OR groups
        {
            "operator": "OR",
            "filters": [...]
        }
    ]
}

Example 1: "Find tall buildings near the ocean"
{
    "operator": "AND",
    "filters": [
        { "field": "maxBuildingHeight", "operator": "$gte", "value": 300 },
        { "field": "oceanDistanceMeters", "operator": "$lte", "value": 500 }
    ]
}

Example 2: "Show properties in Nexus or Flashing Lights with at least 100 floors"
{
    "operator": "AND",
    "filters": [
        {
            "operator": "OR",
            "filters": [
                { "field": "neighborhood", "operator": "$eq", "value": "Nexus" },
                { "field": "neighborhood", "operator": "$eq", "value": "Flashing Lights" }
            ]
        },
        { "field": "maxFloors", "operator": "$gte", "value": 100 }
    ]
}

Parse this query into a filter:`;

    try {
        const response = await generateText({
            runtime,
            context: prompt,
            modelClass: "large"
        });

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in LLM response");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as FilterGroup;
    } catch (error) {
        console.error("Failed to parse query with LLM:", error);
        // Fallback to simple parsing
        return {
            operator: 'AND',
            filters: [
                ...query.includes('tall') ? [{ field: 'maxBuildingHeight' as keyof PropertyData, operator: '$gte', value: 300 }] : [],
                ...query.includes('ocean') ? [{ field: 'oceanDistanceMeters' as keyof PropertyData, operator: '$lte', value: 500 }] : [],
                ...query.includes('large plot') ? [{ field: 'plotArea' as keyof PropertyData, operator: '$gte', value: 5000 }] : []
            ]
        };
    }
}

export const spreadsheetPlugin: Plugin = {
    name: "spreadsheet",
    description: "Load and query spreadsheet data using semantic search",
    actions: [
        {
            name: "load-spreadsheet",
            description: "Load a CSV file into memory for semantic search",
            parameters: {
                content: { type: "string", description: "CSV content to load" },
                namespace: { type: "string", description: "Namespace to store data under" }
            },
            handler: async (runtime: AgentRuntime, params: { content: string, namespace: string }) => {
                const parsed = Papa.parse(params.content, { header: true });
                
                // Process each row into a Memory object
                for (const row of parsed.data) {
                    const propertyData: PropertyData = {
                        rank: parseInt(row.Rank) || 0,
                        name: row.Name || "",
                        neighborhood: row.Neighborhood || "",
                        zoningType: row["Zoning Type"] || "",
                        plotSize: row["Plot Size"] || "",
                        buildingSize: row["Building Size"] || "",
                        distanceToOcean: row["Distance to Ocean"] || "",
                        distanceToBay: row["Distance to Bay"] || "",
                        maxFloors: parseInt(row["Max # of Floors"]) || 0,
                        minFloors: parseInt(row["Min # of Floors"]) || 0,
                        plotArea: parseFloat(row["Plot Area (m²)"]) || 0,
                        minBuildingHeight: parseFloat(row["Min Building Height (m)"]) || 0,
                        maxBuildingHeight: parseFloat(row["Max Building Height (m)"]) || 0,
                        oceanDistanceMeters: parseFloat(row["Distance to Ocean (m)"]) || 0,
                        bayDistanceMeters: parseFloat(row["Distance to Bay (m)"]) || 0
                    };

                    // Create natural language description for vector search
                    const description = [
                        `${propertyData.name} is a ${propertyData.buildingSize} building in ${propertyData.neighborhood}.`,
                        `It has ${propertyData.maxFloors} floors and is ${propertyData.maxBuildingHeight}m tall.`,
                        `Located ${propertyData.oceanDistanceMeters}m from the ocean and ${propertyData.bayDistanceMeters}m from the bay.`,
                        `It has a ${propertyData.plotSize} plot of ${propertyData.plotArea}m².`,
                        `The building is zoned for ${propertyData.zoningType} use.`
                    ].join(" ");

                    const memory: Memory = {
                        content: {
                            text: description,
                            metadata: propertyData
                        },
                        roomId: params.namespace,
                        userId: runtime.agentId,
                        agentId: runtime.agentId
                    };

                    await runtime.memory.createMemory(memory);
                }

                return { success: true, message: `Loaded ${parsed.data.length} properties` };
            }
        },
        {
            name: "query-spreadsheet",
            description: "Search loaded spreadsheet data using natural language",
            parameters: {
                query: { type: "string", description: "Natural language query" },
                namespace: { type: "string", description: "Namespace to search in" },
                limit: { type: "number", description: "Maximum number of results to return" }
            },
            handler: async (runtime: AgentRuntime, params: { query: string, namespace: string, limit: number }) => {
                // Stage 1: Vector similarity search
                const queryMemory: Memory = {
                    content: { text: params.query },
                    roomId: params.namespace,
                    userId: runtime.agentId,
                    agentId: runtime.agentId
                };
                await runtime.memory.addEmbeddingToMemory(queryMemory);

                // Get more candidates than needed since we'll filter them
                const candidateLimit = (params.limit || 10) * 3;
                const candidates = await runtime.memory.searchMemoriesByEmbedding(
                    queryMemory.embedding!,
                    {
                        count: candidateLimit,
                        roomId: params.namespace,
                        match_threshold: 0.6  // Lower threshold to get more candidates
                    }
                );

                // Stage 2: LLM-based metadata filtering
                const filterGroup = await parseQueryWithLLM(runtime, params.query);
                const filteredResults = candidates
                    .filter(match => {
                        const propertyData = match.content.metadata as PropertyData;
                        return applyFilterGroup(propertyData, filterGroup);
                    })
                    .slice(0, params.limit || 10);

                // Return results with both semantic similarity and metadata match info
                return filteredResults.map(match => ({
                    description: match.content.text,
                    property: match.content.metadata as PropertyData,
                    similarity: match.score,
                    appliedFilters: filterGroup  // Include the parsed filters
                }));
            }
        }
    ]
};
