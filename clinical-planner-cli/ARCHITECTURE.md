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

### Planning Factory in the Larger Platform

CPPO is the **Planning Factory** for the Model-Forward Clinical Abstraction Platform.

Other factories (out of scope for this doc):

- **Schema Factory** – takes PlannerPlanV2 → Snowflake/GOLD_AI schemas
- **App Factory** – takes PlannerPlanV2 → UI/workbench configs
- **Prompt Refinery Factory** – uses CPPO eval mode to improve prompts per task

This keeps ARCHITECTURE.md scoped, but shows how it fits the bigger picture.

---

### Design Principles

**1. Progressive Execution with Quality Gates**: 7 stages (S0-S6) with 3-tier validation
   - Each stage validates its output before proceeding (see [QUALITY_CRITERIA.md](./orchestrator/QUALITY_CRITERIA.md))
   - Tier 1 failures HALT pipeline (structural correctness non-negotiable)
   - Tier 2 failures WARN but continue (semantic issues logged)
   - Tier 3 is aspirational (optional quality scoring)

**2. Context-Aware Quality**: Quality criteria adapt to domain, archetype, and task
   - HAC plans validated against HAC standards (CDC NHSN compliance)
   - USNWR plans validated against USNWR standards (ranking awareness for top 20)
   - Process_Auditor validated differently than Preventability_Detective
   - See [CONTEXT_AWARE_QUALITY.md](./orchestrator/CONTEXT_AWARE_QUALITY.md)

**3. Quality-Guided Generation**: Use quality criteria to GUIDE generation, not just VALIDATE
   - Pre-populate deterministic outputs (S2 signal groups from templates)
   - Constrain LLM with JSON schemas (S5 signals must have evidence_type)
   - Inject requirements into prompts (S5 summaries MUST mention rank if top 20)
   - Result: Plans "correct by construction" not "corrected by validation"
   - See [QUALITY_GUIDED_GENERATION.md](./orchestrator/QUALITY_GUIDED_GENERATION.md)

**4. Separation of Concerns**: TaskGraph (what/order) ⊥ PromptPlan (how/config) ⊥ Execution (run)

**5. Observability First**: Every run emits run_manifest.json with validation results

**6. Modularity & Reuse**: Swap prompts/tasks without touching orchestrator; reuse existing validators

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

## Quality-First Architecture ⭐

CPPO embeds quality at every level through three principles:

### 1. Three-Tier Quality Model

**Tier 1: Structural Correctness** (CRITICAL - must pass)
- Schema completeness (10 sections)
- Five-group rule (exactly 5 signal groups)
- Evidence types (all signals have L1/L2/L3)
- Tool references (no dangling links)
- **Policy**: Pipeline HALTS if Tier 1 fails

**Tier 2: Semantic Correctness** (HIGH/MEDIUM - warnings)
- Template match (groups align with domain)
- Archetype compatibility (structure fits archetype)
- Ranking awareness (USNWR top 20 mention rank)
- Provenance sources (signals cite authorities)
- Pediatric safety (age-appropriate language)
- **Policy**: Warnings logged, pipeline CONTINUES

**Tier 3: Clinical Quality** (ASPIRATIONAL - optional)
- Clinical accuracy (LLM-based assessment)
- Actionability (clear next steps)
- Completeness (all aspects covered)
- **Policy**: Quality scoring only

### 2. Context-Aware Quality Criteria

Quality standards adapt based on **Domain × Archetype × Task**:

```
Domain (HAC vs Orthopedics)
   ×
Archetype (Process_Auditor vs Preventability_Detective)
   ×
Task (signal_enrichment vs event_summary)
   =
Specific Quality Criteria for THIS context
```

