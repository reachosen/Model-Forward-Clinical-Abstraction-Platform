# Clinical Progressive Plan Orchestrator (CPPO) - Architecture

**Date**: 2025-11-29
**Version**: 1.0.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Interfaces](#core-interfaces)
3. [Stage Definitions](#stage-definitions)
4. [Folder Structure](#folder-structure)
5. [Data Flow](#data-flow)
6. [Implementation Guidelines](#implementation-guidelines)

---

## Architecture Overview

### Design Principles

**1. Progressive Execution**: 7 stages (S0-S6) with hard validation gates
**2. Separation of Concerns**: TaskGraph (what/order) ⊥ PromptPlan (how/config) ⊥ Execution (run)
**3. Observability First**: Every run emits run_manifest.json
**4. Modularity**: Swap prompts/tasks without touching orchestrator
**5. Reuse Existing Intelligence**: Import domainRouter, intentInference, validators

### High-Level Flow

```
Input → S0 → S1 → S2 → S3 → S4 → S5 → S6 → Output
         ↓    ↓    ↓    ↓    ↓    ↓    ↓
       Gate  Gate Gate Gate Gate Gate Gate
```

**Dual Modes**:
- **Runtime**: Full pipeline (S0→S6) → PlannerPlanV2
- **Eval**: Partial pipeline (S0→S4, then selected S5 tasks) → EvalResult

---

## Core Interfaces

### 1. MetaOrchestrator

```typescript
/**
 * MetaOrchestrator - Main controller for CPPO pipeline
 *
 * Responsibilities:
 * - Execute stages in sequence
 * - Enforce validation gates
 * - Handle retries with context
 * - Emit run_manifest.json
 */
export interface MetaOrchestrator {
  /**
   * Run full pipeline (Runtime mode)
   */
  runPipeline(
    input: PlanningInput,
    config: OrchestratorConfig
  ): Promise<OrchestratorResult>;

  /**
   * Run eval pipeline (Eval mode)
   */
  runEval(
    taskId: PromptTaskId,
    dataset: EvalDataset,
    promptVersion: string,
    config: OrchestratorConfig
  ): Promise<EvalResult>;

  /**
   * Get stage registry (for inspection/debugging)
   */
  getStageRegistry(): StageDefinition[];

  /**
   * Get context for a specific stage
   */
  getStageContext(stageId: StageId): StageContext;
}

export type StageId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

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
```

---

### 2. Stage Definitions

```typescript
/**
 * StageDefinition - Metadata for each stage
 */
export interface StageDefinition {
  id: StageId;
  name: string;
  description: string;
  inputs: string[];   // e.g., ["PlanningInput"]
  outputs: string[];  // e.g., ["RoutedInput"]
  validator: string;  // Class name or function name
  retryable: boolean;
}

/**
 * StageContext - Runtime context passed between stages
 */
export interface StageContext {
  // Accumulated outputs from previous stages
  routedInput?: RoutedInput;           // From S0
  domainContext?: DomainContext;       // From S1
  skeleton?: StructuralSkeleton;       // From S2
  taskGraph?: TaskGraph;               // From S3
  promptPlan?: PromptPlan;             // From S4
  taskOutputs?: Map<string, any>;      // From S5

  // Metadata
  runId: string;
  mode: 'runtime' | 'eval';
  config: OrchestratorConfig;

  // Logging/manifest
  stageResults: Map<StageId, StageResult>;
}

export interface StageResult {
  stageId: StageId;
  status: 'success' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  validator?: string;
  errors?: string[];
  warnings?: string[];
  retryCount?: number;
}
```

---

### 3. Stage 0 - Input Normalization & Routing

```typescript
/**
 * S0: Input Normalization & Routing
 *
 * Purpose: Validate input, extract concern_id, normalize structure
 * Reuses: intentInference.ts for free-text → structured metadata
 */
export interface RoutedInput {
  planning_input: PlanningInput;
  concern_id: string;
  raw_domain?: string;
  inferred_metadata?: InferredMetadata; // From intentInference
}

export interface S0_InputNormalizationStage {
  execute(input: PlanningInput): Promise<RoutedInput>;
  validate(output: RoutedInput): ValidationResult;
}

// Gate: required fields present; concern_id recognized
```

---

### 4. Stage 1 - Domain & Archetype & Ranking Context Resolution

```typescript
/**
 * S1: Domain & Archetype Resolution
 *
 * Purpose: Map concern_id → (domain, archetype), load ranking context
 * Reuses: ARCHETYPE_MATRIX from plannerAgent.ts, rankingsLoader
 */
export interface DomainContext {
  domain: string;        // "orthopedics", "HAC", etc.
  archetype: ArchetypeType;
  ranking_context?: RankingContext;
}

export interface RankingContext {
  specialty_name: string;
  rank?: number;       // e.g., 20 or 11
  summary?: string;    // "Lurie is ranked #20 in Orthopedics"
}

export interface S1_DomainResolutionStage {
  execute(input: RoutedInput): Promise<DomainContext>;
  validate(output: DomainContext): ValidationResult;
}

// Gate: domain + archetype must resolve; if ranked, ranking_context must be present
```

---

### 5. Stage 2 - Structural Skeleton (V9.1)

```typescript
/**
 * S2: Structural Skeleton
 *
 * Purpose: Build V9.1-compliant skeleton with 5 signal groups
 * Reuses: HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS from domainRouter.ts
 */
export interface SignalGroupSkeleton {
  group_id: string;      // "rule_in", "rule_out", etc.
  display_name: string;
  description: string;
  signals: any[];        // Empty here; filled in S5
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

export interface S2_StructuralSkeletonStage {
  execute(
    input: RoutedInput,
    domainCtx: DomainContext
  ): Promise<StructuralSkeleton>;
  validate(output: StructuralSkeleton): ValidationResult;
}

// Gate: Exactly 5 signal groups; group_ids ∈ allowed set per domain
// Use OpenAI structured outputs / json_schema if available
```

---

### 6. Stage 3 - Task Graph Identification

```typescript
/**
 * S3: Task Graph Identification
 *
 * Purpose: Build domain/archetype-specific TaskGraph
 */
export type TaskType =
  | 'signal_enrichment'
  | 'event_summary'
  | 'summary_20_80'
  | 'followup_questions'
  | 'clinical_review_plan';

export interface TaskNode {
  id: string;         // "S_ENRICH", "EV_SUM", etc.
  type: TaskType;
  description?: string;
}

export interface TaskGraph {
  graph_id: string;   // "ortho_I25_v1"
  nodes: TaskNode[];
  edges: [string, string][]; // [from, to] by node id
  constraints: {
    must_run: string[];   // node IDs that must execute
    optional: string[];   // node IDs that can be skipped
  };
}

export interface S3_TaskGraphStage {
  execute(
    domainCtx: DomainContext,
    skeleton: StructuralSkeleton
  ): Promise<TaskGraph>;
  validate(graph: TaskGraph): ValidationResult;
}

// Gate: Graph is acyclic; all must_run nodes exist; all types ∈ TaskType
```

---

### 7. Stage 4 - Task-Based Prompt Plan Generation

```typescript
/**
 * S4: Prompt Plan Generation
 *
 * Purpose: For each task, attach PromptConfig
 */
export interface PromptConfig {
  template_id: string;   // "ortho.process_auditor.signal_enrichment.v3"
  model: string;         // "gpt-4o", "gpt-4o-mini"
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema_ref?: string;   // Required if response_format = "json_schema"
}

export interface PromptPlanNode {
  id: string;        // Same as TaskNode.id
  type: TaskType;
  prompt_config: PromptConfig;
}

export interface PromptPlan {
  graph_id: string;  // Same as TaskGraph.graph_id
  nodes: PromptPlanNode[];
}

export interface S4_PromptPlanStage {
  execute(
    taskGraph: TaskGraph,
    domainCtx: DomainContext
  ): Promise<PromptPlan>;
  validate(plan: PromptPlan): ValidationResult;
}

// Gate: All task nodes have corresponding prompt plan nodes; templates exist
```

---

### 8. Stage 5 - Task Execution & Local Validation

```typescript
/**
 * S5: Task Execution
 *
 * Purpose: Execute each task node with LLM, validate locally
 */
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

export interface TaskOutput {
  taskId: string;
  output: any;       // Task-specific output
  validation: TaskValidationResult;
}

export interface TaskValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics?: Record<string, number>;
}

export interface TaskRunner {
  /**
   * Execute a single task
   */
  runTask(input: TaskInput): Promise<TaskOutput>;

  /**
   * Validate task output
   */
  validateTask(
    taskType: TaskType,
    output: any
  ): TaskValidationResult;
}

export interface S5_TaskExecutionStage {
  execute(
    taskGraph: TaskGraph,
    promptPlan: PromptPlan,
    context: StageContext
  ): Promise<Map<string, TaskOutput>>;
}

// Gate (per task):
// - signal_enrichment: All 5 groups filled, valid signal IDs
// - event_summary: Length bounds, mentions rank if applicable
// - summary_20_80: ≤500 tokens, mentions main risk
// - followup_questions: ≥1 question per high-priority signal
// - clinical_review_plan: Tools ⊆ allowed set
```

---

### 9. Stage 6 - Plan Assembly & Global Validation

```typescript
/**
 * S6: Plan Assembly & Global Validation
 *
 * Purpose: Combine all outputs into PlannerPlanV2, run Tier 1/2/3 validation
 * Reuses: validatePlan.ts, validateV91.ts, qualityAssessment.ts
 */
export interface GlobalValidation {
  tiers: {
    tier1_passed: boolean; // Structural
    tier2_passed: boolean; // Semantic
    tier3_passed?: boolean; // Clinical accuracy
  };
  checklist: ValidationCheckItem[];
  score?: number;
}

export interface ValidationCheckItem {
  id: string;
  description: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
}

export interface S6_PlanAssemblyStage {
  execute(
    skeleton: StructuralSkeleton,
    taskOutputs: Map<string, TaskOutput>,
    context: StageContext
  ): Promise<PlannerPlanV2>;

  validate(plan: PlannerPlanV2): Promise<GlobalValidation>;
}

// Gate: Tier 1 must pass for plan to be "usable"
```

---

### 10. Run Manifest

```typescript
/**
 * RunManifest - Observability/debugging artifact
 *
 * Written for EVERY run (success or failure)
 */
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
      status: 'success' | 'failed' | 'skipped';
      durationMs: number;
      validator?: string;
      errors?: string[];
      warnings?: string[];
      retryCount?: number;
    };
  };

  // Prompt versions used (S5)
  prompts: {
    [taskId: string]: string; // template_id
  };

  // Models used (S5)
  models: {
    [taskId: string]: string; // model name
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
```

---

### 11. Eval Mode

```typescript
/**
 * Eval Mode - A/B test prompts on datasets
 */
export interface PromptTaskId {
  domain: string;       // "orthopedics"
  archetype: string;    // "process_auditor"
  task_type: TaskType;  // "summary_20_80"
}

export interface EvalDataset {
  id: string;
  cases: EvalCase[];
}

export interface EvalCase {
  case_id: string;
  planning_input: PlanningInput;
  patient_payload?: any;
  expected_properties?: Record<string, any>; // Not full gold plan
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
    // Task-specific metrics
    [key: string]: number;
  };

  failures_sample: EvalCase[]; // Subset of failing cases
  manifest: RunManifest;
}
```

---

### 12. Validation Utilities

```typescript
/**
 * Validation Result - Used across all stages
 */
export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

/**
 * Validator interface - Common contract
 */
export interface Validator<T> {
  validate(input: T): ValidationResult;
}
```

---

## Folder Structure

```
clinical-planner-cli/
├── orchestrator/                    # NEW - CPPO core
│   ├── MetaOrchestrator.ts         # Main orchestrator
│   ├── StageRegistry.ts            # Stage definitions
│   ├── StageContext.ts             # Runtime context
│   ├── RunManifest.ts              # Manifest writer
│   │
│   ├── stages/                     # Stage implementations
│   │   ├── S0_InputNormalization.ts
│   │   ├── S1_DomainResolution.ts
│   │   ├── S2_StructuralSkeleton.ts
│   │   ├── S3_TaskGraph.ts
│   │   ├── S4_PromptPlan.ts
│   │   ├── S5_TaskExecution.ts
│   │   └── S6_PlanAssembly.ts
│   │
│   ├── tasks/                      # Task implementations
│   │   ├── TaskRunner.ts           # Abstract runner
│   │   ├── SignalEnrichmentTask.ts
│   │   ├── EventSummaryTask.ts
│   │   ├── Summary2080Task.ts
│   │   ├── FollowupQuestionsTask.ts
│   │   └── ClinicalReviewPlanTask.ts
│   │
│   └── validators/                 # Stage & task validators
│       ├── StageValidators.ts
│       ├── TaskValidators.ts
│       └── ValidationUtils.ts
│
├── prompts/                        # NEW - Versioned prompts
│   ├── registry.ts                 # Prompt registry & loader
│   │
│   ├── orthopedics/
│   │   └── process_auditor/
│   │       ├── signal_enrichment/
│   │       │   ├── v3.ts          # Embedded in code (Phase 1)
│   │       │   └── v4.ts
│   │       ├── summary_20_80/
│   │       │   ├── v3.ts
│   │       │   └── v4.ts
│   │       └── ...
│   │
│   ├── hac/
│   │   └── preventability_detective/
│   │       └── signal_enrichment/
│   │           └── v3.ts
│   │
│   └── endocrinology/
│       └── preventability_detective_metric/
│           └── ...
│
├── eval/                           # NEW - Eval mode
│   ├── EvalRunner.ts               # Eval orchestrator
│   ├── datasets/
│   │   ├── ortho_summaries_v1.json
│   │   ├── endo_enrich_v1.json
│   │   └── ...
│   └── metrics/
│       └── TaskMetrics.ts
│
├── cli/                            # CLI commands
│   ├── plan.ts                     # LEGACY (Phase 1)
│   ├── cppo-plan.ts                # NEW - CPPO runtime
│   ├── cppo-eval.ts                # NEW - CPPO eval
│   ├── learn.ts                    # Keep (learning loop)
│   └── revise.ts                   # Keep (revision)
│
├── planner/                        # LEGACY - Reused modules
│   ├── domainRouter.ts             # ✅ Reused by S2
│   ├── intentInference.ts          # ✅ Reused by S0
│   ├── llmClient.ts                # ✅ Reused by S5
│   ├── validatePlan.ts             # ✅ Reused by S6
│   ├── validateV91.ts              # ✅ Reused by S6
│   ├── qualityAssessment.ts        # ✅ Reused by S6
│   ├── externalValidator.ts        # ✅ Reused by S6
│   │
│   ├── plannerAgent.ts             # ❌ DELETE in Phase 4 (legacy monolith)
│   ├── llmPlanGeneration.ts        # ❌ DELETE in Phase 4
│   └── researchAugmentedPlanner.ts # ❌ DELETE in Phase 4
│
├── models/                         # Shared data models
│   ├── PlannerPlan.ts              # ✅ Keep (PlannerPlanV2)
│   ├── PlanningInput.ts            # ✅ Keep
│   ├── ResearchBundle.ts           # ✅ Keep
│   ├── QualityAttributes.ts        # ✅ Keep
│   └── ...
│
├── research/                       # Research integration
│   └── ...                         # ✅ Keep as-is
│
├── utils/                          # Utilities
│   ├── domainDetection.ts
│   ├── rankingsLoader.ts           # ✅ Reused by S1
│   └── ...
│
├── examples/                       # Example inputs
│   ├── i25_planning_input.json
│   ├── clabsi_picu_input.json
│   └── ...
│
├── archive/                        # Stale files (delete after 30 days)
│   └── ...
│
├── CPPO_ANALYSIS.md               # Planning docs
├── MIGRATION_ROADMAP.md
├── USER_STORIES.md
├── ARCHITECTURE.md                # This file
└── package.json
```

---

## Data Flow

### Runtime Mode (Full Pipeline)

```
┌──────────────────┐
│ PlanningInput    │
└────────┬─────────┘
         │
         ▼
    ┌────────────────────────────────────────────────┐
    │ S0: Input Normalization & Routing              │
    │ Reuses: intentInference.ts                     │
    │ Output: RoutedInput { concern_id, domain }     │
    └────────┬───────────────────────────────────────┘
             │ Gate: concern_id valid
             ▼
    ┌────────────────────────────────────────────────┐
    │ S1: Domain & Archetype & Ranking Resolution    │
    │ Reuses: ARCHETYPE_MATRIX, rankingsLoader       │
    │ Output: DomainContext { domain, archetype, rank }│
    └────────┬───────────────────────────────────────┘
             │ Gate: archetype resolved
             ▼
    ┌────────────────────────────────────────────────┐
    │ S2: Structural Skeleton (V9.1)                 │
    │ Reuses: domainRouter (group definitions)       │
    │ Output: StructuralSkeleton (5 signal groups)   │
    └────────┬───────────────────────────────────────┘
             │ Gate: 5 groups, valid IDs
             ▼
    ┌────────────────────────────────────────────────┐
    │ S3: Task Graph Identification                  │
    │ Output: TaskGraph (nodes, edges, constraints)  │
    └────────┬───────────────────────────────────────┘
             │ Gate: DAG, must_run nodes exist
             ▼
    ┌────────────────────────────────────────────────┐
    │ S4: Prompt Plan Generation                     │
    │ Reuses: PromptRegistry                         │
    │ Output: PromptPlan (template_id, model, etc.)  │
    └────────┬───────────────────────────────────────┘
             │ Gate: All tasks have prompts
             ▼
    ┌────────────────────────────────────────────────┐
    │ S5: Task Execution & Local Validation          │
    │ Reuses: llmClient.ts                           │
    │ Tasks: signal_enrichment → event_summary →     │
    │        summary_20_80 → followup_questions →    │
    │        clinical_review_plan                    │
    │ Output: Map<taskId, TaskOutput>                │
    └────────┬───────────────────────────────────────┘
             │ Gate: Per-task validation
             ▼
    ┌────────────────────────────────────────────────┐
    │ S6: Plan Assembly & Global Validation          │
    │ Reuses: validatePlan, qualityAssessment        │
    │ Output: PlannerPlanV2                          │
    └────────┬───────────────────────────────────────┘
             │ Gate: Tier 1 must pass
             ▼
    ┌────────────────────────────────────────────────┐
    │ PlannerPlanV2 + run_manifest.json              │
    └────────────────────────────────────────────────┘
```

### Eval Mode (Partial Pipeline)

```
┌──────────────────┐
│ EvalDataset      │
│ (30 test cases)  │
└────────┬─────────┘
         │
         ▼
    ┌────────────────────────────────────────────────┐
    │ Run S0-S4 (setup)                              │
    │ Same as runtime, but on each test case         │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │ S5: Execute ONLY selected task                 │
    │ e.g., summary_20_80 with prompt v4             │
    │ Run on all 30 cases                            │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │ Aggregate Metrics                              │
    │ - structural_pass_rate: 93.3%                  │
    │ - avg_length: 412 tokens                       │
    │ - coverage_score: 0.91                         │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │ EvalResult + failures_sample                   │
    └────────────────────────────────────────────────┘
```

---

## Implementation Guidelines

### Phase 1: Scaffolding (Weeks 1-2)

**Goal**: Get basic structure working

1. **Create folder structure**
   ```bash
   mkdir -p orchestrator/{stages,tasks,validators}
   mkdir -p prompts/{orthopedics,hac,endocrinology}
   mkdir -p eval/{datasets,metrics}
   ```

2. **Define core interfaces**
   - Create `orchestrator/types.ts` with all TypeScript interfaces
   - Keep interfaces PURE (no implementation)

3. **Implement S0-S2 (foundations)**
   - S0: Wrapper around `intentInference.ts`
   - S1: Use ARCHETYPE_MATRIX, `rankingsLoader`
   - S2: Use domainRouter GROUP_DEFINITIONS

4. **Stub out S3-S6**
   - Return mock TaskGraph, PromptPlan
   - S5 calls llmClient but validates strictly
   - S6 wraps existing validators

5. **Wire up MetaOrchestrator**
   - Simple sequential executor
   - Basic gate enforcement
   - Write run_manifest.json

6. **Create cppo-plan CLI**
   - Import MetaOrchestrator
   - Call `runPipeline(input, config)`
   - Output plan + manifest

### Phase 2: Task Implementation (Weeks 3-4)

**Goal**: Real tasks, real prompts

1. **Implement TaskRunner**
   - Abstract base class
   - Concrete implementations for each TaskType

2. **Create prompt templates**
   - Start with code-embedded templates (`.ts` files)
   - Migrate to `.md` files later if needed

3. **Implement task validators**
   - Length checks, required fields, signal validation

4. **End-to-end test**
   - Run full pipeline on I25, CLABSI
   - Compare to legacy planner output

### Phase 3: Eval Mode (Weeks 5-6)

**Goal**: A/B testing capability

1. **Create eval datasets**
   - 30-50 test cases per domain/archetype
   - Store in `eval/datasets/`

2. **Implement EvalRunner**
   - Reuse MetaOrchestrator
   - Aggregate metrics across cases

3. **Create cppo-eval CLI**
   - Accept `--task`, `--prompt-version`, `--dataset`
   - Output EvalResult

4. **Test prompt improvements**
   - Upgrade one prompt (e.g., summary_20_80 v3 → v4)
   - Run eval, compare metrics
   - Document improvement

### Phase 4: Migration (Weeks 7-9)

**Goal**: Replace legacy, clean up

1. **Verify feature parity**
   - CPPO passes 100% of legacy tests
   - Performance within 10%

2. **Add deprecation warnings**
   - Update `cli/plan.ts` with warning
   - Update README

3. **Remove legacy code**
   - Delete `plannerAgent.ts`, `llmPlanGeneration.ts`
   - Rename `cppo-plan` → `plan`
   - Ship v3.0.0

---

## Design Decisions

### Decision 1: Prompts in Code vs Files

**Decision**: Start with code-embedded (`.ts` files), migrate to `.md` later

**Rationale**:
- Easier to version with git initially
- TypeScript provides autocomplete
- Can migrate to files once structure stabilizes

**File**: `prompts/orthopedics/process_auditor/summary_20_80/v3.ts`
```typescript
export const SUMMARY_20_80_PROMPT_V3 = `
You are generating a 20/80 summary for orthopedic procedure reviews...
[prompt content]
`;
```

### Decision 2: TaskGraph - Static vs Dynamic

**Decision**: Static TaskGraphs per archetype (hardcoded)

**Rationale**:
- Simpler to implement
- Easier to test
- LLM-generated graphs add complexity without clear benefit
- Can add dynamic generation later if needed

**File**: `orchestrator/stages/S3_TaskGraph.ts`
```typescript
function buildTaskGraph(archetype: ArchetypeType): TaskGraph {
  if (archetype === 'Process_Auditor') {
    return ORTHO_PROCESS_AUDITOR_GRAPH;
  }
  // ...
}
```

### Decision 3: Retry Strategy

**Decision**: Auto-retry Tier 1 failures, manual for Tier 2/3

**Rationale**:
- Tier 1 (structural) errors often fixable by LLM with context
- Tier 2/3 (semantic/clinical) require human review
- Limit auto-retries to 2 max (avoid cost spiral)

---

## Next Steps

1. ✅ Architecture designed
2. **Create skeleton files** (orchestrator/, prompts/, eval/)
3. **Implement S0-S2** (reuse existing modules)
4. **Test basic pipeline** (S0→S2 working)
5. **Implement S3-S6** (full pipeline)
6. **Create eval mode** (A/B testing)
7. **Feature parity testing** (compare to legacy)
8. **Migration** (deprecate → remove legacy)

