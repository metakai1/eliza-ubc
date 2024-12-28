import { Plugin, AgentRuntime, IAgentRuntime, Memory, State, ServiceType, elizaLogger } from '@ai16z/eliza';
import { PropertyStorage } from './storage';
import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';
import { Action } from '@ai16z/eliza';

const searchPropertiesAction: Action = {
    name: 'search-properties',
    description: 'Search for properties using natural language',
    similes: [
        'search-properties',
        'Find properties matching criteria',
        'Search real estate listings',
        'Search real estate listings for',
        'Search for properties',
        'Query property database',
        'Show me properties',
        'Look for properties',
        'Find real estate',
        'Search properties'
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
        elizaLogger.info('search-properties handler starting with:', {
            messageText: message?.content?.text,
            hasState: !!state,
            hasOptions: !!options
        });

        const service = runtime.getService<PropertyStorageService>(ServiceType.PROPERTY_STORAGE);
        if (!service) {
            elizaLogger.error('Property storage service not available');
            throw new Error('Property storage service not available');
        }

        // Extract the search query from the message text
        const text = message.content?.text || '';
        elizaLogger.info('Processing search query:', { originalText: text });

        let query = text;
        if (text.includes('listings for')) {
            query = text.split('listings for')[1].trim();
        } else if (text.includes('properties')) {
            query = text.split('properties')[1]?.trim() || text;
        }

        elizaLogger.info('Extracted search query:', { query });

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

// Create the plugin instance
const storage = new MemoryPropertyStorage();
const service = new PropertyStorageService(storage);

export const spreadsheetPlugin: Plugin = {
    name: 'property-search',
    description: 'Search and manage property data',
    services: [service],
    actions: [searchPropertiesAction]
};

// Export the plugin as default
export default spreadsheetPlugin;