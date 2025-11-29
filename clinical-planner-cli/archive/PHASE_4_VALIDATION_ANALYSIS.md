# Phase 4: Validation Analysis - Current vs V9.1 Requirements

**Date**: 2025-11-27
**Purpose**: Analyze existing validation code and map to V9.1 requirements

---

## Executive Summary

The codebase has **three validation files** with different purposes:
1. **validatePlan.ts** - Generic schema + business rules validation
2. **externalValidator.ts** - V7.1-specific strict validation with enumerated checklist
3. **qualityAssessment.ts** - Quality scoring for deployment readiness (V2 plans)

**Key Finding**: ~60% of V9.1 validation logic is already implemented in Phase 3's `parseStrictV91Plan()`. The remaining 40% needs to be added to `validatePlan.ts` and `externalValidator.ts` needs fixes for V9.1 compatibility.

---

## Current State: Three Validators

### 1. validatePlan.ts (Generic Validation)

**Purpose**: Schema + business rules validation for V1/V2 plans
**Status**: 🟡 Partially relevant, needs V9.1 extension

**What it currently validates:**
```typescript
interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  schema_valid: boolean;      // AJV JSON schema validation
  business_rules_valid: boolean;
}
```

**Validation checks:**
- ✅ Schema validation via AJV (JSON schema files)
- ✅ Basic business rules (plan_id, planning_input_id required)
- ✅ Signal groups exist and have signals
- ✅ Timeline has phases
- ✅ Criteria has rules
- ⚠️ V1-specific checks (confidence field) - **NOT IN V9.1**
- ⚠️ V2-specific checks (quality field) - **NOT IN V9.1**

**Problems:**
```typescript
// Line 175: References 'confidence' which doesn't exist in V9.1
if (v1.plan_metadata.confidence < 0 || v1.plan_metadata.confidence > 1) {
  errors.push(`Confidence must be between 0 and 1, got ${v1.plan_metadata.confidence}`);
}

// Line 220: References 'signal_types' which is deprecated in V9.1
const hasSignals = (group.signals && group.signals.length > 0) ||
                   (group.signal_types && group.signal_types.length > 0);
```

**What's missing for V9.1:**
- ❌ No `ValidationChecklist` structure (required by V9.1)
- ❌ No evidence_type validation
- ❌ No dependency integrity checks (signals ↔ tools)
- ❌ No provenance safety checks
- ❌ No pediatric compliance checks
- ❌ No 5-group rule enforcement

---

### 2. externalValidator.ts (V7.1 Strict Validation)

**Purpose**: Enumerated checklist validation independent of LLM self-reporting
**Status**: 🟡 Good structure, needs V9.1 updates

**What it currently validates:**
```typescript
interface ValidationChecklist {
  root_object_check: { result: 'YES' | 'NO'; details: string };
  required_sections: { result: 'YES' | 'NO'; missing_sections: string[] };
  signal_grouping: { result: 'YES' | 'NO'; expected_groups: string[]; actual_groups: string[] };
  provenance_signals: { result: 'YES' | 'NO'; signals_missing_provenance: string[] };
  provenance_criteria: { result: 'YES' | 'NO'; rules_missing_provenance: string[] };
  no_placeholders: { result: 'YES' | 'NO'; placeholder_violations: string[] };
  signal_schema_completeness: { result: 'YES' | 'NO'; incomplete_signals: string[] };
  questions_schema: { result: 'YES' | 'NO'; found_structure: string };
  version_number: { result: 'YES' | 'NO'; actual_version: string };
  rationale_completeness: { result: 'YES' | 'NO'; concerns_count: number };
}
```

**Strengths:**
- ✅ Excellent checklist structure (matches V9.1 pattern)
- ✅ Root object naming check (clinical_config vs hac_config)
- ✅ Required sections check (13 sections)
- ✅ Signal grouping validation
- ✅ Provenance checks for signals and criteria
- ✅ Placeholder detection (TBD, Auto-generated, etc.)
- ✅ Signal schema completeness
- ✅ Adherence score calculation (0-100%)

**Problems:**

