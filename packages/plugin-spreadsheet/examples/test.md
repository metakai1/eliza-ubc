import { AgentRuntime } from "@ai16z/eliza";
import { spreadsheetPlugin } from "../src";
import * as fs from "fs";
import * as path from "path";

async function runDemo() {
    // Create runtime instance
    const runtime = new AgentRuntime({
        agentId: "test-agent",
        settings: {}
    });

    // Load the properties CSV
    const csvPath = path.join(__dirname, "properties.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // Load data into vector store
    const loadResult = await spreadsheetPlugin.actions[0].handler(runtime, {
        content: csvContent,
        namespace: "properties"
    });
    console.log("Load result:", loadResult);

    // Example queries demonstrating complex filtering
    const queries = [
        // Simple queries
        "Find tall buildings near the ocean",
        "Show me large plots in the Nexus neighborhood",
        
        // Complex AND/OR queries
        "Find properties in Nexus or Flashing Lights with at least 100 floors",
        "Show buildings that are either close to the ocean (within 300m) or have more than 110 floors",
        
        // Multi-criteria queries
        "Find residential properties with large plots (>5000m²) that are either near the ocean (<500m) or near the bay (<800m)",
        "Show me megatall buildings in Nexus that have either more than 100 floors or are within 400m of the ocean"
    ];

    // Run each query and analyze results
    for (const query of queries) {
        console.log("\n" + "=".repeat(80));
        console.log("Query:", query);
        const results = await spreadsheetPlugin.actions[1].handler(runtime, {
            query,
            namespace: "properties",
            limit: 3
        });

        // Display results with applied filters
        console.log("\nApplied Filters:", JSON.stringify(results[0]?.appliedFilters, null, 2));
        
        results.forEach((result, i) => {
            const prop = result.property;
            console.log(`\nResult ${i + 1} (similarity: ${result.similarity?.toFixed(3)})`);
            console.log(`Name: ${prop.name}`);
            console.log(`Location: ${prop.neighborhood}`);
            console.log(`Building: ${prop.maxFloors} floors, ${prop.maxBuildingHeight}m tall`);
            console.log(`Plot: ${prop.plotArea}m², ${prop.plotSize}`);
            console.log(`Distances: ${prop.oceanDistanceMeters}m to ocean, ${prop.bayDistanceMeters}m to bay`);
            console.log(`Description: ${result.description}`);
        });
    }
}

runDemo().catch(console.error);
