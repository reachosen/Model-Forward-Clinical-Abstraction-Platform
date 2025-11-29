# End-to-End Flow Analysis: Complete System Architecture

**Date**: 2025-11-27
**Purpose**: Map the entire planner system to identify inconsistencies, redundancies, and define the canonical V9.1 flow

---

## Executive Summary

The planner system has **accumulated 4 different versions** (V1, V2, V7.1, V9.1) with:
- **4 entry points** (bin/planner.ts, cli/plan.ts, cli/revise.ts, cli/learn.ts)
- **3 generation modes** (LLM, Template, Research-augmented)
- **5 validation files** (validatePlan.ts, externalValidator.ts, qualityAssessment.ts, assessPlan.ts, qa.ts)
- **2 parallel code paths** (Legacy planHAC vs New generatePlan)

**Key Problem**: The system is a **hybrid** - Phase 3 added V9.1 generation but didn't remove legacy paths.

**Recommendation**: **Define clean V9.1 flow**, mark legacy code clearly, create migration path.

---

## Part 1: Entry Points & Commands

### 1.1 User-Facing Commands

```
clinical-planner-cli/
├── bin/planner.ts ..................... Main unified CLI (V9.1)
│   ├── generate ....................... Fast LLM generation
│   ├── rpi (research-plan-implement) .. Full research workflow
│   ├── research ....................... Research only
│   └── cache .......................... Cache management
│
├── cli/plan.ts ........................ Legacy direct planner (V1/V2)
├── cli/revise.ts ...................... Plan revision workflow
└── cli/learn.ts ....................... Learning/feedback loop
```

### 1.2 Command Details

#### bin/planner.ts (Primary Interface)

**Commands:**

1. **`planner generate`** - Fast generation mode
   ```bash
   planner generate -c CLABSI -d picu --model gpt-4o
   ```
   - **Flow**: Input → generatePlan() → LLM → Plan
   - **Version**: Uses V9.1 generatePlan() (Phase 3)
   - **Validation**: None during generation, assumes Phase 3 strict parsing
   - **Output**: PlannerPlan (V9.1 structure)

2. **`planner rpi`** - Research-Plan-Implement workflow
   ```bash
   planner rpi -c CLABSI --force-refresh
   ```
   - **Flow**: Research → generatePlanWithResearch() → Enhanced Plan
   - **Version**: Mixed (research → V2-like output)
   - **Validation**: Quality assessment after generation
   - **Output**: PlannerPlanV2 with provenance

3. **`planner research`** - Research only
   ```bash
   planner research -c CLABSI
   ```
   - **Flow**: Fetch sources → ResearchBundle
   - **Output**: ResearchBundle JSON (no plan)

4. **`planner cache`** - Cache management
   - list, refresh, clear operations

---

#### cli/plan.ts (Legacy Interface)

**Usage:**
```bash
npx ts-node cli/plan.ts input.json --output ./output
```

**Flow:**
```
Input JSON → validatePlanningInput() → generatePlan() → validatePlan() → Save
```

**Problems:**
- Line 88: Calls `generatePlan()` (✅ V9.1)
- Lines 92-104: Expects V1/V2 fields (`confidence`, `requires_review`, `quality`)
- **Type confusion**: Calls V9.1 function but expects V1/V2 output

**Status**: ⚠️ Partially updated, type mismatches

---

#### cli/revise.ts (Revision Workflow)

**Usage:**
```bash
npx ts-node cli/revise.ts plan.json --critique "Add more signals"
```

**Flow:**
```
Existing Plan → revisionAgent.revisePlan() → Updated Plan
```

**Problems:**
- Line 167-169: Accesses `plan.quality` which doesn't exist in V9.1
- Works only with V2 plans
- Revision agent not updated for V9.1

**Status**: ⚠️ V2-only, needs V9.1 update

---

#### cli/learn.ts (Learning Agent)

**Usage:**
```bash
npx ts-node cli/learn.ts --session-id xxx
```

**Flow:**
```
Feedback → learningAgent.processFeedback() → Model updates
```

**Status**: ℹ️ Separate concern, doesn't generate plans

---

## Part 2: Data Flow - From Input to Output

