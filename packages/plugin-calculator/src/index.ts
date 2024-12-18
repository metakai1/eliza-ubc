export default {
    name: "CALCULATOR",
    description: "A calculator plugin for Eliza",
    initialize: (runtime) => {
        console.log("Calculator plugin initialized");
    },
    commands: {
        add: (params: { a: number; b: number }) => {
            const { a, b } = params;
            return a + b;
        },
        subtract: (params: { a: number; b: number }) => {
            const { a, b } = params;
            return a - b;
        },
        multiply: (params: { a: number; b: number }) => {
            const { a, b } = params;
            return a * b;
        },
        divide: (params: { a: number; b: number }) => {
            const { a, b } = params;
            if (b === 0) throw new Error("Cannot divide by zero");
            return a / b;
        },
    },
};
