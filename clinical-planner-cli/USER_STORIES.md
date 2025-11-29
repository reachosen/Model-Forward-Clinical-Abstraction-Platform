# Clinical Progressive Plan Orchestrator (CPPO) - User Stories

**Date**: 2025-11-29

---

## CPPO Pipeline Stages (Authoritative)

The orchestrator executes plans through 7 progressive stages with validation gates:

- **S0** – Input Normalization & Routing
- **S1** – Domain & Archetype & Ranking Context Resolution
- **S2** – Structural Skeleton (V9.1 Compliance)
- **S3** – Task Graph Identification
- **S4** – Task-Based Prompt Plan Generation
- **S5** – Task Execution & Local Validation
- **S6** – Plan Assembly & Global Validation

**Core Principle**: The orchestrator uses:
- **TaskGraph** to know which tasks to run and in what order
- **PromptPlan** to know which prompt/model/settings to use per task
- **StageValidators** to enforce gates between stages

---

## Archetype Glossary

- **Preventability_Detective**: HAC surveillance archetype (CLABSI, CAUTI, VAP) - focuses on identifying preventable harm
- **Exclusion_Hunter**: HAC archetype (PSI.09) - focuses on identifying valid exclusions
- **Process_Auditor**: USNWR quality metric archetype (I25 Ortho) - focuses on protocol compliance and LOS outliers
- **Preventability_Detective_Metric**: USNWR specialty metric archetype (C35 Endo) - focuses on preventable complications in specialty care

---

## Persona Definitions

**Clinical Informaticist (CI)** - Alicia
- Runs planner to generate abstraction configs for new metrics/HACs
- Needs to understand WHY a plan failed validation
- Values: Reliability, debuggability, correctness

**Prompt Engineer (PE)** - Jordan
- Refines LLM prompts to improve plan quality
- Needs to A/B test prompt versions on real datasets
- Values: Measurability, iteration speed, modularity

**System Integrator (SI)** - Sam
- Deploys planner in production pipelines
- Needs clear stage boundaries and retry logic
- Values: Observability, reliability, performance

**Clinical Reviewer (CR)** - Dr. Chen
- Reviews generated plans for clinical accuracy
- Needs to see what sources/tools were used
- Values: Transparency, provenance, ranking awareness

---

## Epic 0: CPPO Architecture & Orchestrator

### Story 0.1: Define MetaOrchestrator Interface and Stage Registry
**As** Sam (SI)
**I want to** a well-defined orchestrator interface
**So that** stages are executed in correct order with proper gates

**Acceptance Criteria**:
- [ ] `MetaOrchestrator` interface defines:
  - `runPipeline(input, mode): PlannerPlanV2 | EvalResult`
  - `getStageRegistry(): StageDefinition[]`
  - `getStageContext(stageId): StageContext`
- [ ] Stage registry maps stage IDs (S0-S6) to:
  - Stage name, inputs, outputs, validator
- [ ] Each stage can be run independently or as part of full pipeline

---

### Story 0.2: Implement TaskGraph and PromptPlan Types + Registry
**As** Jordan (PE)
**I want to** explicit TaskGraph and PromptPlan types
**So that** tasks and prompts are decoupled from orchestrator logic

**Acceptance Criteria**:
- [ ] `TaskGraph` interface defines:
  - `nodes: TaskNode[]` (id, type, description)
  - `edges: [string, string][]` (from, to)
  - `constraints: { must_run, optional }`
- [ ] `PromptPlan` interface defines:
  - `nodes: PromptPlanNode[]` (id, type, prompt_config)
  - `prompt_config: { template_id, model, temperature, response_format, schema_ref }`
- [ ] `PromptRegistry` provides:
  - `getTemplate(domain, archetype, task_type, version): string`
  - `getConfig(domain, archetype, task_type): PromptConfig`
- [ ] Orchestrator uses TaskGraph for task ordering, and PromptPlan for prompt/model config per task

---

### Story 0.3: Define run_manifest.json Schema
**As** Sam (SI)
**I want to** a standard manifest schema for all runs
**So that** I can debug failures and track prompt versions