### 2.1 Fast Generation Mode (bin/planner.ts generate)

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT                                                   │
│ planner generate -c CLABSI -d picu --model gpt-4o          │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. CONSTRUCT PlanningInput                                  │
│    bin/planner.ts:55-76                                     │
│    ┌─────────────────────────────────────────┐             │
│    │ concern_id: 'CLABSI'           (V1)     │             │
│    │ concern: 'CLABSI'              (V9.1)   │             │
│    │ domain: 'picu'                 (V1)     │             │
│    │ intent: 'surveillance'         (V9.1)   │             │
│    │ target_population: 'picu'      (V9.1)   │             │
│    │ archetype: inferArchetype()    (V1/V8)  │             │
│    └─────────────────────────────────────────┘             │
│    ⚠️ HYBRID: Contains both V1 and V9.1 fields             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CALL generatePlan()                                      │
│    planner/plannerAgent.ts:237                              │
│    ┌─────────────────────────────────────────┐             │
│    │ V9.1 Entry Point (Phase 3)              │             │
│    │ - Extracts concern                      │             │
│    │ - Lookups archetype via matrix          │             │
│    │ - Determines domain                     │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
         ┌────────────┴────────────┐
         │                         │
    [Research?]               [Direct LLM]
         │                         │
         NO                        YES
         │                         │
         └────────────┬────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3A. DIRECT V9.1 GENERATION (Phase 3)                        │
│     planner/plannerAgent.ts:274-290                         │
│     ┌─────────────────────────────────────────┐             │
│     │ generatePlanWithLLM()                   │             │
│     │ llmPlanGeneration.ts:207                │             │
│     │   ↓                                     │             │
│     │ loadPlannerSystemPrompt()               │             │
│     │   → plannerPrompt_v9.1.md (default)     │             │
│     │   ↓                                     │             │
│     │ buildV91UserPrompt()                    │             │
│     │   ↓                                     │             │
│     │ callLLMForJSON()                        │             │
│     │   ↓                                     │             │
│     │ parseStrictV91Plan() ← VALIDATES HERE  │             │
│     │   - Schema completeness                 │             │
│     │   - 5-group rule                        │             │
│     │   - Evidence typing                     │             │
│     │   - Dependency integrity                │             │
│     │   - THROWS ERROR if invalid             │             │
│     └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3B. MOCK MODE FALLBACK                                      │
│     planner/plannerAgent.ts:292-300                         │
│     ┌─────────────────────────────────────────┐             │
│     │ Falls back to legacy planHAC()          │             │
│     │   → generateHACPlanWithTemplates()      │             │
│     │   → Returns template-based plan         │             │
│     │   ⚠️ Uses OLD normalization             │             │
│     └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RETURN PlannerPlan                                       │
│    ┌─────────────────────────────────────────┐             │
│    │ plan_metadata: {                        │             │
│    │   plan_id, planner_version: '9.1.0',    │             │
│    │   status, generated_at, model_used      │             │
│    │ }                                       │             │
│    │ rationale: {                            │             │
│    │   summary, key_decisions,               │             │
│    │   pediatric_focus_areas,                │             │
│    │   archetype_selection_reason            │             │
│    │ }                                       │             │
│    │ clinical_config: { ... }                │             │
│    │ validation: {                           │             │
│    │   checklist: { ... },  ← POPULATED     │             │
│    │   is_valid: true,                       │             │
│    │   errors: [], warnings: []              │             │
│    │ }                                       │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SAVE/OUTPUT                                              │
│    bin/planner.ts:88-93                                     │
│    - Save to file if --output specified                     │
│    - Or print to stdout                                     │
│    ⚠️ NO ADDITIONAL VALIDATION                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Observations:**
1. ✅ V9.1 generation works (Phase 3)
2. ✅ Validation happens DURING generation (parseStrictV91Plan)
3. ⚠️ Mock mode uses OLD path (template generation with normalization)
4. ❌ NO post-generation validation (assumes Phase 3 caught everything)
5. ❌ `validation.checklist` is populated with dummy values (all YES)

---

