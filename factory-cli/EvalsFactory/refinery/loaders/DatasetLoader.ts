import * as fs from 'fs';
import * as path from 'path';
import { TestCase } from '../../validation/types';
import { Paths, resolveMetricPath } from '../../../utils/pathConfig';

export class DatasetLoader {
  private dataDir: string;

  constructor() {
    // Default to legacy path for backward compatibility
    this.dataDir = Paths.legacy.testcases();
  }

  loadGoldenSet(datasetId: string): TestCase[] {
    // Check local path (e.g. "golden_set.json" or "I25_batch_1.json")
    let fileName = datasetId.endsWith('.json') ? datasetId : `${datasetId}.json`;
    let fullPath = path.join(this.dataDir, fileName);
    
    // SMART RESOLUTION: If not in legacy, try to derive from Metric ID
    if (!fs.existsSync(fullPath)) {
        console.log(`   ℹ️  Dataset not found in legacy path. Attempting registry resolution...`);
        // Extract Metric ID from filename (e.g. "I32a_batch_1" -> "I32a")
        const metricId = datasetId.split('_')[0];
        try {
            const metricPath = resolveMetricPath(metricId);
            const registryDir = Paths.metricTestcases(metricPath);
            fullPath = path.join(registryDir, fileName);
        } catch (e) {
            // Revert to error if resolution fails
            throw new Error(`Dataset not found: ${fullPath} (Legacy) and Registry resolution failed.`);
        }
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Dataset not found: ${fullPath}`);
    }

    console.log(`   📂 Loading dataset from: ${fullPath}`);
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
