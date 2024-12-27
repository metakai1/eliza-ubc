import { Plugin, IAgentRuntime, Memory, State, ServiceType } from '@ai16z/eliza';
import { PropertyStorage } from './storage';
import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';

const plugin: Plugin = {
    name: 'property-search',
    description: 'Search and manage property data',

    services: [new PropertyStorageService(new MemoryPropertyStorage())],

    actions: [
        {
            name: 'search-properties',
            description: 'Search for properties using natural language',
            similes: [
                'Find properties matching criteria',
                'Search real estate listings',
                'Query property database'
            ],
            examples: [
                [
                    {
                        user: 'User',
                        content: {
                            text: 'Find me beachfront properties in Miami',
                            action: 'search-properties',
                            parameters: {
                                query: 'beachfront properties in Miami'
                            }
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime, message: Memory) => {
                // Extract parameters from the message
                const parameters = message.content?.parameters as { query?: string };

                // Validate the query parameter
                if (!parameters?.query) {
                    return false;
                }

                return true;
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state?: State,
                options?: { [key: string]: unknown }
            ): Promise<unknown> => {
                const service = runtime.getService<PropertyStorageService>(ServiceType.PROPERTY_STORAGE);
                if (!service) {
                    throw new Error('Property storage service not available');
                }

                // Extract query from parameters
                const parameters = message.content?.parameters as { query: string }; // Type assertion
                const query = parameters?.query;
                if (!query || typeof query !== 'string') {
                    throw new Error('Invalid query parameter');
                }

                // Use the storage's search interface with the query
                const results = await service.searchByFilters({
                    operator: 'AND',
                    filters: [
                        {
                            field: 'description',
                            value: query,
                            operator: '$near'
                        }
                    ]
                });

                return {
                    properties: results
                };
            }
        }
    ]
};

export default plugin;
