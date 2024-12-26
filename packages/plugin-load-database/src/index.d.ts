export interface CalculatorPlugin {
    name: string;
    description: string;
    initialize: (runtime: any) => void;
    commands: {
        add: (params: { a: number; b: number }) => number;
        subtract: (params: { a: number; b: number }) => number;
        multiply: (params: { a: number; b: number }) => number;
        divide: (params: { a: number; b: number }) => number;
    };
}

export const calculatorPlugin: CalculatorPlugin;
export default calculatorPlugin;
