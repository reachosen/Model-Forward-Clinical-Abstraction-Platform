# Clinical Progressive Plan Orchestrator (CPPO) - Gap Analysis

**Date**: 2025-11-29
**Purpose**: Understand what we have, what CPPO adds, and what we must preserve

---

## 1. What We Have Now (Current Implementation)

### Core Modules

**plannerAgent.ts** - Main entry point
- V9.1 unified architecture
- Archetype Matrix: Maps concern_id → (domain, archetype)
- Single `generatePlan()` function (no HAC/USNWR branching)
- Returns complete `PlannerPlan` or `PlannerPlanV2`

**Domain-Specific Intelligence**
- `domainRouter.ts`: HAC vs USNWR detection, signal group definitions
  - HAC_GROUP_DEFINITIONS (5 groups): rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps
  - ORTHO_GROUP_DEFINITIONS (5 groups): rule_in, rule_out, delay_drivers, bundle_compliance, handoff_failures
  - ENDO_GROUP_DEFINITIONS (5 groups)
- `intentInference.ts`: Extract structured metadata from free-text
  - Pediatric-focused domain inference
  - Maps text → (clinical_domain, review_template_type, review_target)

**Research Integration**
- `researchAugmentedPlanner.ts`: Enhances plans with authoritative sources
  - ResearchBundle: sources, clinical_tools, guidelines
  - Extended timeout (3 min) for complex generation
  - Quality assessment integration

**Validation & Quality**
- `validatePlan.ts`, `validateV91.ts`: Schema + structural validation
- `assessPlan.ts`: Unified plan assessment
- `qualityAssessment.ts`: Multi-tier quality checks
- `externalValidator.ts`: External validation hooks

**Learning Loop**
- `learningAgent.ts`: Iterative improvement
- `learningQueueHelpers.ts` + `learningQueueStorage.ts`: Queue management
- `revisionAgent.ts`: Plan revision workflows

**LLM Layer**
- `llmClient.ts`: OpenAI API wrapper
- `llmPlanGeneration.ts`: Prompt construction
  - generatePlanWithLLM, generateHACPlanWithLLM, generateUSNWRPlanWithLLM

**Discovery**
- `discoveryAgent.ts`: (Purpose unclear from naming - needs investigation)

### Data Models

**PlannerPlan.ts**
- `PlannerPlan`: Legacy structure
- `PlannerPlanV2`: V9.1 schema (2.0.0)
- `ArchetypeType`: Preventability_Detective, Exclusion_Hunter, Process_Auditor, Preventability_Detective_Metric
- `DomainType`: HAC, USNWR, Orthopedics, Endocrinology, etc.
- Signal groups, questions, tools, clinical review config

**PlanningInput.ts**
- Input schema for planning requests
- Concern metadata, domain hints, patient payload

**ResearchBundle.ts**
- Sources, clinical_tools, guidelines, context

**QualityAttributes.ts**
- Quality scores, validation tiers, checklist items

### CLI Commands
- `cli/plan.ts`: Main planning command
- `cli/learn.ts`: Learning loop
- `cli/revise.ts`: Plan revision

---

## 2. What CPPO Changes (Key Differences)

### Architectural Shifts

| Aspect | Current | CPPO |
|--------|---------|------|
| **Structure** | Monolithic `generatePlan()` | 7-stage progressive pipeline |
| **Observability** | Black box (input → plan) | Stage-by-stage gates + manifests |
| **Task Organization** | Implicit in prompt | Explicit TaskGraph (DAG) |
| **Prompt Management** | Hardcoded in code | PromptPlan (versioned, registry) |
| **Testing** | Full integration only | Task-level + prompt A/B testing |
| **Retry Logic** | Limited | Per-stage retry with context |
| **Modes** | Runtime only | Runtime + Eval modes |

### New Concepts

**MetaOrchestrator**
- Owns pipeline graph (Stages 0-7)
- Can run full or partial pipeline
- Emits run_manifest.json for every run

**Stages (0-7)**
- **0**: Input Normalization & Routing
- **1**: Domain & Archetype Resolution ← **Uses current ARCHETYPE_MATRIX**
- **2**: Structural Skeleton (V9.1) ← **Uses current GROUP_DEFINITIONS**
- **3**: Task Graph Identification ← **NEW**
- **4**: Prompt Plan Generation ← **NEW (replaces hardcoded prompts)**
- **5**: Task Execution ← **Replaces monolithic LLM call**
- **6**: Plan Assembly & Validation ← **Uses current validators**
- **7**: Eval Mode ← **NEW (A/B testing)**

