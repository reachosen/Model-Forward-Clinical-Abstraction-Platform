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

/**
 * Signal coverage for a scenario.
 * - "present": Signal should be detected
 * - "absent": Signal should NOT be detected
 * - "ambiguous": Edge case for doubt testing
 */
export type SignalPresence = 'present' | 'absent' | 'ambiguous';

export interface GenerationScenario {
  id?: string;
  description: string;
  archetype: string;
  signals?: Record<string, SignalPresence>; // e.g., { "infection_risks": "present" }
  duet?: DuetProfile;
  doubt?: DoubtModifier[];
}

export interface CoverageGoals {
  formula?: string; // e.g., "per_task × (2 pass + 2 fail + 2 doubt)"
  signal_groups?: number;
  min_scenarios?: number;
  recommended_scenarios?: number;
  min_per_task?: number;
  recommended_per_task?: number;
  min_archetypes?: number;
  doubt_ratio: number; // 0.0 - 1.0 (percent of cases with doubt)
  doubt_mix?: ('missing_data' | 'conflict' | 'adversarial' | 'ambiguity')[]; // Required types
  outcome_balance?: { positive: number; negative: number }; // Target ratios
}

/**
 * Auto-derivation configuration for generating scenarios from semantic definitions
 */
export interface AutoDeriveConfig {
  enabled: boolean;
  pass_per_signal_group: number;    // 1 pass scenario per signal group
  fail_per_signal_group: number;    // 1 fail scenario per signal group
  doubt_per_ambiguity_trigger: number;  // 1 doubt per ambiguity_trigger
  minimum_doubt_ratio: number;      // At least 20% doubt scenarios (0.20)
}

/**
 * DR (Doubt Recognition) expectation for test case evaluation
 * Task-aware: different fields apply to different task types
 */
export interface DRExpectation {
  // For clinical_review_plan
  should_escalate?: boolean;           // Expected: overall_call === 'needs_clinical_review'
  expected_concern_keywords?: string[]; // What should appear in concerns_or_flags

  // For event_summary
  should_flag_incomplete?: boolean;    // Expected: timeline_complete === false

  // For signal_enrichment
  expected_signal_gap?: boolean;       // Expected: fewer signals than normal
  expected_signal_count?: number;      // Expected max signal count for doubt
  uncertainty_keywords?: string[];     // Keywords indicating extraction uncertainty

  // For followup_questions
  should_probe_ambiguity?: boolean;    // Expected: questions probe specific gap
  probe_keywords?: string[];           // Keywords that should appear in questions
}

/**
 * Task-specific scenario with expected output for evaluation
 */
export interface TaskScenario extends GenerationScenario {
  type?: 'pass' | 'fail' | 'doubt';
  expected?: Record<string, unknown>; // Task-specific expected output
  doubt_recognition?: DRExpectation;  // DR expectations for doubt scenarios
}

/**
 * Per-task scenario configuration
 */
export interface TaskScenarioConfig {
  description: string;
  output_schema: string;
  scenarios: TaskScenario[];
}

export interface BatchStrategy {
  metric_id: string;
  domain: string;
  // Legacy: shared scenarios across tasks
  task_ids?: string[];
  scenarios?: GenerationScenario[];
  // New: per-task scenarios
  task_scenarios?: Record<string, TaskScenarioConfig>;
  coverage_goals?: CoverageGoals;
  global_duet?: DuetProfile;
  // Auto-derivation config for generating scenarios from semantic definitions
  auto_derive?: AutoDeriveConfig;
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