#### Critical: Wrong Signal Group IDs (Lines 108-114)
```typescript
// WRONG (V7.1/V8 naming):
const USNWR_SIGNAL_GROUPS: USNWRSignalGroupId[] = [
  'core',        // ❌ Should be 'core_criteria'
  'delay_drivers',
  'documentation',
  'ruleouts',    // ❌ Should be 'rule_outs' (underscore)
  'overrides'
];
```

#### Missing V9.1 Checks
- ❌ No evidence_type validation (L1/L2/L3)
- ❌ No dependency integrity (signals ↔ tools cross-reference)
- ❌ No provenance safety (domain-specific source validation)
- ❌ No pediatric compliance (banned adult-only terms)
- ❌ Hardcoded to 13 sections (V9.1 has 10 mandatory sections)

#### Differences in Required Sections
**V7.1 (externalValidator.ts lines 84-98):**
```typescript
const REQUIRED_SECTIONS = [
  'config_metadata', 'domain', 'surveillance', 'signals',
  'timeline', 'criteria', 'questions', 'summary_config',
  'definition', 'config2080', 'fieldMappings', 'clinical_tools', 'prompts'
]; // 13 sections
```

**V9.1 (from spec):**
```typescript
const REQUIRED_SECTIONS_V91 = [
  'config_metadata', 'domain', 'surveillance', 'signals',
  'timeline', 'criteria', 'questions', 'prompts',
  'fieldMappings', 'clinical_tools'
]; // 10 sections (removed: summary_config, definition, config2080)
```

**Note**: `summary_config`, `definition`, and `config2080` are **optional** in V9.1, not mandatory.

---

### 3. qualityAssessment.ts (Quality Scoring)

**Purpose**: Multi-dimensional quality scoring for deployment readiness
**Status**: 🟢 Different purpose, not directly related to V9.1 validation

**What it does:**
- Scores plans on 7 dimensions (0-1 scale):
  - Clinical accuracy
  - Data feasibility
  - Parsimony
  - Completeness
  - Research coverage (research mode only)
  - Spec compliance (research mode only)
  - Implementation readiness (research mode only)
- Calculates overall quality score
- Evaluates deployment readiness gates
- Generates recommendations

**Relevance to V9.1:**
- ✅ Complementary to validation (quality scoring vs. compliance)
- ✅ Can coexist with V9.1 validation
- ⚠️ Currently only works with PlannerPlanV2 (not V9.1 PlannerPlan)
- ℹ️ Not required for Phase 4 - can be updated later if needed

---

## V9.1 Validation Requirements

Per V9.1 Specification Section 6, the validation checklist MUST include:

### Required Checks (from V9.1 spec):

| Check Name | Severity | Status | Location |
|------------|----------|--------|----------|
| **schema_completeness** | CRITICAL | ✅ **Phase 3** | parseStrictV91Plan:65-93 |
| **domain_structure_5_groups** | CRITICAL | ✅ **Phase 3** | parseStrictV91Plan:95-101 |
| **provenance_safety** | CRITICAL | ❌ **Missing** | - |
| **pediatric_compliance** | HIGH | ❌ **Missing** | - |
| **dependency_integrity** | CRITICAL | ✅ **Phase 3** | parseStrictV91Plan:122-140 |

### Additional Useful Checks (from externalValidator.ts):

| Check Name | Usefulness | Can Reuse? |
|------------|------------|------------|
| **root_object_check** | ✅ High | Yes (lines 175-193) |
| **provenance_signals** | ✅ High | Yes (needs adaptation) |
| **provenance_criteria** | ✅ High | Yes (needs adaptation) |
| **no_placeholders** | ✅ Medium | Yes (lines 116-124 patterns) |
| **signal_schema_completeness** | ✅ Medium | Yes (needs evidence_type check) |
| **questions_schema** | ⚠️ Low | Maybe (V7.1-specific) |
| **version_number** | ⚠️ Low | Maybe (checks for '7.1.0') |
| **rationale_completeness** | ✅ Medium | Yes (adapt for V9.1) |

---

## Gap Analysis

### ✅ Already Implemented (Phase 3)

These checks are **already done** in `llmPlanGeneration.ts::parseStrictV91Plan()`:

1. **Schema Completeness** (Lines 65-93)
   - Checks all 10 mandatory sections exist
   - Fails fast if any missing

2. **5-Group Rule** (Lines 95-101)
   - Enforces exactly 5 signal groups
   - Domain-agnostic