### 2.2 Research-Plan-Implement Mode (bin/planner.ts rpi)

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT                                                   │
│ planner rpi -c CLABSI --force-refresh                       │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. RESEARCH ORCHESTRATION                                   │
│    commands/researchPlanImplement.ts:33                     │
│    ┌─────────────────────────────────────────┐             │
│    │ orchestrateResearch()                   │             │
│    │ research/researchOrchestrator.ts        │             │
│    │   ↓                                     │             │
│    │ Fetch from authorities:                 │             │
│    │   - CDC (HAC bundle guidelines)         │             │
│    │   - NHSN (surveillance definitions)     │             │
│    │   - SPS (pediatric sepsis)              │             │
│    │   - KDIGO (kidney disease)              │             │
│    │   - USNWR (quality metrics)             │             │
│    │   ↓                                     │             │
│    │ ResearchBundle {                        │             │
│    │   research_id, coverage,                │             │
│    │   research_findings[],                  │             │
│    │   metadata                              │             │
│    │ }                                       │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RESEARCH-AUGMENTED PLANNING                              │
│    commands/researchPlanImplement.ts:93                     │
│    ┌─────────────────────────────────────────┐             │
│    │ generatePlan(input, config, research)   │             │
│    │   ↓                                     │             │
│    │ plannerAgent.ts:262-267                 │             │
│    │   → Delegates to:                       │             │
│    │   generatePlanWithResearch()            │             │
│    │   researchAugmentedPlanner.ts           │             │
│    │   ↓                                     │             │
│    │ Enriches prompt with research findings  │             │
│    │ Adds provenance tracking                │             │
│    │ Returns PlannerPlanV2                   │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. QUALITY ASSESSMENT                                       │
│    planner/qualityAssessment.ts:25                          │
│    ┌─────────────────────────────────────────┐             │
│    │ assessPlanQuality(plan)                 │             │
│    │   ↓                                     │             │
│    │ Calculates dimensions:                  │             │
│    │   - research_coverage                   │             │
│    │   - spec_compliance                     │             │
│    │   - clinical_accuracy                   │             │
│    │   - data_feasibility                    │             │
│    │   - parsimony                           │             │
│    │   - completeness                        │             │
│    │   - implementation_readiness            │             │
│    │   ↓                                     │             │
│    │ Returns QualityAttributes               │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RETURN PlannerPlanV2                                     │
│    ┌─────────────────────────────────────────┐             │
│    │ plan_metadata: { V2 structure }         │             │
│    │ quality: QualityAttributes              │             │
│    │ provenance: {                           │             │
│    │   research_enabled: true,               │             │
│    │   sources: [...research sources]        │             │
│    │ }                                       │             │
│    │ clinical_config: { ... }                │             │
│    │ validation: { ... }                     │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Key Observations:**
1. ✅ Research mode works well
2. ⚠️ Returns **PlannerPlanV2** (not V9.1 PlannerPlan)
3. ⚠️ V2 has different structure (quality, provenance fields)
4. ❌ Research mode hasn't been updated for V9.1
5. ✅ Quality assessment comprehensive (Tier 3)

---

