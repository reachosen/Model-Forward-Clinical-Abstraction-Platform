import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * envConfig.ts - Centralized Environment Loading
 * 
 * Ensures all tools look at the ROOT .env file:
 * Model-Forward-Clinical-Abstraction-Platform/.env
 */

export function loadEnv() {
  // Path to the root directory from factory-cli/utils/
  const rootPath = path.resolve(__dirname, '../../.env');
  
  if (fs.existsSync(rootPath)) {
    dotenv.config({ path: rootPath });
  } else {
    // Fallback for cases where we might be running from different entry points
    const altPath = path.resolve(process.cwd(), '../.env');
    if (fs.existsSync(altPath)) {
        dotenv.config({ path: altPath });
    }
  }

  // Default REFINERY_QUIET to true to suppress JSON observation logs in terminal
  if (process.env.REFINERY_QUIET === undefined) {
    process.env.REFINERY_QUIET = 'true';
  }
}
