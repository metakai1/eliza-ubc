// This is a simplified demo to show how the semantic search works
const fs = require('fs');
const path = require('path');

// Simulate vector similarity search
function findSimilarProperties(query, properties) {
    // In reality, we would:
    // 1. Convert query to a vector using AI
    // 2. Find properties with similar vectors
    // This is a simplified version:
    return properties.filter(property => {
        let matches = 0;
        let conditions = 0;

        // Check height condition
        if (query.includes('tall')) {
            conditions++;
            if (property.maxBuildingHeight >= 300) matches++;
        }

        // Check ocean proximity
        if (query.includes('ocean')) {
            conditions++;
            if (property.oceanDistanceMeters <= 500) matches++;
        }

        // Check neighborhood
        if (query.includes('Nexus')) {
            conditions++;
            if (property.neighborhood === 'Nexus') matches++;
        }
        if (query.includes('Flashing Lights')) {
            conditions++;
            if (property.neighborhood === 'Flashing Lights') matches++;
        }

        // Check floors
        if (query.includes('floors')) {
            conditions++;
            if (property.maxFloors >= 100) matches++;
        }

        // Calculate match score (0 to 1)
        property.score = conditions > 0 ? matches / conditions : 0;
        
        // Return true if at least half of conditions match
        return property.score >= 0.5;
    }).sort((a, b) => b.score - a.score);
}

// Load and parse CSV
function loadProperties() {
    const csvPath = path.join(__dirname, 'detailed_properties.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1) // Skip header
        .filter(line => line.trim()) // Skip empty lines
        .map(line => {
            const values = line.split(',');
            return {
                name: values[1],
                neighborhood: values[2],
                zoningType: values[3],
                plotSize: values[4],
                buildingSize: values[5],
                maxFloors: parseInt(values[8] || '0'),
                minFloors: parseInt(values[9] || '0'),
                plotArea: parseFloat(values[10] || '0'),
                maxBuildingHeight: parseFloat(values[12] || '0'),
                oceanDistanceMeters: parseFloat(values[13] || '0'),
                bayDistanceMeters: parseFloat(values[14] || '0')
            };
        });
}

async function runDemo() {
    // 1. Load properties
    console.log('1️⃣ Loading properties...');
    const properties = loadProperties();
    console.log(`   Loaded ${properties.length} properties\n`);

    // 2. Example queries
    const queries = [
        'Find tall buildings near the ocean',
        'Show me properties in Nexus with at least 100 floors',
        'Find buildings in Flashing Lights near the ocean',
        'Show me the tallest buildings in either Nexus or Flashing Lights'
    ];

    // 3. Run each query
    for (const query of queries) {
        console.log('\n' + '='.repeat(80));
        console.log(`2️⃣ Searching: "${query}"`);
        
        const matches = findSimilarProperties(query, properties);
        
        console.log('\n3️⃣ Top matches:');
        matches.slice(0, 3).forEach((property, i) => {
            console.log(`\n🏢 Building ${i + 1} (Match Score: ${property.score.toFixed(2)}):`);
            console.log(`   Name: ${property.name}`);
            console.log(`   Location: ${property.neighborhood}`);
            console.log(`   Type: ${property.zoningType}`);
            console.log(`   Building: ${property.buildingSize}, ${property.maxBuildingHeight}m tall`);
            console.log(`   Floors: ${property.minFloors}-${property.maxFloors} floors`);
            console.log(`   Plot: ${property.plotSize}, ${property.plotArea}m²`);
            console.log(`   Distances: ${property.oceanDistanceMeters}m to ocean, ${property.bayDistanceMeters}m to bay`);
        });
    }
}

// Run demo
runDemo().catch(console.error);
