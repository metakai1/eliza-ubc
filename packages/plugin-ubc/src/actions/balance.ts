import { Action, ActionExample } from '@ai16z/eliza';

export const checkUBCBalance: Action = {
    name: "CHECK_UBC_BALANCE",
    description: "Check UBC compute balance",
    similes: ["CHECK_COMPUTE_BALANCE", "GET_UBC_BALANCE", "VIEW_UBC_BALANCE"],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my UBC balance"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Current UBC Balance: 100 compute units, 5 pending",
                    action: "CHECK_UBC_BALANCE",
                    content: {
                        balance: {
                            compute: 100,
                            pending: 5
                        }
                    }
                }
            }
        ]
    ] as ActionExample[][],
    validate: async (runtime, message, state) => {
        return true;  // Basic validation for now
    },
    handler: async (runtime, message, state, options, callback) => {
        try {
            // Mock response for now
            const mockBalance = {
                compute: 100,
                pending: 5
            };

            callback?.({
                text: `Current UBC Balance:\nCompute: ${mockBalance.compute}\nPending: ${mockBalance.pending}`,
                content: {
                    balance: mockBalance
                }
            }, []);

            return true;
        } catch (error) {
            console.error("Error checking UBC balance:", error);
            return false;
        }
    }
};