**Acceptance Criteria**:
- [ ] `run_manifest.json` schema includes:
  - `run_id`, `mode` (runtime | eval), `timestamp`
  - `stages: { [stageId]: { status, validator, errors, retry_count } }`
  - `prompts: { [taskId]: template_id }` (version tracking)
  - `models: { [taskId]: model_name }`
  - `metrics: { total_duration_ms, stage_durations_ms }`
- [ ] Every run (success or failure) writes manifest
- [ ] Manifest does NOT contain patient data or API keys

---

## Epic 1: Runtime Planning (Replace Legacy)

### Story 1.1: Generate Plan for Orthopedics Metric (I25)
**As** Alicia (CI)
**I want to** run `planner cppo-plan --input i25_input.json`
**So that** I get a complete PlannerPlan with signals, questions, and review tools

**Acceptance Criteria**:
- [ ] Input: PlanningInput with concern_id="I25", domain="orthopedics"
- [ ] S1 resolves to: domain="orthopedics", archetype="Process_Auditor", ranking_context={ rank: 20 }
- [ ] S2 creates skeleton with exactly 5 signal groups: rule_in, rule_out, delay_drivers, bundle_compliance, handoff_failures
- [ ] S3 builds TaskGraph with nodes: signal_enrichment, event_summary, summary_20_80, followup_questions, clinical_review_plan
- [ ] S4 maps each task to prompt template (e.g., ortho.process_auditor.summary_20_80.v3)
- [ ] S5 executes all tasks; S6 assembles PlannerPlanV2
- [ ] Output: PlannerPlanV2 passes Tier 1 + Tier 2 validation
- [ ] run_manifest.json shows all stages (S0-S6) executed successfully

**Example**:
```bash
planner cppo-plan --input examples/i25_planning_input.json
# Output: i25_plan_2025-11-29_v1.json
#         i25_manifest_2025-11-29.json
```

---

### Story 1.2: Generate Plan for HAC CLABSI (Pediatric ICU)
**As** Alicia (CI)
**I want to** run `planner cppo-plan --input clabsi_picu_input.json`
**So that** I get a HAC surveillance plan with preventability focus

**Acceptance Criteria**:
- [ ] Input: PlanningInput with concern_id="CLABSI", domain="pediatric_icu"
- [ ] S1 resolves to: domain="HAC", archetype="Preventability_Detective"
- [ ] S2 creates skeleton with HAC-specific signal groups: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps
- [ ] S5 tasks include research context from ResearchBundle (CDC NHSN guidelines)
- [ ] Output: PlannerPlanV2 passes Tier 1 + Tier 2 validation

---

### Story 1.3: Debug Failed Plan with run_manifest.json
**As** Alicia (CI)
**I want to** see which stage failed and WHY
**So that** I can fix input or prompts without guessing

**Acceptance Criteria**:
- [ ] If S2 (Structural Skeleton) fails validation:
  - run_manifest.json shows: `stage_S2: { status: "failed", validator: "Tier1_StructuralValidator", errors: ["Missing signal_group 'bundle_compliance'"] }`
- [ ] If S5 (Task: summary_20_80) fails:
  - run_manifest.json shows: `stage_S5_tasks: { summary_20_80: { status: "failed", validator: "LengthValidator", errors: ["Summary exceeds 500 tokens (actual: 723)"] } }`
- [ ] run_manifest.json includes prompt version used: `prompts: { summary_20_80: "ortho.process_auditor.summary_20_80.v3" }`

**Example**:
```json
{
  "run_id": "run_2025-11-29_1430",
  "stages": {
    "stage_5_task_execution": {
      "status": "failed",
      "task": "summary_20_80",
      "prompt_version": "ortho.process_auditor.summary_20_80.v3",
      "model": "gpt-4o-mini",
      "validation_errors": [
        "Summary exceeds 500 tokens (actual: 723 tokens)"
      ],
      "retry_count": 1
    }
  }
}
```

---

## Epic 2: Prompt Refinement (Eval Mode)

### Story 2.1: A/B Test Two Prompt Versions
**As** Jordan (PE)
**I want to** compare summary_20_80 v3 vs v4 on 50 test cases
**So that** I can promote the better version to production

**Acceptance Criteria**:
- [ ] Run eval for v3:
  ```bash
  planner cppo-eval --task ortho.process_auditor.summary_20_80 \
                     --prompt-version v3 \
                     --dataset ortho_summaries_v1
  ```