3. **Evidence Typing** (Lines 103-120)
   - All signals must have evidence_type
   - Must be 'L1', 'L2', or 'L3'

4. **Dependency Integrity** (Lines 122-140)
   - Signals with linked_tool_id must reference existing tools
   - Cross-validates clinical_tools array

**Problem**: These checks happen during **parsing**, not during **validation**.

**Why this matters:**
- V9.1 spec expects `plan.validation.checklist` to be populated
- Currently, Phase 3 throws errors instead of populating checklist
- Need to refactor into reusable validation functions

---

### ❌ Missing Validations

These V9.1 checks are **not implemented anywhere**:

#### 1. Provenance Safety (CRITICAL)

**Definition**: Domain-specific provenance source validation

**Rules:**
```typescript
// Quality/Mortality domains cannot use NHSN sources
if ((domain === 'Quality' || domain === 'Safety') && source === 'NHSN') {
  error: 'NHSN source invalid for Quality/Safety domain'
}

// HAC domain should prefer NHSN sources
if (domain === 'HAC' && source !== 'NHSN' && !hasNHSNSource) {
  warning: 'HAC domain should include NHSN-sourced signals'
}

// Orthopedics should use USNWR/medical society guidelines
if (domain === 'Orthopedics' && source === 'NHSN') {
  error: 'NHSN source invalid for Orthopedics domain'
}
```

**Complexity**: Medium
**Estimated effort**: 30-45 minutes

---

#### 2. Pediatric Compliance (HIGH)

**Definition**: Detect and flag adult-only terminology/scoring systems

**Banned terms:**
```typescript
const BANNED_TERMS = [
  'SOFA',      // Sequential Organ Failure Assessment (adult)
  'qSOFA',     // Quick SOFA (adult)
  'adult',     // Explicit adult reference
  'geriatric', // Elderly-specific
  'APACHE',    // Adult ICU scoring (if not pediatric variant)
  'MELD',      // Adult liver disease scoring
  'CURB-65'    // Adult pneumonia severity (pediatric uses CRB)
];

// Exception: 'pediatric SOFA' is allowed (pSOFA)
const config = JSON.stringify(plan.clinical_config).toLowerCase();
for (const term of BANNED_TERMS) {
  if (config.includes(term.toLowerCase())) {
    // Check if it's prefixed with 'pediatric' or other qualifying term
    if (!hasPediatricQualifier(config, term)) {
      violations.push(term);
    }
  }
}
```

**False positive risk**: Medium (need to check for qualifiers)
**Complexity**: Medium
**Estimated effort**: 30 minutes

---

### 🔧 Needs Fixing

#### 1. Signal Group IDs (externalValidator.ts)

**Current (WRONG):**
```typescript
const USNWR_SIGNAL_GROUPS: USNWRSignalGroupId[] = [
  'core',        // ❌ V7.1 naming
  'delay_drivers',
  'documentation',
  'ruleouts',    // ❌ No underscore
  'overrides'
];
```

**Correct (V9.1):**
```typescript
const ORTHO_SIGNAL_GROUPS: OrthoSignalGroupId[] = [
  'core_criteria',  // ✅ Underscore added
  'delay_drivers',
  'documentation',
  'rule_outs',      // ✅ Underscore added
  'overrides'
];

const ENDO_SIGNAL_GROUPS: EndoSignalGroupId[] = [
  'core_criteria',
  'lab_evidence',
  'external_evidence',
  'care_gaps',
  'overrides'
];
```

**Also add domain detection:**
```typescript
function getExpectedSignalGroups(domain: DomainType): SignalGroupId[] {
  switch (domain) {
    case 'HAC':
    case 'Safety':
      return ['rule_in', 'rule_out', 'delay_drivers', 'documentation_gaps', 'bundle_gaps'];
    case 'Orthopedics':
      return ['core_criteria', 'delay_drivers', 'documentation', 'rule_outs', 'overrides'];
    case 'Endocrinology':
      return ['core_criteria', 'lab_evidence', 'external_evidence', 'care_gaps', 'overrides'];
    case 'Quality':
      return ['core_criteria', 'exclusions', 'modifiers', 'documentation', 'overrides'];
    default:
      return []; // Unknown domain
  }
}
```

**Complexity**: Low
**Estimated effort**: 20 minutes