**Example: S2 Signal Groups**
- HAC → Must use `['rule_in', 'rule_out', 'delay_drivers', 'documentation_gaps', 'bundle_gaps']`
- Orthopedics (ranked #20) → Must use signal_emphasis from rankings
- Orthopedics (unranked) → Must use ORTHO_GROUP_DEFINITIONS defaults

**Example: S5 Event Summary**
- Process_Auditor → Must describe "protocol adherence timeline"
- Preventability_Detective → Must state "preventability determination"
- USNWR top 20 → Must mention "ranked #20 in Pediatric Orthopedics"

### 3. Quality-Guided Generation (Prevention > Detection)

**Traditional Approach** (Generate → Validate → Retry):
```
Generate → Hope it's good → Validate → Fail → Retry with context → Maybe succeed
↑ Costs: 3-5 LLM calls, 30-60s latency, $0.01-0.05 per failure
```

**Quality-Guided Approach** (Criteria → Guide → Generate → Confirm):
```
Quality Criteria → Guide Generation → Generate Correctly → Validate (Confirm)
↑ Benefits: 1 LLM call, instant, $0 waste, predictable
```

**Implementation Strategies**:

| Strategy | When to Use | Example (Stage) | Benefit |
|----------|-------------|-----------------|---------|
| **Pre-Population** | Output is deterministic | S2: Signal groups from templates | Zero LLM calls, can't fail |
| **JSON Schema** | Structure is known, content varies | S5: Signals must have evidence_type | Impossible to omit required fields |
| **Prompt Injection** | Requirements guide narrative | S5: "MUST mention rank if top 20" | Tier 2 failures become rare |
| **Templates** | Predictable structure + variable content | S5: Event summary template | Consistent structure guaranteed |
| **Incremental Validation** | Complex multi-part generation | S5: Validate tools before order | Fail fast, no cascading errors |

**Real Example from S2**:
```typescript
// ❌ Traditional: Ask LLM to generate groups (unpredictable)
const groups = await llm.call("Generate 5 signal groups for HAC");
validate(groups); // Might fail: wrong groups, wrong count, etc.

// ✅ Quality-Guided: Pre-populate from known template (deterministic)
if (domain === 'HAC') {
  return HAC_GROUP_DEFINITIONS.map(def => ({
    group_id: def.group_id,
    display_name: def.display_name,
    description: def.description,
    signals: [] // LLM fills this later in S5
  }));
}
// Validation always passes - we built it correctly by construction
```

### Quality Gates at Every Stage

Each stage has a quality gate enforcing the 3-tier model:

```
S0 → Validate → 🚦 GATE → PASS ✅ → S1
                         HALT ❌ (if Tier 1 fails)
                         WARN ⚠️ (if Tier 2 fails)

S1 → Validate → 🚦 GATE → PASS ✅ → S2
                         HALT ❌
                         WARN ⚠️

S2 → Validate → 🚦 GATE → PASS ✅ → S3
                         HALT ❌ (e.g., ≠ 5 groups)
                         WARN ⚠️ (e.g., groups don't match domain template)

... (S3-S5) ...

S6 → Global Validate → 🚦 FINAL GATE → Output PlannerPlanV2
                                       (Tier 1 MUST pass)
```

**Stage-Specific Quality Criteria**:

| Stage | Critical Criteria (Tier 1) | Context-Aware Criteria (Tier 2) |
|-------|---------------------------|----------------------------------|
| S0 | concern_id extracted, valid format | concern_id in known set (USNWR/HAC) |
| S1 | domain & archetype resolved | USNWR top 20: ranking_context present |
| S2 | **Exactly 5 signal groups** ⭐ | Groups match domain template, rankings |
| S3 | TaskGraph is DAG, must_run nodes exist | Graph matches archetype expectations |
| S4 | All tasks have prompts, templates exist | Prompt versions match task requirements |
| S5 | All signals have evidence_type ⭐ | Signals cite domain-specific sources |
| S6 | All 10 sections, 5 groups, evidence_type, no broken refs | Ranking mentions, provenance, pediatric safety |

**Documentation**:
- **[QUALITY_CRITERIA.md](./orchestrator/QUALITY_CRITERIA.md)** - Complete quality standards (Tier 1/2/3)
- **[CONTEXT_AWARE_QUALITY.md](./orchestrator/CONTEXT_AWARE_QUALITY.md)** - Domain/archetype/task-specific validation
- **[QUALITY_GUIDED_GENERATION.md](./orchestrator/QUALITY_GUIDED_GENERATION.md)** - Prevention-based generation strategies

**Result**: Plans that are **correct** (Tier 1), **relevant** (context-aware), and **predictable** (quality-guided).

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
 *
 * Dual Planes:
 * - `runPipeline` = Planning Factory (runtime plane)
 * - `runEval`     = Prompt Refinery Factory (eval plane)
 */
export interface MetaOrchestrator {
  /**
   * Run full pipeline (Runtime mode) - Planning Factory
   */
  runPipeline(
    input: PlanningInput,
    config: OrchestratorConfig
  ): Promise<OrchestratorResult>;

  /**
   * Run eval pipeline (Eval mode) - Prompt Refinery Factory
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
 * Purpose: Map concern_id → (domain, archetype), load ranking context (USNWR only)
 * Reuses: ARCHETYPE_MATRIX from plannerAgent.ts, rankingsLoader.ts
 *
 * CRITICAL DISTINCTION:
 * - USNWR cases (I25, C35, etc.): Load ranking_context via rankingsLoader
 * - HAC cases (CLABSI, CAUTI, VAP): ranking_context = null (HAC is safety, not rankings)
 *
 * rankingsLoader.ts provides:
 * 1. getRankingForConcern(concernId) → { specialty, rank }
 * 2. getRankingContext(concernId) → Prompt injection string (top 20 only)
 * 3. getTopPerformerBenchmarks(domain) → Boston Children's, CHOP, Stanford strengths
 * 4. getSignalEmphasis(domain) → 5 signal groups based on quality differentiators
 */
export interface DomainContext {
  domain: string;        // "orthopedics", "HAC", "endocrinology", etc.
  archetype: ArchetypeType;
  ranking_context?: RankingContext;  // Optional - only for USNWR cases
}

export interface RankingContext {
  specialty_name: string;              // "Orthopedics", "Diabetes & Endocrinology"
  rank?: number;                       // e.g., 20, 11
  summary?: string;                    // "Lurie is ranked #20 in Pediatric Orthopedics"
  top_performer_benchmarks?: string;   // From getTopPerformerBenchmarks()
  quality_differentiators?: string[];  // Extracted from benchmark_signals
  signal_emphasis?: string[];          // From getSignalEmphasis() - 5 groups
}

export interface S1_DomainResolutionStage {
  execute(input: RoutedInput): Promise<DomainContext>;
  validate(output: DomainContext): ValidationResult;
}

// Gate: domain + archetype must resolve; if USNWR ranked, ranking_context must be present
// Example S1 logic:
// 1. const archetype = ARCHETYPE_MATRIX[concern_id]
// 2. if (archetype is USNWR):
//      const rankingInfo = getRankingForConcern(concern_id)
//      if (rankingInfo) {
//        ranking_context = {
//          specialty_name: rankingInfo.specialty,
//          rank: rankingInfo.rank,
//          summary: getRankingContext(concern_id),
//          top_performer_benchmarks: getTopPerformerBenchmarks(domain),
//          signal_emphasis: getSignalEmphasis(domain)
//        }
//      }
// 3. else (HAC): ranking_context = null
```

---

### 5. Stage 2 - Structural Skeleton (V9.1)

```typescript
/**
 * S2: Structural Skeleton
 *
 * Purpose: Build V9.1-compliant skeleton with 5 signal groups
 * Reuses: HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS from domainRouter.ts
 *         getSignalEmphasis() from rankingsLoader.ts (USNWR only)
 *
 * CRITICAL: Exactly 5 signal groups required for V9.1 compliance
 *
 * Signal Group Selection Logic:
 * 1. HAC domains: Use HAC_GROUP_DEFINITIONS
 *    - ['rule_in', 'rule_out', 'delay_drivers', 'documentation_gaps', 'bundle_gaps']
 *
 * 2. USNWR domains WITH rankings (rank ≤ 20):
 *    - Use getSignalEmphasis(domain) to get ranking-informed groups
 *    - Example Ortho: ['bundle_compliance', 'handoff_failures', 'delay_drivers',
 *                      'documentation_gaps', 'complication_tracking']
 *    - These groups align with quality_differentiators from top performers
 *
 * 3. USNWR domains WITHOUT rankings (rank > 20 or no ranking):
 *    - Use domain-specific defaults from domainRouter.ts
 */
export interface SignalGroupSkeleton {
  group_id: string;      // "bundle_compliance", "rule_in", "delay_drivers", etc.
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
 * Reuses: llmClient.ts for OpenAI calls
 *
 * CPPO currently supports these task families:
 * - signal_enrichment    – populate signals inside each group
 * - event_summary        – full narrative event story
 * - summary_20_80        – concise, first-screen summary
 * - followup_questions   – questions tied to signals/patient payload
 * - clinical_review_plan – tools, review order, priorities
 *
 * CRITICAL INTEGRATION: Rankings → Prompt Injection
 *
 * For USNWR cases with ranking_context:
 * 1. event_summary task: Inject ranking_context.summary
 *    - "This institution is nationally ranked #20 in Pediatric Orthopedics..."
 * 2. summary_20_80 task: Inject top_performer_benchmarks
 *    - "TOP PERFORMER BENCHMARKS: Boston Children's achieves 96% compliance..."
 * 3. signal_enrichment task: Use signal_emphasis to prioritize groups
 *    - Focus on quality_differentiators from top performers
 *
 * For HAC cases (no ranking_context):
 * - Use CDC/NHSN research sources instead
 * - Focus on infection prevention protocols
 */
export interface TaskInput {
  node: TaskNode;
  prompt_config: PromptConfig;
  context: {
    skeleton: StructuralSkeleton;
    domainContext: DomainContext;          // Contains ranking_context
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

  /**
   * Build prompt with ranking context injected
   *
   * Example:
   * - Base prompt: "Generate an event summary for {concern_id}..."
   * - With rankings: "Generate an event summary for I25. {ranking_context.summary}
   *                   Focus on signals that differentiate top performers..."
   */
  buildPromptWithContext(
    basePrompt: string,
    domainContext: DomainContext,
    taskType: TaskType
  ): string;
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

### 11. Eval Mode (Prompt Refinery Factory)

```typescript
/**
 * Eval Mode (Prompt Refinery Factory)
 *
 * This eval mode is the implementation of the Prompt Refinery Factory.
 * It reuses S0–S4 + selected S5 task(s) to benchmark prompt versions on curated datasets.
 *
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
# Planning Factory (CPPO) lives here:
├── orchestrator/                    # NEW - CPPO core
│   ├── MetaOrchestrator.ts         # Main orchestrator
│   ├── StageRegistry.ts            # Stage definitions
│   ├── StageContext.ts             # Runtime context
│   ├── RunManifest.ts              # Manifest writer
│   │
│   ├── QUALITY_CRITERIA.md         # ⭐ Quality standards (Tier 1/2/3)
│   ├── CONTEXT_AWARE_QUALITY.md    # ⭐ Domain/archetype/task-specific validation
│   ├── QUALITY_GUIDED_GENERATION.md # ⭐ Prevention-based generation strategies
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
│       ├── ValidationFramework.ts  # ⭐ Gate enforcement & 3-tier model
│       ├── ContextAwareValidation.ts # ⭐ Domain/archetype/task-specific validators
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
├── eval/                           # NEW - Eval mode (Prompt Refinery)
│   ├── EvalRunner.ts               # Eval orchestrator
│   ├── datasets/
│   │   ├── ortho_summaries_v1.json
│   │   ├── endo_enrich_v1.json
│   │   └── ...
│   └── metrics/
│       └── TaskMetrics.ts
│
# Schema/App factories are separate services/repos (not covered in this doc)
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

**Two Paths: HAC vs USNWR**

```
┌──────────────────┐
│ PlanningInput    │
│ concern_id: ?    │
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
    │                                                │
    │ IF HAC (CLABSI, CAUTI, VAP, PSI.09):          │
    │   → domain = "HAC"                             │
    │   → archetype = Preventability_Detective       │
    │   → ranking_context = null                     │
    │                                                │
    │ IF USNWR (I25, C35, etc.):                    │
    │   → domain = "Orthopedics" / "Endocrinology"  │
    │   → archetype = Process_Auditor                │
    │   → ranking_context = {                        │
    │       specialty: "Orthopedics",                │
    │       rank: 20,                                │
    │       summary: "Lurie is ranked #20...",       │
    │       top_performer_benchmarks: "Boston...",   │
    │       signal_emphasis: [5 groups]              │
    │     }                                          │
    └────────┬───────────────────────────────────────┘
             │ Gate: archetype resolved
             ▼
    ┌────────────────────────────────────────────────┐
    │ S2: Structural Skeleton (V9.1)                 │
    │ Reuses: domainRouter, getSignalEmphasis()      │
    │                                                │
    │ IF HAC:                                        │
    │   → 5 groups: [rule_in, rule_out,             │
    │                delay_drivers, doc_gaps,        │
    │                bundle_gaps]                    │
    │                                                │
    │ IF USNWR (ranked):                            │
    │   → 5 groups from signal_emphasis:            │
    │     [bundle_compliance, handoff_failures,      │
    │      delay_drivers, doc_gaps,                  │
    │      complication_tracking]                    │
    │   → Informed by quality_differentiators        │
    └────────┬───────────────────────────────────────┘
             │ Gate: Exactly 5 groups
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
    │                                                │
    │ IF HAC:                                        │
    │   → Prompts injected with CDC/NHSN guidelines │
    │   → Focus on infection prevention              │
    │                                                │
    │ IF USNWR (ranked):                            │
    │   → event_summary: Inject ranking_context     │
    │   → summary_20_80: Inject top_performer_      │
    │                    benchmarks                  │
    │   → signal_enrichment: Use signal_emphasis    │
    │                                                │
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

### Rankings Integration Flow (USNWR Only)

```
┌─────────────────────────────────────────────────────────┐
│ lurie_usnwr_rankings.json (577 lines)                   │
│ - 12 specialties (Ortho, Endo, Cardio, etc.)           │
│ - Ranks, top performers, quality differentiators        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ rankingsLoader.ts (326 lines)                           │
│ - getRankingForConcern(I25) → {specialty, rank}        │
│ - getRankingContext(I25) → "Lurie is ranked #20..."    │
│ - getTopPerformerBenchmarks(Ortho) → Boston benchmarks │
│ - getSignalEmphasis(Ortho) → 5 signal groups           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ S1: Domain Resolution                                   │
│ - Loads ranking_context into DomainContext              │
│ - Only for USNWR concerns (I25, C35, etc.)             │
│ - HAC gets null                                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├──────────────────────────┬─────────────┐
                  │                          │             │
                  ▼                          ▼             ▼
         ┌────────────────┐       ┌──────────────┐  ┌─────────────┐
         │ S2: Skeleton   │       │ S5: Prompts  │  │ S6: Quality │
         │ Uses signal_   │       │ Inject rank  │  │ Assessment  │
         │ emphasis for   │       │ context and  │  │ Validate    │
         │ 5 groups       │       │ benchmarks   │  │ mentions    │
         └────────────────┘       └──────────────┘  └─────────────┘
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

### Decision 4: Rankings Integration - HAC vs USNWR

**Decision**: Rankings ONLY for USNWR cases; HAC uses CDC/NHSN guidelines

**Rationale**:
- **USNWR cases** are about national rankings and competitive improvement
  - Use Lurie's rankings data to drive toward #1
  - Inject top performer benchmarks (Boston Children's, CHOP, Stanford)
  - Signal groups aligned with quality differentiators

- **HAC cases** are about patient safety and regulatory compliance
  - Not ranked (HAC is universal safety standard)
  - Use CDC NHSN guidelines, AHRQ research
  - Signal groups focus on infection prevention

**Implementation**:
```typescript
// S1: Domain Resolution
if (isUSNWRConcern(concern_id)) {
  const rankingInfo = getRankingForConcern(concern_id);
  if (rankingInfo && rankingInfo.rank <= 20) {
    // Top 20 specialty - inject ranking context
    ranking_context = {
      specialty_name: rankingInfo.specialty,
      rank: rankingInfo.rank,
      summary: getRankingContext(concern_id),
      top_performer_benchmarks: getTopPerformerBenchmarks(domain),
      signal_emphasis: getSignalEmphasis(domain)
    };
  }
} else {
  // HAC case - no rankings
  ranking_context = null;
}
```

**Files Involved**:
- `utils/rankingsLoader.ts` (326 lines) - ✅ REUSED AS-IS
- `.rankings-cache/lurie_usnwr_rankings.json` (577 lines) - ✅ DATA SOURCE

---

## Summary: What CPPO Preserves from Current System

**Critical Intelligence We MUST NOT Lose**:

1. ✅ **Archetype Matrix** (`plannerAgent.ts:50-100`)
   - Maps concern_id → (domain, archetype)
   - Reused in S1

2. ✅ **Signal Group Definitions** (`domainRouter.ts`)
   - HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS
   - Exactly 5 groups per domain (V9.1 compliance)
   - Reused in S2

3. ✅ **Rankings Integration** (`rankingsLoader.ts` + `lurie_usnwr_rankings.json`)
   - **CRITICAL**: This was the user's concern - now explicitly integrated
   - 4 functions reused in S1 + S2 + S5:
     1. `getRankingForConcern(concernId)` → S1
     2. `getRankingContext(concernId)` → S5 (prompt injection)
     3. `getTopPerformerBenchmarks(domain)` → S5 (prompt injection)
     4. `getSignalEmphasis(domain)` → S2 (5 signal groups)

4. ✅ **Intent Inference** (`intentInference.ts`)
   - Pediatric-focused domain extraction
   - Reused in S0

5. ✅ **Validation Tiers** (`validatePlan.ts`, `validateV91.ts`, `qualityAssessment.ts`)
   - Tier 1/2/3 validation
   - Reused in S6

6. ✅ **LLM Client** (`llmClient.ts`)
   - OpenAI API wrapper
   - Reused in S5

7. ✅ **Research Bundle** (`researchAugmentedPlanner.ts`)
   - CDC NHSN, SPS, KDIGO integration
   - Reused in S5 task context

**Flow Summary**:
- **HAC → CPPO**: Archetype matrix + HAC group definitions + CDC research
- **USNWR → CPPO**: Archetype matrix + Rankings (4 functions) + Signal emphasis + Top performer benchmarks

---

## Next Steps

1. ✅ Architecture designed (including rankings integration)
2. **Create skeleton files** (orchestrator/, prompts/, eval/)
3. **Implement S0-S2** (reuse existing modules including rankingsLoader)
4. **Test basic pipeline** (S0→S2 working on I25 + CLABSI)
5. **Implement S3-S6** (full pipeline with prompt injection)
6. **Create eval mode** (A/B testing)
7. **Feature parity testing** (compare to legacy - verify rankings work)
8. **Migration** (deprecate → remove legacy)