- [ ] Run eval for v4: (same command, `--prompt-version v4`)
- [ ] Output: Metrics comparison showing:
  - structural_pass_rate: v3 = 92%, v4 = 96%
  - avg_length: v3 = 487 tokens, v4 = 412 tokens
  - coverage_score: v3 = 0.85, v4 = 0.91
- [ ] Failures_sample shows 3-5 failing cases for manual review

---

### Story 2.2: Test New Task in Isolation
**As** Jordan (PE)
**I want to** test ONLY the signal_enrichment task on a dataset
**So that** I can refine its prompt without running full pipeline

**Acceptance Criteria**:
- [ ] Eval mode runs S0-S4 (setup), then ONLY S5 (signal_enrichment task)
- [ ] Skips other S5 tasks: summary_20_80, followup_questions, clinical_review_plan
- [ ] Skips S6 (global assembly)
- [ ] Metrics show:
  - required_groups_filled_rate (did it populate all 5 groups?)
  - signal_id_validity_rate (are IDs valid?)
  - avg_signals_per_group

**Example**:
```bash
planner cppo-eval --task endo.preventability_detective.signal_enrichment \
                   --prompt-version v4 \
                   --dataset endo_enrich_v1

# Output:
# Eval Run: eval_2025-11-29_1530
# Task: endo.preventability_detective.signal_enrichment
# Prompt: v4
# Dataset: endo_enrich_v1 (30 cases)
#
# Metrics:
#   structural_pass_rate: 93.3% (28/30)
#   required_groups_filled: 100% (all 5 groups in 30/30 cases)
#   avg_signals_per_group: 3.2
#   signal_id_validity: 96.7%
#
# Failures (2):
#   - case_014: Missing group 'bundle_compliance'
#   - case_027: Invalid signal_id 'PROC_TIMING' (not in schema)
```

---

### Story 2.3: Regression Testing After Prompt Upgrade
**As** Jordan (PE)
**I want to** run the entire eval suite after upgrading a prompt
**So that** I catch regressions before deploying to production

**Acceptance Criteria**:
- [ ] Upgrade summary_20_80 from v3 → v4 in prompt registry
- [ ] Run full eval suite:
  ```bash
  planner cppo-eval --suite ortho_full --prompt-version latest
  ```
- [ ] Suite includes all tasks: signal_enrichment, event_summary, summary_20_80, followup_questions, clinical_review_plan
- [ ] Report shows metrics for each task
- [ ] If ANY task shows >5% regression, eval fails with error

---

## Epic 3: Modularity & Task Management

### Story 3.1: Swap Prompt Without Code Changes
**As** Jordan (PE)
**I want to** upgrade the summary_20_80 prompt
**So that** plans improve WITHOUT touching other tasks

**Acceptance Criteria**:
- [ ] Edit `prompts/orthopedics/process_auditor/summary_20_80/v4.md`
- [ ] Update `prompts/registry.ts`: map "ortho.process_auditor.summary_20_80" → v4
- [ ] Re-run planner cppo-plan
- [ ] ONLY summary_20_80 uses new prompt; signal_enrichment, followup_questions unchanged
- [ ] run_manifest.json shows: `prompt_summary_20_80: "ortho.process_auditor.summary_20_80.v4"`

---

### Story 3.2: Add New Task to TaskGraph
**As** Sam (SI)
**I want to** add a "risk_stratification" task to Orthopedics pipeline
**So that** plans include risk scores without rewriting orchestrator

**Acceptance Criteria**:
- [ ] Define new TaskType: "risk_stratification"
- [ ] Update S3 (TaskGraph builder) for ortho.process_auditor:
  ```typescript
  nodes: [..., { id: "RISK_STRAT", type: "risk_stratification" }],
  edges: [..., ["S_ENRICH", "RISK_STRAT"], ["RISK_STRAT", "CR_PLAN"]]
  ```
- [ ] Update S4 (PromptPlan): Create prompt template `prompts/orthopedics/process_auditor/risk_stratification/v1.md`
- [ ] Update S5: Create validator `validateRiskStratification(output): TaskValidationResult`
- [ ] Re-run planner cppo-plan
- [ ] Output PlannerPlanV2 includes risk_score field
- [ ] run_manifest.json shows: `stage_S5_tasks: { risk_stratification: { status: "success" } }`

