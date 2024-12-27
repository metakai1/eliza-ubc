import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';
import { PropertyData } from './types';

async function main() {
    console.log('Starting sanity check test...');

    // Create storage and service instances
    const storage = new MemoryPropertyStorage();
    const service = new PropertyStorageService(storage);

    // Add a sample property
    const property1: PropertyData = {
        id: '',  // This will be set by storage
        name: 'Oceanfront Tower',
        neighborhood: 'Miami Beach',
        zoningType: 'Mixed-Use',
        plotSize: '0.5 acres',
        buildingSize: '50000 sqft',
        maxFloors: 40,
        minFloors: 1,
        plotArea: 21780,
        maxBuildingHeight: 400,
        minBuildingHeight: 15,
        oceanDistanceMeters: 100,
        bayDistanceMeters: 1000,
        description: 'Luxury oceanfront development opportunity',
        market: {
            isListed: true,
            currentPrice: 25000000,
            currency: 'USD',
            marketplace: 'other',
            lastUpdated: new Date()
        }
    };

    try {
        // Test adding a property
        console.log('Adding property...');
        const propertyId = await service.addProperty(property1);
        console.log('Successfully added property with ID:', propertyId);

        // Test retrieving the property
        console.log('Retrieving property...');
        const retrievedProperty = await service.getProperty(propertyId);
        console.log('Successfully retrieved property:', JSON.stringify(retrievedProperty, null, 2));

        console.log('All tests passed! ');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

main().catch(console.error);
