import * as fs from 'fs';
import * as path from 'path';

export interface DoubtModifier {
  type: 'missing_data' | 'conflict' | 'adversarial' | 'ambiguity';
  instruction: string;
}

export interface DuetProfile {
  knowledge_source_id: string; // e.g. "guidelines_v1"
  persona: string;             // e.g. "Strict Auditor"
}

export interface GenerationScenario {
  description: string;
  archetype: string;
  duet?: DuetProfile;
  doubt?: DoubtModifier[];
}

export interface CoverageGoals {
  min_scenarios: number;
  min_archetypes: number;
  doubt_ratio: number; // 0.0 - 1.0 (percent of cases with doubt)
  doubt_mix?: ('missing_data' | 'conflict' | 'adversarial' | 'ambiguity')[]; // Required types
  outcome_balance?: { positive: number; negative: number }; // Target ratios
}

export interface BatchStrategy {
  metric_id: string;
  domain: string;
  task_ids: string[];
  coverage_goals?: CoverageGoals; // Optional targets
  global_duet?: DuetProfile;
  scenarios: GenerationScenario[];
}

interface MetadataFile {
  strategies: BatchStrategy[];
}

const METADATA_PATH = path.join(__dirname, 'batch_strategies.metadata.json');

export function loadBatchStrategy(metric_id: string): BatchStrategy {
  if (!fs.existsSync(METADATA_PATH)) {
    throw new Error(`Batch strategy metadata file not found at: ${METADATA_PATH}`);
  }

  const raw = fs.readFileSync(METADATA_PATH, 'utf-8');
  const metadata: MetadataFile = JSON.parse(raw);

  const strategy = metadata.strategies.find(s => s.metric_id === metric_id);
  if (!strategy) {
    throw new Error(`No batch strategy found for metric_id: ${metric_id}`);
  }

  return strategy;
}

export function getAllBatchStrategies(): BatchStrategy[] {
  if (!fs.existsSync(METADATA_PATH)) return [];
  const raw = fs.readFileSync(METADATA_PATH, 'utf-8');
  return JSON.parse(raw).strategies;
}