### 2.3 Legacy Mode (cli/plan.ts)

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT                                                   │
│ npx ts-node cli/plan.ts input.json                          │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. LOAD & VALIDATE INPUT                                    │
│    cli/plan.ts:74-80                                        │
│    ┌─────────────────────────────────────────┐             │
│    │ validatePlanningInput(input)            │             │
│    │ validatePlan.ts:237                     │             │
│    │   ↓                                     │             │
│    │ Checks: concern_id, domain required     │             │
│    │ ⚠️ OLD validation (V1 fields)           │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CALL generatePlan()                                      │
│    cli/plan.ts:88                                           │
│    ┌─────────────────────────────────────────┐             │
│    │ ✅ Uses V9.1 generatePlan()             │             │
│    │ (Updated in Phase 2)                    │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TYPE CONFUSION                                           │
│    cli/plan.ts:92-104                                       │
│    ┌─────────────────────────────────────────┐             │
│    │ if (isV2Plan(plan)) {                   │             │
│    │   confidence = plan.quality.overall_score│             │
│    │   requiresReview = plan.status.requires_review│       │
│    │ } else {                                │             │
│    │   ❌ confidence = plan.plan_metadata.confidence│      │
│    │   ❌ requiresReview = plan.plan_metadata.requires_review│
│    │ }                                       │             │
│    │                                         │             │
│    │ ⚠️ PROBLEM: V9.1 PlannerPlan doesn't    │             │
│    │    have these fields!                   │             │
│    │    Will cause runtime errors            │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDATE OUTPUT                                          │
│    cli/plan.ts:122                                          │
│    ┌─────────────────────────────────────────┐             │
│    │ validatePlan(plan)                      │             │
│    │ validatePlan.ts:56                      │             │
│    │   ↓                                     │             │
│    │ ⚠️ OLD validation (checks V1/V2 fields) │             │
│    │ ❌ Doesn't check V9.1 requirements      │             │
│    └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Key Observations:**
1. ⚠️ Partially updated (calls V9.1 function)
2. ❌ Type mismatches (expects V1/V2 fields from V9.1 plan)
3. ❌ Uses OLD validation (doesn't check V9.1)
4. **Status**: Broken for V9.1 plans

---

## Part 3: Version Conflicts

### 3.1 Version Timeline

```
V1 (Original)
├── plan_metadata.confidence
├── plan_metadata.requires_review
├── hac_config (root object)
└── No validation.checklist

V2 (Research Enhanced)
├── plan_metadata (complex structure with workflow, status)
├── quality (QualityAttributes)
├── provenance
├── clinical_config (root object)
└── validation (with spec_compliance_valid)

V7.1 (External Validation)
├── clinical_config (NOT hac_config)
├── 13 required sections
├── planner_version: "7.1.0"
└── External validation via externalValidator.ts

V9.1 (Current - Phase 3)
├── plan_metadata (simplified)
├── rationale (with archetype_selection_reason)
├── clinical_config (10 mandatory sections)
├── validation.checklist (5 checks)
└── planner_version: "9.1.0"
```

### 3.2 Field Comparison

| Field | V1 | V2 | V7.1 | V9.1 | Notes |
|-------|----|----|------|------|-------|
| **plan_metadata.confidence** | ✅ | ❌ | ❌ | ❌ | V1 only |
| **plan_metadata.requires_review** | ✅ | ✅ (in status) | ❌ | ❌ | V1/V2 only |
| **quality** | ❌ | ✅ | ❌ | ❌ | V2 only |
| **provenance** | ❌ | ✅ | ❌ | ❌ | V2 only |
| **validation.checklist** | ❌ | ❌ | ❌ | ✅ | V9.1 only |
| **rationale.archetype_selection_reason** | ❌ | ❌ | ❌ | ✅ | V9.1 only |
| **clinical_config (root)** | ❌ | ✅ | ✅ | ✅ | V2+ |
| **hac_config (root)** | ✅ | ❌ | ❌ | ❌ | V1 only (deprecated) |

### 3.3 Code Accessing Obsolete Fields

**cli/plan.ts (Lines 92-104):**
```typescript
if (isV2Plan(plan)) {
  confidence = plan.quality.overall_score;        // V2 only
  requiresReview = plan.plan_metadata.status.requires_review;  // V2 only
} else {
  planId = plan.plan_metadata.plan_id;
  confidence = plan.plan_metadata.confidence;     // ❌ V1 only, doesn't exist in V9.1
  requiresReview = plan.plan_metadata.requires_review;  // ❌ V1 only
}
```

**cli/revise.ts (Lines 167-169):**
```typescript
const currentScore = plan.quality.overall_score;  // ❌ V2 only
const currentGrade = plan.quality.quality_grade;  // ❌ V2 only
```

**planner/qa.ts (Multiple locations):**
```typescript
// Line 321
if (!plan.validation.schema_valid) { ... }  // ❌ Old ValidationResult structure

// Line 353
const confidence = plan.plan_metadata.confidence || 0.8;  // ❌ V1 only

// Line 365
const requiresReview = plan.plan_metadata.requires_review || false;  // ❌ V1 only
```

**validatePlan.ts (Lines 175-176):**
```typescript
if (v1.plan_metadata.confidence < 0 || v1.plan_metadata.confidence > 1) {  // ❌ V1 only
  errors.push(`Confidence must be between 0 and 1, got ${v1.plan_metadata.confidence}`);
}
```

---

## Part 4: Validation Points

### 4.1 Current Validation Landscape

```
Entry Point
    ↓
[1] validatePlanningInput()  ← INPUT validation (validatePlan.ts:237)
    ↓
generatePlan() / planHAC()
    ↓
[2] parseStrictV91Plan()  ← GENERATION-TIME validation (llmPlanGeneration.ts:58)
    ├─ Schema completeness
    ├─ 5-group rule
    ├─ Evidence typing
    └─ Dependency integrity
    ↓
[3] normalizeHacConfig()  ← LEGACY auto-fill (DEPRECATED in Phase 3 for V9.1)
    ↓
[4] validatePlan()  ← OUTPUT validation (validatePlan.ts:56)
    ├─ Schema validation (AJV)
    └─ Business rules
    ↓
[5] assessPlan()  ← QUALITY checks (assessPlan.ts:36)
    ├─ Validation result
    └─ Quality dimensions
    ↓
[6] assessPlanQuality()  ← V2 QUALITY (qualityAssessment.ts:25)
    ├─ 7 dimensions
    └─ Deployment readiness
    ↓
[7] validatePlanV71()  ← EXTERNAL validation (externalValidator.ts:129)
    ├─ 10-point checklist
    └─ Adherence score
```

### 4.2 Validation Overlap & Redundancy

| Check | Phase 3 Parser | validatePlan | assessPlan | qualityAssessment | externalValidator |
|-------|---------------|--------------|------------|-------------------|-------------------|
| **Schema completeness** | ✅ | ✅ (AJV) | ❌ | ❌ | ✅ (manual) |
| **5-group rule** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Evidence typing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Dependency integrity** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Provenance presence** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **No placeholders** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Business rules** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Quality dimensions** | ❌ | ❌ | ✅ (simple) | ✅ (comprehensive) | ❌ |
| **Clinical accuracy** | ❌ | ❌ | ✅ | ✅ | ❌ |

**Key Issues:**
1. **Overlap**: Schema completeness checked 3 times (parser, AJV, manual)
2. **Gap**: Provenance safety not checked anywhere
3. **Gap**: Pediatric compliance not checked anywhere
4. **Redundancy**: assessPlan and qualityAssessment both assess quality
5. **Inconsistency**: Phase 3 parser throws errors, others return warnings

---

## Part 5: Template vs LLM Generation

### 5.1 Generation Mode Matrix

```
                    │ LLM Mode              │ Mock/Template Mode
────────────────────┼───────────────────────┼──────────────────────
Fast Generation     │ generatePlanWithLLM() │ generateHACPlanWithTemplates()
(bin/planner.ts)    │ ✅ V9.1 strict        │ ⚠️ V7.1 with normalization
────────────────────┼───────────────────────┼──────────────────────
Research Mode       │ generatePlanWithResearch() │ N/A (always LLM)
(bin/planner.ts rpi)│ ✅ V2 with provenance │
────────────────────┼───────────────────────┼──────────────────────
Legacy CLI          │ generatePlan()        │ generatePlan() with useMock
(cli/plan.ts)       │ ✅ V9.1 (Phase 3)     │ ⚠️ Falls back to legacy
```

### 5.2 Template Generation Flow (Mock Mode)

```
config.useMock = true
    ↓
plannerAgent.ts:292-300 (V9.1 entry point)
    ↓
Fallback to planHAC()
    ↓
planHAC() → isHACArchetype() or isUSNWRArchetype()
    ↓
generateHACPlanWithTemplates() or generateUSNWRPlanWithTemplates()
    ↓
Uses domainRouter.ts templates
    ↓
getHACGroupTemplates() or getUSNWRGroupTemplates()
    ↓
Fills with placeholder data
    ↓
⚠️ PROBLEM: Uses OLD normalizeHacConfig()
    → Auto-fills missing sections
    → Bypasses V9.1 strict validation
```

**Issue**: Mock mode undermines Phase 3 strict validation.

---

## Part 6: Inconsistencies & Problems

### 6.1 Critical Issues

#### Issue #1: Validation Checklist Dummy Values

**Location**: `llmPlanGeneration.ts:274-285`

**Problem:**
```typescript
validation: {
  checklist: {
    schema_completeness: { result: 'YES', severity: 'CRITICAL' },
    domain_structure_5_groups: { result: 'YES', severity: 'CRITICAL' },
    provenance_safety: { result: 'YES', severity: 'CRITICAL' },  // ❌ NOT ACTUALLY CHECKED
    pediatric_compliance: { result: 'YES', severity: 'HIGH' },   // ❌ NOT ACTUALLY CHECKED
    dependency_integrity: { result: 'YES', severity: 'CRITICAL' }
  },
  is_valid: true,  // ❌ Always true
  errors: [],
  warnings: []
}
```

**Impact**: Checklist says "YES" for checks that weren't performed.

---

#### Issue #2: Type Confusion in cli/plan.ts

**Problem**: Calls V9.1 function but expects V1 fields
```typescript
const plan = await generatePlan(input, config);  // Returns V9.1 PlannerPlan

// But then tries to access V1 fields:
confidence = plan.plan_metadata.confidence;  // ❌ Doesn't exist in V9.1
requiresReview = plan.plan_metadata.requires_review;  // ❌ Doesn't exist in V9.1
```

**Impact**: Runtime TypeErrors

---

#### Issue #3: Research Mode Returns V2, Not V9.1

**Problem**: RPI mode returns PlannerPlanV2, but V9.1 expects PlannerPlan

```typescript
// researchAugmentedPlanner.ts returns PlannerPlanV2
// But V9.1 generatePlan() signature says: Promise<PlannerPlan>
```

**Impact**: Type inconsistency, V2 structure incompatible with V9.1 tools

---

#### Issue #4: Mock Mode Uses Legacy Normalization

**Problem**: V9.1 strict mode bypassed in mock mode

```typescript
if (!config.useMock) {
  return await generatePlanWithLLM(...);  // ✅ V9.1 strict
} else {
  return planHAC(...);  // ❌ Uses OLD normalizeHacConfig()
}
```

**Impact**: Mock mode generates plans that don't meet V9.1 requirements

---

#### Issue #5: Multiple Quality Assessment Functions

**Redundancy:**
- `assessPlan.ts::assessValidation()` - Simple quality dimensions
- `qualityAssessment.ts::assessPlanQuality()` - Comprehensive 7-dimension scoring

**Problem**: Which one is authoritative? They return different structures.

---

### 6.2 Deprecated Code Still in Use

#### Legacy Functions (Should be removed or marked deprecated):

1. **planHAC()** (plannerAgent.ts:278)
   - Status: ⚠️ Called by mock mode
   - Should: Be deprecated, only used for backward compatibility

2. **normalizeHacConfig()** (llmPlanGeneration.ts)
   - Status: ✅ Removed in Phase 3
   - Should: Ensure it's not called anywhere

3. **generateHACPlanWithLLM()** / **generateUSNWRPlanWithLLM()**
   - Status: ✅ Deprecated in Phase 3, wrappers remain
   - Should: Keep as wrappers, document deprecation

4. **isHACArchetype()** / **isUSNWRArchetype()** (plannerAgent.ts)
   - Status: ⚠️ Still used by planHAC()
   - Should: Remove when planHAC() removed

5. **inferArchetype()** (bin/planner.ts:192)
   - Status: ⚠️ Duplicates ARCHETYPE_MATRIX logic
   - Should: Remove, use lookupArchetype() instead

---

## Part 7: Recommended Canonical V9.1 Flow

### 7.1 Clean End-to-End Flow

```
┌─────────────────────────────────────────────────────────────┐
│ ENTRY POINT                                                  │
│ bin/planner.ts (Unified CLI)                                │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. CONSTRUCT PlanningInput (V9.1 Pure)                      │
│    ┌─────────────────────────────────────────┐             │
│    │ planning_input_id: string               │             │
│    │ concern: string (V9.1 ONLY)             │             │
│    │ domain_hint: DomainType                 │             │
│    │ intent: IntentType                      │             │
│    │ target_population: string               │             │
│    │ specific_requirements: string[]         │             │
│    └─────────────────────────────────────────┘             │
│    ❌ REMOVE: concern_id, archetype, domain (legacy)       │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDATE INPUT                                           │
│    validatePlanningInputV91(input)                          │
│    - Check required fields (concern, intent, target_population)│
│    - Validate domain_hint is valid DomainType              │
│    - Validate target_population is pediatric               │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ARCHETYPE MATRIX LOOKUP                                  │
│    lookupArchetype(concern, domain_hint)                    │
│    → { archetype, domain }                                  │
└─────────────────────────────────────────────────────────────┘
                      ↓
         ┌────────────┴────────────┐
         │                         │
    [Research?]               [Direct LLM]
         │                         │
         YES                       NO
         │                         │
         ↓                         ↓
┌──────────────────────┐  ┌─────────────────────────────────┐
│ 4A. RESEARCH MODE    │  │ 4B. DIRECT LLM MODE             │
│ orchestrateResearch()│  │ generatePlanWithLLM()           │
│ → ResearchBundle     │  │   - Load v9.1 prompt            │
│ ↓                    │  │   - Build user prompt           │
│ generatePlanWithLLM()│  │   - Call LLM                    │
│ (with research)      │  │   - Parse response              │
└──────────────────────┘  └─────────────────────────────────┘
         │                         │
         └────────────┬────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. STRICT PARSING & INLINE VALIDATION                       │
│    parseStrictV91Plan(response, input)                      │
│    - Schema completeness (THROWS if missing)                │
│    - 5-group rule (THROWS if wrong count)                   │
│    - Evidence typing (THROWS if missing L1/L2/L3)           │
│    - Dependency integrity (THROWS if tool mismatch)         │
│    ✅ FAIL FAST - Don't return invalid plans                │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. POST-GENERATION VALIDATION                               │
│    validatePlanV91(plan)                                    │
│    - Provenance safety (NEW)                                │
│    - Pediatric compliance (NEW)                             │
│    - Template compliance (NEW)                              │
│    - Archetype selection quality (NEW)                      │
│    - Prompt quality (NEW)                                   │
│    ✅ POPULATE validation.checklist with ACTUAL results     │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. QUALITY ASSESSMENT (Optional, V2 mode)                   │
│    if (researchMode) {                                      │
│      assessPlanQuality(plan)                                │
│      - Research coverage                                    │
│      - Spec compliance                                      │
│      - Clinical accuracy                                    │
│      → Attach as plan.quality (V2 extension)                │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. RETURN PlannerPlan (V9.1)                                │
│    - plan_metadata (V9.1 structure)                         │
│    - rationale (with archetype_selection_reason)            │
│    - clinical_config (10 mandatory sections)                │
│    - validation (checklist populated with REAL results)     │
│    [Optional: quality, provenance for V2 compatibility]     │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Key Principles

1. **Single Version Forward** - V9.1 is primary, V2 is extension
2. **Fail Fast** - Invalid plans throw errors during generation
3. **Real Validation** - Checklist reflects actual checks performed
4. **No Auto-Fill** - Strict parsing, no normalization
5. **Clear Separation** - Parse (strict) → Validate (comprehensive) → Assess (quality)

---

## Part 8: Migration Roadmap

### 8.1 Immediate (Phase 4)

**Priority 0 (Blockers):**
1. ✅ Fix `validation.checklist` - Populate with real results, not dummy YES values
2. ✅ Implement missing checks (provenance_safety, pediatric_compliance)
3. ✅ Fix cli/plan.ts type confusion - Update to handle V9.1 fields
4. ✅ Fix cli/revise.ts - Update for V9.1 or mark V2-only

**Priority 1 (Important):**
5. ✅ Create validatePlanV91() - Comprehensive post-generation validation
6. ✅ Mark deprecated functions clearly (planHAC, inferArchetype)
7. ✅ Update bin/planner.ts - Remove legacy field population

### 8.2 Short-term (Post Phase 4)

**Priority 2:**
8. ⏭️ Update research mode for V9.1 - Return PlannerPlan, not PlannerPlanV2
9. ⏭️ Refactor mock mode - Use V9.1 templates or remove normalization
10. ⏭️ Consolidate quality assessment - Single authoritative function

### 8.3 Long-term (Cleanup)

**Priority 3:**
11. ⏭️ Remove V1 support - Delete V1-specific code paths
12. ⏭️ Deprecate planHAC() - Keep as thin wrapper or remove
13. ⏭️ Schema migration - Consolidate to single V9.1 JSON schema

---

## Part 9: Decision Points

### Question 1: Research Mode Strategy

**Options:**
- **A**: Update researchAugmentedPlanner to return V9.1 PlannerPlan
  - Pros: Consistency, clean types
  - Cons: Lose V2 quality/provenance structure
- **B**: Keep V2 for research mode, V9.1 for fast mode
  - Pros: Preserve quality assessment
  - Cons: Two parallel types
- **C**: Extend V9.1 PlannerPlan with optional quality/provenance
  - Pros: Best of both worlds
  - Cons: More complex type

**Recommendation**: **Option C** - V9.1 as base, optional V2 extensions

---

### Question 2: Mock Mode Future

**Options:**
- **A**: Update templates to V9.1 strict (no normalization)
  - Pros: Consistent with LLM mode
  - Cons: More work to create valid templates
- **B**: Remove mock mode entirely
  - Pros: Simplest, LLM is primary use case
  - Cons: Lose testing capability
- **C**: Keep mock mode with V7.1 normalization, clearly marked
  - Pros: Backward compatible
  - Cons: Perpetuates old code

**Recommendation**: **Option A** - Update templates, or **B** if mock mode not critical

---

### Question 3: Validation Architecture

**Options:**
- **A**: Single validatePlanV91() function (all checks in one place)
  - Pros: Simple, clear
  - Cons: Large function
- **B**: Tiered validation (structural → semantic → quality)
  - Pros: Separation of concerns
  - Cons: Multiple validation points
- **C**: Pipeline validation (chain of validators)
  - Pros: Composable, flexible
  - Cons: Complexity

**Recommendation**: **Option B** - Tiered (matches Phase 4 addendum)

---

### Question 4: Deprecated Code

**Options:**
- **A**: Remove immediately
  - Pros: Clean codebase
  - Cons: Breaking changes
- **B**: Mark @deprecated, remove in next major version
  - Pros: Gradual migration
  - Cons: Code stays longer
- **C**: Keep forever for backward compatibility
  - Pros: Never breaks
  - Cons: Technical debt

**Recommendation**: **Option B** - Deprecate now, remove in v10.0

---

## Part 10: Action Items

### Phase 4 (Current) - Validation

1. **Create validateV91.ts**
   - Implement all Tier 1 & 2 checks
   - Populate real checklist values
   - Return comprehensive ValidationResults

2. **Fix cli/plan.ts**
   - Remove V1 field access
   - Use V9.1 PlannerPlan interface
   - Update type guards

3. **Update llmPlanGeneration.ts**
   - Call validatePlanV91() after parsing
   - Populate checklist with real results
   - Remove dummy validation values

4. **Fix externalValidator.ts**
   - Correct signal group IDs
   - Update required sections list
   - Add V9.1 mode

### Phase 5 (Next) - Research Mode

5. **Update researchAugmentedPlanner.ts**
   - Return V9.1 PlannerPlan (with optional extensions)
   - Add quality/provenance as optional fields
   - Update quality assessment

6. **Consolidate quality assessment**
   - Merge assessPlan and qualityAssessment
   - Single authoritative function
   - Clear V2 extension mechanism

### Phase 6 (Cleanup) - Deprecation

7. **Mark deprecated**
   - Add @deprecated JSDoc to all legacy functions
   - Update documentation
   - Add migration guides

8. **Remove V1 support**
   - Delete V1-specific code
   - Update all type guards
   - Simplify PlanningInput interface

---

## Summary

**Current State**: Hybrid system with V1/V2/V7.1/V9.1 coexisting
**Problem**: Type confusion, validation gaps, dummy checklist values
**Root Cause**: Incremental updates without cleaning up legacy code
**Solution**: Define clean V9.1 flow, fix validation, deprecate legacy

**Next**: Review this analysis, decide on architecture questions, proceed with Phase 4.

---

**Analysis Complete** - Ready for architectural decisions