---

#### 2. Required Sections Count (externalValidator.ts)

**Current (V7.1):**
```typescript
const REQUIRED_SECTIONS = [
  'config_metadata', 'domain', 'surveillance', 'signals',
  'timeline', 'criteria', 'questions', 'summary_config',
  'definition', 'config2080', 'fieldMappings', 'clinical_tools', 'prompts'
]; // 13 sections
```

**Update to V9.1:**
```typescript
const REQUIRED_SECTIONS_V91 = [
  'config_metadata', 'clinical_tools', 'surveillance',
  'signals', 'timeline', 'criteria', 'questions',
  'prompts', 'fieldMappings', 'domain'
]; // 10 mandatory sections

const OPTIONAL_SECTIONS_V91 = [
  'summary_config', 'definition', 'config2080'
]; // Can be present but not required
```

**Complexity**: Low
**Estimated effort**: 10 minutes

---

## Refactoring Strategy

### Problem: Validation Logic Split Between Files

Currently, V9.1 validation is split:
- **llmPlanGeneration.ts** - parseStrictV91Plan() does 60% of validation (but throws errors)
- **validatePlan.ts** - Legacy validation (missing V9.1 checks)
- **externalValidator.ts** - V7.1 validation (good structure, wrong data)

### Proposed Solution: Unified V9.1 Validator

**Option 1: Extend validatePlan.ts (RECOMMENDED)**

**Pros:**
- Canonical location for validation
- Already imported by other modules
- Has schema validation infrastructure (AJV)

**Cons:**
- Need to add ValidationChecklist structure
- More work to integrate

**Approach:**
```typescript
// validatePlan.ts

export function validatePlanV91(plan: PlannerPlan): ValidationResults {
  const checklist: ValidationChecklist = {
    schema_completeness: checkSchemaCompleteness(plan),
    domain_structure_5_groups: check5GroupRule(plan),
    provenance_safety: checkProvenanceSafety(plan),         // NEW
    pediatric_compliance: checkPediatricCompliance(plan),   // NEW
    dependency_integrity: checkDependencyIntegrity(plan)
  };

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Convert checklist results to errors/warnings
  for (const [check, result] of Object.entries(checklist)) {
    if (result.result === 'NO') {
      if (result.severity === 'CRITICAL') {
        errors.push({ code: `ERR_${check}`, message: result.message!, field: check });
      } else {
        warnings.push({ code: `WARN_${check}`, message: result.message!, field: check });
      }
    }
  }

  return {
    checklist,
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

// Reuse logic from parseStrictV91Plan
function checkSchemaCompleteness(plan: PlannerPlan): CheckResult {
  const config = plan.clinical_config;
  const required = [
    'config_metadata', 'clinical_tools', 'surveillance',
    'signals', 'timeline', 'criteria', 'questions',
    'prompts', 'fieldMappings', 'domain'
  ];

  const missing = required.filter(s => !config[s]);

  return {
    result: missing.length === 0 ? 'YES' : 'NO',
    severity: 'CRITICAL',
    message: missing.length > 0 ? `Missing sections: ${missing.join(', ')}` : undefined
  };
}
```

---

**Option 2: Update externalValidator.ts for V9.1**

**Pros:**
- Already has perfect checklist structure
- Already has adherence scoring
- Less disruption to validatePlan.ts

**Cons:**
- Currently V7.1-focused
- Need to rename to indicate it handles multiple versions
- Duplicate validation logic

**Approach:**
```typescript
// externalValidator.ts → rename to strictValidator.ts

export function validatePlanStrict(plan: PlannerPlan, version: '7.1' | '9.1'): ExternalValidationResult {
  if (version === '9.1') {
    return validatePlanV91(plan);
  } else {
    return validatePlanV71(plan);
  }
}

function validatePlanV91(plan: PlannerPlan): ExternalValidationResult {
  const checklist: ValidationChecklistV91 = {
    schema_completeness: checkSchemaCompletenessV91(plan),
    domain_structure_5_groups: check5GroupRule(plan),
    evidence_typing: checkEvidenceTyping(plan),              // NEW
    provenance_safety: checkProvenanceSafety(plan),          // NEW
    pediatric_compliance: checkPediatricCompliance(plan),    // NEW
    dependency_integrity: checkDependencyIntegrity(plan)     // NEW
  };

  // ... rest of validation
}
```