---

## Epic 4: Observability & Debugging

### Story 4.1: See Exactly Which Validator Failed
**As** Alicia (CI)
**I want to** know which validation rule failed
**So that** I can fix the issue quickly

**Acceptance Criteria**:
- [ ] If Tier1_StructuralValidator fails on "5-Group Rule":
  - run_manifest.json shows: `{ rule: "5_group_enforcement", expected: 5, actual: 4, missing: ["handoff_failures"] }`
- [ ] If Tier2_SemanticValidator fails on "Ranking Context Mention":
  - run_manifest.json shows: `{ rule: "ranking_context_mention", severity: "warning", message: "Plan does not mention Lurie rank #20" }`

---

### Story 4.2: Trace Prompt Version Across Runs
**As** Sam (SI)
**I want to** see which prompt versions were used in production
**So that** I can correlate plan quality with prompt changes

**Acceptance Criteria**:
- [ ] run_manifest.json for each plan includes:
  ```json
  {
    "prompts": {
      "signal_enrichment": "ortho.process_auditor.signal_enrichment.v3",
      "event_summary": "ortho.process_auditor.event_summary.v2",
      "summary_20_80": "ortho.process_auditor.summary_20_80.v4",
      ...
    },
    "models": {
      "signal_enrichment": "gpt-4o",
      "summary_20_80": "gpt-4o-mini",
      ...
    }
  }
  ```
- [ ] Can query: "Show all plans generated with summary_20_80.v4 between Nov 1-30"

---

### Story 4.3: Retry Failed Stage with Context
**As** Alicia (CI)
**I want to** retry a failed stage with validation errors appended
**So that** the LLM can self-correct

**Acceptance Criteria**:
- [ ] S5 (Task: signal_enrichment) fails with: "Missing group 'bundle_compliance'"
- [ ] Orchestrator retries S5 with updated prompt:
  ```
  [Previous prompt]

  VALIDATION ERRORS FROM PREVIOUS ATTEMPT:
  - Missing required signal_group: 'bundle_compliance'

  Please ensure all 5 groups are present: rule_in, rule_out, delay_drivers, bundle_compliance, handoff_failures.
  ```
- [ ] If retry succeeds, run_manifest.json shows: `stage_S5_tasks: { signal_enrichment: { retry_count: 1, final_status: "success" } }`
- [ ] If retry fails again, orchestrator aborts and returns error

---

## Epic 5: Compatibility & Migration

### Story 5.1: CPPO Produces Same Plan as Legacy
**As** Sam (SI)
**I want to** verify CPPO matches legacy output
**So that** I can confidently migrate

**Acceptance Criteria**:
- [ ] Run legacy: `planner plan --input i25_input.json` → PlannerPlanV2 (legacy)
- [ ] Run CPPO: `planner cppo-plan --input i25_input.json` → PlannerPlanV2 (CPPO)
- [ ] Semantic comparison shows:
  - Same 5 signal groups (IDs may differ, but descriptions equivalent)
  - Same follow-up questions (phrasing may differ, but intent matches)
  - Same clinical review tools
  - Same ranking context mention
- [ ] External validator scores both plans as "equivalent"
- [ ] CPPO run_manifest.json provides additional debugging value not available in legacy

---

### Story 5.2: Use Existing domainRouter + intentInference
**As** Sam (SI)
**I want to** CPPO to reuse existing domain intelligence
**So that** we don't lose pediatric-specific routing

**Acceptance Criteria**:
- [ ] S0 (Input Normalization) imports and uses `intentInference.ts` for free-text → structured metadata
- [ ] S1 (Domain Resolution) imports ARCHETYPE_MATRIX from `plannerAgent.ts`
- [ ] S2 (Structural Skeleton) imports HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS from `domainRouter.ts`
- [ ] S6 (Global Validation) imports `validatePlan.ts`, `validateV91.ts`, `qualityAssessment.ts`
- [ ] No code duplication; CPPO orchestrator imports and wraps existing modules

---

## Epic 6: Performance & Reliability

### Story 6.1: CPPO Matches Legacy Performance
**As** Sam (SI)
**I want to** CPPO to be ≤10% slower than legacy
**So that** production pipelines don't degrade

