import { Plugin, IAgentRuntime, Memory, State, ServiceType, elizaLogger } from '@ai16z/eliza';
import { PropertyStorage } from './storage';
import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';
import { Action } from '@ai16z/eliza';

const searchPropertiesAction: Action = {
    name: 'search-properties',
    description: 'Search for properties using natural language',
    similes: [
        'Find properties matching criteria',
        'Search real estate listings',
        'Query property database',
        'Show me properties',
        'Look for properties'
    ],
    examples: [[
        {
            user: 'User',
            content: {
                text: 'Search real estate listings for beachfront properties in Miami',
                action: 'search-properties',
            }
        }
    ]],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown }
    ): Promise<unknown> => {
        const storage = new MemoryPropertyStorage(runtime);
        const service = new PropertyStorageService(storage, runtime);
        
        // Extract the search query from the message text
        const text = message.content?.text || '';
        elizaLogger.info('Property search input text:', text);
        let query = '';

        if (text.includes('listings for')) {
            query = text.split('listings for')[1].trim();
        } else if (text.includes('properties')) {
            query = text.split('properties')[1]?.trim() || text;
        } else {
            query = text;
        }

        elizaLogger.info('Extracted search query:', query);

        // Use the storage's search interface with the query
        const results = await service.searchByFilters({
            operator: 'OR',
            filters: [
                {
                    field: 'description',
                    value: query.toLowerCase(),
                    operator: '$in'
                },
                {
                    field: 'name',
                    value: query.toLowerCase(),
                    operator: '$in'
                },
                {
                    field: 'neighborhood',
                    value: query.toLowerCase(),
                    operator: '$in'
                }
            ]
        });

        elizaLogger.info('Search results:', results);

        return {
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: message.roomId,
            content: {
                text: `Here are the properties matching "${query}":\n\n${
                    results.length > 0
                        ? results.map(r => `- ${r.property.name}: ${r.property.description}`).join('\n')
                        : 'No matching properties found.'
                }`,
                action: 'search-properties'
            }
        };
    },
    validate: async () => Promise.resolve(true)
};

export const plugin: Plugin = {
    name: 'property-search',
    description: 'Search and manage property data',
    services: [],  // We'll create services in the handler since we need runtime
    actions: [searchPropertiesAction]
};

export default plugin;
