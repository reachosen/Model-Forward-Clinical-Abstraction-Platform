/**
 * CPPO Core Types
 *
 * Central type definitions for Clinical Progressive Plan Orchestrator
 */

import { PlannerPlanV2, PlanningInput } from '../models/PlannerPlan';
import { ResearchBundle } from '../models/ResearchBundle';
import { SemanticMetric, SemanticSignals, SemanticPriority } from '../utils/semanticPacketLoader';

// ============================================================================
// Stage IDs and Status
// ============================================================================

export type StageId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type StageStatus = 'success' | 'failed' | 'skipped';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================================
// Orchestrator Configuration
// ============================================================================

export interface OrchestratorConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  enableManifest?: boolean;
  mode?: 'runtime' | 'eval';
}

export interface OrchestratorResult {
  status: 'success' | 'failed';
  plan?: PlannerPlanV2;
  manifest: RunManifest;
  errors?: string[];
}

// ============================================================================
// Stage 0: Input Normalization & Routing
// ============================================================================

export interface InferredMetadata {
  domain_hints?: string[];
  patient_context?: string;
  confidence?: number;
}

export interface RoutedInput {
  planning_input: PlanningInput;
  concern_id: string;
  raw_domain?: string;
  inferred_metadata?: InferredMetadata;
}

// ============================================================================
// Stage 1: Domain & Archetype & Ranking Context Resolution
// ============================================================================

export type ArchetypeType =
  | 'Process_Auditor'
  | 'Preventability_Detective'
  | 'Preventability_Detective_Metric'
  | 'Exclusion_Hunter'
  | 'Data_Scavenger'
  | 'Delay_Driver_Profiler'
  | 'Outcome_Tracker';

export interface RankingContext {
  specialty_name: string;
  rank?: number;
  summary?: string;
  top_performer_benchmarks?: string;
  quality_differentiators?: string[];
  signal_emphasis?: string[];
}

export interface PacketContext {
  metric: SemanticMetric;
  signals: SemanticSignals;
  priorities: SemanticPriority;
}

export interface SemanticContext {
  packet?: PacketContext;
  ranking?: RankingContext;
  clinical?: any; // Placeholder for patient clinical context
}

export interface DomainContext {
  domain: string;
  archetypes: ArchetypeType[]; // Changed from archetype (singular)
  primary_archetype: ArchetypeType; // For UI/Summary
  semantic_context: SemanticContext; // Consolidated context
}

// ============================================================================
// Stage 2: Structural Skeleton
// ============================================================================

export interface SignalGroupSkeleton {
  group_id: string;
  display_name: string;
  description: string;
  signals: any[];
}

export interface StructuralSkeleton {
  plan_metadata: {
    plan_id: string;
    concern: {
      concern_id: string;
      concern_type: 'HAC' | 'USNWR';
      domain: string;
    };
  };
  clinical_config: {
    signals: {
      signal_groups: SignalGroupSkeleton[];
    };
  };
}

// ============================================================================
// Stage 3: Task Graph Identification
// ============================================================================

export type TaskType =
  | 'signal_enrichment'
  | 'event_summary'
  | 'summary_20_80'
  | 'followup_questions'
  | 'clinical_review_plan'
  | 'multi_archetype_synthesis';

export interface TaskNode {
  id: string;
  type: TaskType;
  description?: string;
}

export interface TaskGraph {
  graph_id: string;
  nodes: TaskNode[];
  edges: [string, string][];
  constraints: {
    must_run: string[];
    optional: string[];
  };
}

// ============================================================================
// Stage 4: Task-Based Prompt Plan Generation
// ============================================================================

export interface PromptConfig {
  template_id: string;
  model: string;
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema_ref?: string;
}

export interface PromptPlanNode {
  id: string;
  type: TaskType;
  prompt_config: PromptConfig;
}

export interface PromptPlan {
  graph_id: string;
  nodes: PromptPlanNode[];
}

// ============================================================================
// Stage 5: Task Execution & Local Validation
// ============================================================================

export interface TaskInput {
  node: TaskNode;
  prompt_config: PromptConfig;
  context: {
    skeleton: StructuralSkeleton;
    domainContext: DomainContext;
    previousTaskOutputs: Map<string, any>;
    researchBundle?: ResearchBundle;
  };
}

export interface TaskValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics?: Record<string, number>;
}

export interface TaskOutput {
  taskId: string;
  output: any;
  validation: TaskValidationResult;
}

// ============================================================================
// Stage 6: Plan Assembly & Global Validation
// ============================================================================

export interface ValidationCheckItem {
  id: string;
  description: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
}

export interface GlobalValidation {
  tiers: {
    tier1_passed: boolean;
    tier2_passed: boolean;
    tier3_passed?: boolean;
  };
  checklist: ValidationCheckItem[];
  score?: number;
}

// ============================================================================
// Stage Context (Runtime state shared across stages)
// ============================================================================

export interface StageResult {
  stageId: StageId;
  status: StageStatus;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  validator?: string;
  errors?: string[];
  warnings?: string[];
  retryCount?: number;
}

export interface StageContext {
  // Accumulated outputs from previous stages
  routedInput?: RoutedInput;
  domainContext?: DomainContext;
  skeleton?: StructuralSkeleton;
  taskGraph?: TaskGraph;
  promptPlan?: PromptPlan;
  taskOutputs?: Map<string, TaskOutput>;

  // Metadata
  runId: string;
  mode: 'runtime' | 'eval';
  config: OrchestratorConfig;

  // Logging/manifest
  stageResults: Map<StageId, StageResult>;
}

// ============================================================================
// Stage Definition (Metadata for each stage)
// ============================================================================

export interface StageDefinition {
  id: StageId;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  validator: string;
  retryable: boolean;
}

// ============================================================================
// Run Manifest (Observability)
// ============================================================================

export interface RunManifest {
  run_id: string;
  mode: 'runtime' | 'eval';
  timestamp: string;

  // Input
  input: {
    concern_id: string;
    domain?: string;
  };

  // Stages executed
  stages: {
    [stageId: string]: {
      status: StageStatus;
      durationMs: number;
      validator?: string;
      errors?: string[];
      warnings?: string[];
      retryCount?: number;
    };
  };

  // Prompt versions used (S5)
  prompts: {
    [taskId: string]: string;
  };

  // Models used (S5)
  models: {
    [taskId: string]: string;
  };

  // Metrics
  metrics: {
    total_duration_ms: number;
    stage_durations_ms: Record<StageId, number>;
  };

  // Output (if successful)
  output?: {
    plan_id?: string;
    validation_score?: number;
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export interface Validator<T> {
  validate(input: T): ValidationResult;
}

// ============================================================================
// Eval Mode Types
// ============================================================================

export interface PromptTaskId {
  domain: string;
  archetype: string;
  task_type: TaskType;
}

export interface EvalCase {
  case_id: string;
  planning_input: PlanningInput;
  patient_payload?: any;
  expected_properties?: Record<string, any>;
}

export interface EvalDataset {
  id: string;
  cases: EvalCase[];
}

export interface EvalResult {
  eval_id: string;
  task: PromptTaskId;
  prompt_version: string;
  dataset_id: string;

  metrics: {
    total_cases: number;
    structural_pass_rate: number;
    coverage?: number;
    avg_length?: number;
    [key: string]: number | undefined;
  };

  failures_sample: EvalCase[];
  manifest: RunManifest;
}
