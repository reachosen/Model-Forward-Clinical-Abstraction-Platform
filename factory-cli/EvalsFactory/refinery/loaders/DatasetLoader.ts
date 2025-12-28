import * as fs from 'fs';
import * as path from 'path';
import { TestCase } from '../../validation/types';
import { Paths } from '../../../utils/pathConfig';

export class DatasetLoader {
  private dataDir: string;

  constructor() {
    // Default to legacy path for backward compatibility
    this.dataDir = Paths.legacy.testcases();
  }

  loadGoldenSet(datasetId: string): TestCase[] {
    // Check local path (e.g. "golden_set.json" or "I25_batch_1.json")
    const fullPath = path.join(this.dataDir, datasetId.endsWith('.json') ? datasetId : `${datasetId}.json`);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Dataset not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);

    // Support both "test_cases" array (standard) or raw array
    if (data.test_cases && Array.isArray(data.test_cases)) {
      return data.test_cases;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      throw new Error(`Invalid dataset format in ${datasetId}`);
    }
  }
}