---

### Recommendation: **Hybrid Approach**

1. **Keep externalValidator.ts** for V7.1 backward compatibility
2. **Create new validateV91.ts** with V9.1-specific validation
3. **Update validatePlan.ts** to dispatch to correct validator:

```typescript
// validatePlan.ts

export function validatePlan(plan: PlannerPlan | PlannerPlanV2): ValidationResult {
  const version = plan.plan_metadata.planner_version || '1.0';

  if (version.startsWith('9.1')) {
    return validatePlanV91(plan as PlannerPlan);
  } else if (version.startsWith('7.')) {
    return validatePlanV71Legacy(plan);
  } else if (isV2Plan(plan)) {
    return validatePlanV2(plan as PlannerPlanV2);
  } else {
    return validatePlanV1(plan as PlannerPlan);
  }
}
```

---

## Phase 4 Implementation Plan

### Task Breakdown

| Task | File | Effort | Priority | Dependencies |
|------|------|--------|----------|--------------|
| 1. Create validateV91.ts | NEW | 2h | P0 | None |
| 2. Implement checkProvenanceSafety() | validateV91.ts | 45min | P0 | Task 1 |
| 3. Implement checkPediatricCompliance() | validateV91.ts | 30min | P0 | Task 1 |
| 4. Extract validation from parseStrictV91Plan() | llmPlanGeneration.ts | 1h | P0 | Task 1 |
| 5. Fix signal group IDs | externalValidator.ts | 20min | P1 | None |
| 6. Update required sections | externalValidator.ts | 10min | P1 | None |
| 7. Update validatePlan() dispatcher | validatePlan.ts | 30min | P1 | Task 1 |
| 8. Add evidence_type check to externalValidator | externalValidator.ts | 20min | P2 | None |
| 9. Integration testing | - | 1h | P0 | All above |

**Total Estimated Effort**: 6 hours

---

## Validation Architecture (Proposed)

```
validatePlan.ts (Dispatcher)
    ↓
    ├─→ validatePlanV91() → validateV91.ts (NEW)
    │       ├─ checkSchemaCompleteness()
    │       ├─ check5GroupRule()
    │       ├─ checkEvidenceTyping()
    │       ├─ checkDependencyIntegrity()
    │       ├─ checkProvenanceSafety() ← NEW
    │       └─ checkPediatricCompliance() ← NEW
    │
    ├─→ validatePlanV71() → externalValidator.ts (UPDATED)
    │       └─ Fix signal group IDs, required sections
    │
    └─→ validatePlanV2() → qualityAssessment.ts (NO CHANGES)
            └─ Quality scoring (separate concern)
```

---

## Questions for User

1. **Validator location**: Create new `validateV91.ts` or extend `validatePlan.ts`?
   - **Recommendation**: New file for cleaner separation

2. **Backward compatibility**: Keep V7.1 validation working?
   - **Recommendation**: Yes, many plans in V7.1 format

3. **externalValidator.ts**: Rename to `validateV71.ts` for clarity?
   - **Recommendation**: Yes, makes version explicit

4. **Refactor parseStrictV91Plan()**: Extract validation into reusable functions?
   - **Recommendation**: Yes, but keep fail-fast behavior during parsing

5. **Provenance safety rules**: Are the domain-specific rules above correct?
   - **Need**: Confirmation from clinical/domain experts

---

## Next Steps

**Immediate (User Decision):**
1. Review this analysis
2. Confirm validation architecture approach
3. Approve implementation plan

**Phase 4 Implementation:**
1. Create `validateV91.ts` with V9.1 validation functions
2. Implement missing checks (provenance safety, pediatric compliance)
3. Fix externalValidator.ts signal group IDs
4. Refactor parseStrictV91Plan() to use shared validation
5. Update validatePlan.ts dispatcher
6. Integration testing

**Success Criteria:**
- ✅ All V9.1 plans have populated `validation.checklist`
- ✅ All 5 required checks implemented
- ✅ Backward compatibility with V7.1 maintained
- ✅ No TypeScript compilation errors
- ✅ Validation runs in <100ms

---

**Analysis Complete**: Ready for Phase 4 implementation approval
