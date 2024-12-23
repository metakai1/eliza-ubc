import { elizaLogger } from "@ai16z/eliza";
import * as fs from 'fs';
import * as path from 'path';

export async function logPrompt(prompt: string, type: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `
=== ${type} Prompt @ ${timestamp} ===
${prompt}
===========================================\n\n`;

    // Log to console
    elizaLogger.debug('Logging prompt:', { type, timestamp });

    // Log to file
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'prompts.log');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Append to log file
    try {
        await fs.promises.appendFile(logFile, logEntry);
        elizaLogger.info(`Prompt logged to ${logFile}`);
    } catch (error) {
        elizaLogger.error('Failed to write to log file:', error);
    }
}