**TaskGraph**
- Explicit DAG: signal_enrichment → event_summary → summary_20_80 → followup_questions → clinical_review_plan
- Domain/archetype-specific
- Separates "what" from "how"

**PromptPlan**
- Maps task → (template_id, model, temperature, schema_ref)
- Enables prompt versioning per task
- Supports A/B testing

**Eval Mode**
- Run partial pipeline on test datasets
- Metrics: structural_pass_rate, coverage, avg_length
- Compare prompt versions side-by-side

---

## 3. What Current System Does Well (Must Preserve)

### ✅ Domain Intelligence We MUST Keep

**1. Archetype Matrix (plannerAgent.ts)**
- Deterministic concern_id → (domain, archetype) mapping
- Covers HAC (CLABSI, CAUTI, VAP, PSI.09) + USNWR (I25, I26, C35, C41, C59)
- **Integration Point**: Stage 1 (Domain & Archetype Resolution) must use this

**2. Signal Group Definitions (domainRouter.ts)**
- HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS
- 5-group enforcement (critical for V9.1 compliance)
- **Integration Point**: Stage 2 (Structural Skeleton) must use these

**3. Intent Inference (intentInference.ts)**
- Pediatric-focused domain extraction from free text
- Handles vague inputs gracefully
- **Integration Point**: Stage 0 (Input Normalization) can use this for routing

**4. Research Augmentation (researchAugmentedPlanner.ts)**
- ResearchBundle integration
- CDC NHSN, SPS guidelines, clinical tools
- **Integration Point**: Stage 5 task nodes can access research context

**5. Multi-Tier Validation**
- Tier 1 (structural), Tier 2 (semantic), Tier 3 (clinical accuracy)
- Checklist-based validation
- **Integration Point**: Stage 6 (Global Validation) + Stage 5 (per-task local validation)

**6. Learning Loop**
- learningAgent, learningQueue, revisionAgent
- Iterative improvement based on feedback
- **Integration Point**: Post-Stage 6, or as Stage 8 (optional)

### ✅ Features We MUST Preserve

**Pediatric Focus**
- Archetype matrix has pediatric-specific archetypes
- Intent inference prioritizes pediatric domains (picu, nicu)
- Signal groups tuned for children's hospitals

**Ranking Context Integration**
- Orthopedics/Endocrinology plans mention USNWR rank
- Affects signal prioritization (top 20 vs top 50)
- **Integration Point**: Stage 1 loads ranking_context, Stage 5 tasks use it

**5-Group Enforcement**
- V9.1 spec requires exactly 5 signal groups
- Domain-specific group IDs
- **Integration Point**: Stage 2 skeleton + Stage 6 validation

**Flexible Input Handling**
- Accepts free-text via intentInference
- Accepts structured PlanningInput
- **Integration Point**: Stage 0 normalization

**Quality Scoring**
- QualityAttributes: scores, tiers, warnings
- Feeds UI/reviewer tools
- **Integration Point**: Stage 6 global validation

---

## 4. What's Missing That CPPO Adds

### 🆕 Observability
- **Current**: Black box (no insight into what prompt/task failed)
- **CPPO**: run_manifest.json shows stage-by-stage execution
  - Which prompt version used
  - Which validator failed
  - Retry history

### 🆕 Modularity
- **Current**: Changing "summary generation" requires editing monolithic prompt
- **CPPO**: PromptPlan allows swapping summary_20_80 prompt without touching other tasks

### 🆕 Testability
- **Current**: Full integration tests only (slow, hard to isolate)
- **CPPO**: Task-level tests + Eval mode for prompt A/B

### 🆕 Progressive Retries
- **Current**: Limited retry (all-or-nothing)
- **CPPO**: Per-stage retry with validation context appended to prompt

### 🆕 Prompt Versioning
- **Current**: Prompt changes are code changes (git history)
- **CPPO**: Versioned prompts in registry (prompts/{domain}/{archetype}/{task}/v3.md)

### 🆕 Eval Mode
- **Current**: No systematic way to test prompt improvements
- **CPPO**: planner eval --task ortho.process_auditor.summary_20_80 --prompt-version v3 --dataset ortho_v1

