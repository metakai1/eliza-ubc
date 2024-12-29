import { Plugin, IAgentRuntime, Memory, State, ServiceType, elizaLogger } from '@ai16z/eliza';
import { PropertyStorage } from './storage';
import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';
import { Action } from '@ai16z/eliza';

const searchPropertiesAction: Action = {
    name: 'search-properties',
    description: 'Search for properties using natural language',
    similes: [
        'find properties',
        'search properties',
        'lookup properties',
        'list properties',
        'search properties for matches'
    ],
    examples: [[
        {
            user: "user",
            content: {
                text: "Search properties for sale",
                action: "search-properties"
            }
        }
    ]],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown }
    ): Promise<unknown> => {
        elizaLogger.info('search-properties handler starting', {
            messageText: message?.content?.text,
            hasState: !!state,
            hasOptions: !!options,
            runtimeType: runtime?.constructor?.name
        });

        if (!runtime) {
            elizaLogger.error('Runtime not initialized');
            throw new Error('Runtime not initialized');
        }

        // Initialize the service with runtime
        try {
            await service.initialize(runtime);
        } catch (error) {
            elizaLogger.error('Failed to initialize service:', error);
            throw error;
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
                        ? results.map(r => r.property
                            ? `- ${r.property.name}: ${r.property.description}`
                            : `- Unknown property`
                          ).join('\n')
                        : 'No matching properties found.'
                }`,
                action: 'search-properties'
            }
        };
    },
    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        return !!runtime && !!message;
    }
} as Action;

// Create the plugin instance
const storage = new MemoryPropertyStorage();
const service = new PropertyStorageService(storage);

// Export the plugin
export const spreadsheetPlugin: Plugin = {
    name: "spreadsheet",
    description: "Plugin for managing property data in a spreadsheet format",
    actions: [searchPropertiesAction],
    services: [service],
    evaluators: [],
    providers: []
};