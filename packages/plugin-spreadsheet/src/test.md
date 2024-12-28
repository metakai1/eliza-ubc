import { MemoryPropertyStorage } from './storage/memory-storage';
import { PropertyStorageService } from './services';
import { PropertyData, StorageError, StorageErrorCode } from './types';

async function main() {
    console.log('Starting validation tests...');
    
    const storage = new MemoryPropertyStorage();
    const service = new PropertyStorageService(storage);

    // Test 1: Valid property
    console.log('\nTest 1: Adding valid property');
    const validProperty: PropertyData = {
        id: '',
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
        const id = await service.addProperty(validProperty);
        console.log('✅ Successfully added valid property with ID:', id);
    } catch (error) {
        console.error('❌ Failed to add valid property:', error);
    }

    // Test 2: Invalid numeric values
    console.log('\nTest 2: Testing invalid numeric values');
    const invalidNumericProperty: PropertyData = {
        ...validProperty,
        maxFloors: 0  // Should fail as maxFloors must be >= 1
    };

    try {
        await service.addProperty(invalidNumericProperty);
        console.error('❌ Should have failed with invalid maxFloors');
    } catch (error) {
        if (error instanceof StorageError && error.code === StorageErrorCode.INVALID_NUMERIC_VALUE) {
            console.log('✅ Correctly rejected invalid maxFloors');
        } else {
            console.error('❌ Unexpected error:', error);
        }
    }

    // Test 3: Invalid min/max relationship
    console.log('\nTest 3: Testing invalid min/max relationship');
    const invalidMinMaxProperty: PropertyData = {
        ...validProperty,
        minFloors: 50,  // Higher than maxFloors (40)
    };

    try {
        await service.addProperty(invalidMinMaxProperty);
        console.error('❌ Should have failed with invalid min/max floors');
    } catch (error) {
        if (error instanceof StorageError && error.code === StorageErrorCode.INVALID_NUMERIC_VALUE) {
            console.log('✅ Correctly rejected invalid min/max relationship');
        } else {
            console.error('❌ Unexpected error:', error);
        }
    }

    // Test 4: Invalid market data
    console.log('\nTest 4: Testing invalid market data');
    const invalidMarketProperty: PropertyData = {
        ...validProperty,
        market: {
            ...validProperty.market!,
            currentPrice: -1000  // Invalid negative price
        }
    };

    try {
        await service.addProperty(invalidMarketProperty);
        console.error('❌ Should have failed with invalid market price');
    } catch (error) {
        if (error instanceof StorageError && error.code === StorageErrorCode.INVALID_MARKET_DATA) {
            console.log('✅ Correctly rejected invalid market data');
        } else {
            console.error('❌ Unexpected error:', error);
        }
    }

    console.log('\nValidation tests completed!');
}

main().catch(console.error);