**Acceptance Criteria**:
- [ ] Benchmark: Generate 100 Ortho plans
  - Legacy median latency: 18.2s
  - CPPO median latency: ≤20.0s (10% threshold)
- [ ] CPPO p95 latency ≤ legacy p95 + 15%

---

### Story 6.2: Handle OpenAI API Failures Gracefully
**As** Sam (SI)
**I want to** CPPO to retry transient API failures
**So that** plans don't fail due to network blips

**Acceptance Criteria**:
- [ ] If OpenAI returns 429 (rate limit), CPPO retries with exponential backoff (1s, 2s, 4s)
- [ ] If OpenAI returns 500 (server error), CPPO retries up to 3 times
- [ ] If all retries fail, run_manifest.json shows: `{ stage_5_task_X: { status: "failed", error: "OpenAI API unavailable after 3 retries" } }`

---

## Epic 7: Clinical Accuracy & Ranking Awareness

### Story 7.1: Top-Ranked Hospital Plans Mention Rank
**As** Dr. Chen (CR)
**I want to** Orthopedics plans for Lurie (#20) to mention rank
**So that** reviewers understand the strategic context

**Acceptance Criteria**:
- [ ] Input: I25 plan for Lurie Children's Hospital
- [ ] S1 (Domain Resolution) loads: `ranking_context: { specialty_name: "Orthopedics", rank: 20, summary: "Lurie is ranked #20 in Orthopedics by US News" }`
- [ ] S5 (Task: summary_20_80) receives ranking_context in task input, includes rank in output:
  - "As a top-20 orthopedics program, Lurie must demonstrate compliance with VTE prophylaxis protocols..."
- [ ] S6 (Global Validation) runs Tier2_SemanticValidator which checks for ranking mention (warning if missing)

---

### Story 7.2: Pediatric-Specific Signal Prioritization
**As** Dr. Chen (CR)
**I want to** CLABSI plans for PICU to prioritize pediatric-specific signals
**So that** plans reflect age-appropriate risk factors

**Acceptance Criteria**:
- [ ] Input: CLABSI in pediatric_icu
- [ ] S3 (TaskGraph) includes pediatric-specific task nodes for PICU domain
- [ ] S5 (Task: signal_enrichment) generates pediatric-specific signals:
  - "PICU_LINE_DAYS" (not just "LINE_DAYS")
  - "NEONATE_CLABSI_BUNDLE" (for <28 days)
- [ ] S5 tasks receive ResearchBundle with CDC NHSN PICU-specific definitions
- [ ] Output PlannerPlanV2 references PICU-specific CDC NHSN criteria

---

## Non-Functional Requirements

### NFR-1: Testability
- [ ] Every stage has unit tests
- [ ] TaskGraph builder has integration tests
- [ ] Eval mode has end-to-end tests with mock datasets

### NFR-2: Maintainability
- [ ] Prompts versioned in code (not just git history)
- [ ] Clear separation: Orchestrator (when/what) vs Tasks (how)
- [ ] Each task has single responsibility

### NFR-3: Extensibility
- [ ] Adding new TaskType requires:
  1. Define TaskType enum entry
  2. Create prompt template
  3. Create task validator
  4. Update TaskGraph builder (for relevant archetypes)
- [ ] Adding new domain/archetype requires:
  1. Add to ARCHETYPE_MATRIX
  2. Define GROUP_DEFINITIONS
  3. Create prompt templates for each task
  4. Define TaskGraph

### NFR-4: Security
- [ ] Prompts do NOT contain API keys or secrets
- [ ] run_manifest.json does NOT log patient data
- [ ] Eval datasets are anonymized

---

## Success Metrics

**For MVP (Phase 1):**
- [ ] 10 user stories implemented (1.1, 1.2, 1.3, 3.1, 4.1, 4.3, 5.1, 5.2, 6.1, 7.1)
- [ ] CPPO passes 90% of legacy planner tests
- [ ] run_manifest.json used to debug ≥1 real issue

**For v3.0.0 (Phase 4 - Legacy Removal):**
- [ ] All 20+ user stories implemented
- [ ] CPPO passes 100% of legacy tests
- [ ] Eval mode shows ≥1 measurable prompt improvement
- [ ] Team prefers CPPO over legacy (survey: ≥80% positive)

