import * as fs from 'fs/promises';
import * as path from 'path';
import { BatchPlan } from '../../flywheel/dataset/BatchConfig';

/**
 * E3: StrategyLoader
 * 
 * Loads batch generation strategies.
 */
export class StrategyLoader {
  static async load(metricId: string, batchId: string, strategyDir: string): Promise<BatchPlan> {
    const strategyFile = path.join(strategyDir, metricId, `${batchId}.strategy.json`);
    try {
      const content = await fs.readFile(strategyFile, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      // Fallback to simpler path
      const altPath = path.join(strategyDir, `${metricId}_${batchId}.strategy.json`);
      const content = await fs.readFile(altPath, 'utf-8');
      return JSON.parse(content);
    }
  }
}
