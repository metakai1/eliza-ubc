import { PropertyData } from './types';

interface CSVOptions {
    hasHeaders?: boolean;
    delimiter?: string;
}

/**
 * Parse CSV content into PropertyData objects
 */
export function parseCSV(content: string, options: CSVOptions = {}): PropertyData[] {
    const {
        hasHeaders = true,
        delimiter = ','
    } = options;

    // Split into lines
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    // Handle headers
    let startIndex = 0;
    let headers: string[] = [];
    if (hasHeaders) {
        headers = lines[0].split(delimiter).map(h => h.trim());
        startIndex = 1;
    }

    // Parse data lines
    return lines.slice(startIndex).map((line, index) => {
        const values = line.split(delimiter).map(v => v.trim());
        
        // Create property object
        const property: Partial<PropertyData> = {
            id: values[0] || String(index),
            name: values[1] || `Property ${index}`,
        };

        // Map remaining values to fields
        if (hasHeaders) {
            headers.forEach((header, i) => {
                if (i > 1) { // Skip id and name which we already handled
                    const value = values[i];
                    if (value !== undefined && value !== '') {
                        (property as any)[header] = parseValue(value);
                    }
                }
            });
        }

        return property as PropertyData;
    });
}

/**
 * Parse string value into appropriate type
 */
function parseValue(value: string): any {
    // Try parsing as number
    if (!isNaN(Number(value))) {
        return Number(value);
    }

    // Try parsing as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try parsing as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;

    // Return as string
    return value;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}