---

## 5. Integration Strategy: What to Reuse vs Rebuild

### ✅ Reuse As-Is
- `domainRouter.ts`: HAC/USNWR/ORTHO/ENDO group definitions → Stage 2
- `intentInference.ts`: Free-text → structured metadata → Stage 0
- `validatePlan.ts`, `validateV91.ts`: Validators → Stage 6 + Stage 5 local gates
- `qualityAssessment.ts`: Quality scoring → Stage 6
- `llmClient.ts`: OpenAI wrapper → Stage 5 task execution
- Models: `PlannerPlan`, `PlanningInput`, `ResearchBundle` → Used across stages

### 🔄 Adapt/Wrap
- `plannerAgent.ts`: ARCHETYPE_MATRIX → Extract into Stage 1 module
- `researchAugmentedPlanner.ts`: Research integration → Stage 5 task context builder
- `llmPlanGeneration.ts`: Prompt construction → Refactor into PromptPlan templates
- `learningAgent.ts`: Learning loop → Optional Stage 8 or post-Stage 6 hook

### 🆕 Build New
- `MetaOrchestrator`: Pipeline runner
- `TaskGraph`: DAG builder (Stage 3)
- `PromptPlan`: Template registry + task mapper (Stage 4)
- `TaskRunner`: Abstract task executor (Stage 5)
- `StageValidators`: Per-stage gate logic
- `EvalRunner`: Eval mode orchestration (Stage 7)
- `runManifestWriter`: Observability layer

---

## 6. Migration Path (Compatibility Strategy)

### Phase 1: Dual Mode (CPPO + Legacy)
- Keep current `cli/plan.ts` (plannerAgent) working
- Add new `cli/cppo-plan.ts` for CPPO pipeline
- Users can choose: `planner plan` (legacy) or `planner cppo-plan` (new)

### Phase 2: Feature Parity
- CPPO pipeline passes all existing tests
- run_manifest.json provides value (debugging, metrics)
- Eval mode proves useful (prompt refinement)

### Phase 3: Deprecation
- Mark legacy `planner plan` as deprecated
- Default to CPPO
- Remove monolithic planner in future release

---

## 7. Key Design Decisions Needed

### Decision 1: Prompt Templates - Code or Files?
**Current**: Prompts embedded in TypeScript strings
**Options**:
- A) Keep in code (easier to version with git)
- B) Move to .md files (easier to edit, requires file loader)
- C) Hybrid (templates in files, config in code)

**Recommendation**: Start with (A) code-based, migrate to (C) hybrid as we scale

### Decision 2: TaskGraph - Static or Dynamic?
**Current**: Implicit (LLM does everything)
**Options**:
- A) Static per archetype (hardcoded DAGs)
- B) Dynamic (LLM generates TaskGraph at Stage 3)
- C) Hybrid (default DAG + LLM can add/remove tasks)

**Recommendation**: Start with (A) static, add (C) hybrid later

### Decision 3: Validation - Fail Fast or Collect All?
**Current**: Validators return all errors
**Options**:
- A) Fail fast (stop at first validation error)
- B) Collect all (run all validators, return all errors)

**Recommendation**: (B) collect all for better UX

### Decision 4: Retry Strategy - Auto or Manual?
**Current**: Limited auto-retry
**Options**:
- A) Auto-retry with validation errors appended to prompt
- B) Manual retry (user reviews, provides hints)
- C) Hybrid (auto-retry Tier 1, manual for Tier 2/3)

**Recommendation**: Start with (C) hybrid

---

## 8. Success Metrics

### For CPPO to be considered successful:
1. **Observability**: run_manifest.json shows exactly where/why plan failed
2. **Modularity**: Can upgrade summary_20_80 prompt without touching other tasks
3. **Testability**: Eval mode shows measurable improvement in prompt quality
4. **Compatibility**: Passes all existing planner tests
5. **Performance**: No slower than current planner (within 10%)
6. **Adoption**: Team prefers CPPO over legacy within 30 days

---

## Next Steps

1. ✅ **This Document**: Gap analysis complete
2. **User Stories**: Define specific scenarios for CPPO
3. **Architecture Design**: Detailed interface definitions
4. **Folder Structure**: Organize code modules
5. **Implementation**: Start with Stage 0-2 (foundations)
6. **Testing**: Build eval datasets for Ortho + Endo

