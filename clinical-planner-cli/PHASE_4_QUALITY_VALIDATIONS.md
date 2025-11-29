# Phase 4 Addendum: Semantic & Quality Validations

**Date**: 2025-11-27
**Purpose**: Expand validation beyond structure to include semantic correctness and quality

---

## Executive Summary

The original Phase 4 analysis focused on **structural validation** (schema completeness, 5-group rule, etc.). This addendum addresses **semantic validation** - ensuring plans are not just syntactically correct but also:

1. **Template-compliant** - Signal groups match domain templates
2. **Archetype-appropriate** - Archetype selection matches concern type
3. **Prompt-aligned** - Prompts reflect archetype purpose
4. **Task-specific** - Task prompts support their intended workflows

These validations ensure **clinical soundness** and **functional appropriateness**, not just JSON correctness.

---

## Validation Tier Model

```
┌─────────────────────────────────────────────────┐
│ Tier 1: Structural Validation (Phase 3 + 4)    │
│ ✅ Schema completeness, 5-group rule, evidence │
│ ✅ Dependency integrity, pediatric compliance   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Tier 2: Semantic Validation (THIS DOCUMENT)    │
│ 🆕 Template validation                          │
│ 🆕 Archetype selection quality                  │
│ 🆕 Prompt-archetype alignment                   │
│ 🆕 Task-specific prompt quality                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Tier 3: Clinical Quality (qualityAssessment.ts)│
│ ✅ Clinical accuracy, data feasibility          │
│ ✅ Research coverage, implementation readiness  │
└─────────────────────────────────────────────────┘
```

**This document addresses Tier 2.**

---

## 1. Template Validation

### Purpose
Ensure signal groups use the correct domain-specific template with proper group IDs, display names, and descriptions.

### Current State

**Templates exist in `domainRouter.ts`:**
```typescript
// HAC_GROUP_DEFINITIONS (lines 30-66)
const HAC_GROUPS = ['rule_in', 'rule_out', 'delay_drivers', 'documentation_gaps', 'bundle_gaps'];

// ORTHO_GROUP_DEFINITIONS (lines 71-107)
const ORTHO_GROUPS = ['core_criteria', 'delay_drivers', 'documentation', 'rule_outs', 'overrides'];

// ENDO_GROUP_DEFINITIONS (lines 113-149)
const ENDO_GROUPS = ['core_criteria', 'lab_evidence', 'external_evidence', 'care_gaps', 'overrides'];
```

**Helper function exists:**
```typescript
// domainRouter.ts:278-305
function validateGroupDomain(group: SignalGroup, expectedDomain: DomainType): boolean {
  // Returns true if group_id is valid for domain
}
```

### What's Missing

❌ **No validation that signal groups match their domain**
- HAC plans might have Ortho group IDs
- Ortho plans might have HAC group IDs
- No check that all 5 expected groups are present with correct names

❌ **No validation of group descriptions**
- Group descriptions should align with domain template
- Example: HAC 'rule_in' should mention "HAC presence" not "quality metric"

❌ **No validation of group ordering/priority**
- Groups should follow priority order (1-5)
- Higher priority groups should appear first

### Proposed Implementation

```typescript
/**
 * V9.1 Section 6.6: Template Compliance Check
 */
function checkTemplateCompliance(plan: PlannerPlan): CheckResult {
  const domain = plan.clinical_config.config_metadata.domain;
  const signalGroups = plan.clinical_config.signals.signal_groups;

  const expectedGroups = getExpectedGroupIds(domain);
  const actualGroups = signalGroups.map(g => g.group_id);

  const errors: string[] = [];

  // Check: All expected groups present
  const missingGroups = expectedGroups.filter(g => !actualGroups.includes(g));
  if (missingGroups.length > 0) {
    errors.push(`Missing signal groups for ${domain} domain: ${missingGroups.join(', ')}`);
  }

  // Check: No unexpected groups
  const unexpectedGroups = actualGroups.filter(g => !expectedGroups.includes(g));
  if (unexpectedGroups.length > 0) {
    errors.push(`Unexpected signal groups for ${domain} domain: ${unexpectedGroups.join(', ')}`);
  }

  // Check: Group descriptions match template
  const template = getGroupTemplateForDomain(domain);
  for (const group of signalGroups) {
    const expectedTemplate = template.find(t => t.group_id === group.group_id);
    if (!expectedTemplate) continue;

    // Validate display_name matches or is semantically similar
    if (group.display_name !== expectedTemplate.display_name) {
      errors.push(
        `Signal group '${group.group_id}' display_name mismatch: ` +
        `expected '${expectedTemplate.display_name}', got '${group.display_name}'`
      );
    }

    // Validate description contains key terms from template
    const templateKeywords = extractKeywords(expectedTemplate.description);
    const groupKeywords = extractKeywords(group.description);
    const overlap = templateKeywords.filter(k => groupKeywords.includes(k));

    if (overlap.length < templateKeywords.length * 0.5) {
      errors.push(
        `Signal group '${group.group_id}' description doesn't align with template. ` +
        `Expected keywords: ${templateKeywords.join(', ')}`
      );
    }
  }

  // Check: Groups are properly ordered by priority
  const priorities = signalGroups.map(g =>
    template.find(t => t.group_id === g.group_id)?.priority || 999
  );
  const isSorted = priorities.every((p, i, arr) => i === 0 || arr[i - 1] <= p);
  if (!isSorted) {
    errors.push('Signal groups are not ordered by priority');
  }

  return {
    result: errors.length === 0 ? 'YES' : 'NO',
    severity: 'HIGH',
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

function getExpectedGroupIds(domain: DomainType): SignalGroupId[] {
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
      return [];
  }
}
```

**Severity**: HIGH (not CRITICAL)
**Rationale**: Wrong template reduces clinical usability but doesn't break functionality
**Effort**: 1-1.5 hours

---

## 2. Archetype Selection Quality

### Purpose
Validate that the archetype chosen by the Archetype Matrix is appropriate for the concern type.

### Current State

**Archetype Matrix exists in `plannerAgent.ts:61-121`:**
```typescript
const ARCHETYPE_MATRIX: ArchetypeMapping[] = [
  { concern: 'CLABSI', domain: 'HAC', archetype: 'Preventability_Detective', ... },
  { concern: 'CAUTI', domain: 'HAC', archetype: 'Preventability_Detective', ... },
  { concern: /^I25$|Hip.*Fracture/i, domain: 'Orthopedics', archetype: 'Process_Auditor', ... },
  { concern: /^C35|Diabetes/i, domain: 'Endocrinology', archetype: 'Data_Scavenger', ... },
  { concern: /Mortality/i, domain: 'Quality', archetype: 'Exclusion_Hunter', ... },
  // ...
];

function lookupArchetype(concern: string, domainHint?: DomainType):
  { archetype: ArchetypeType; domain: DomainType }
```

**Problem**: Lookup is deterministic, but there's no **validation** that the result is appropriate.

### What's Missing

❌ **No post-hoc validation of archetype selection**
- If lookup returns Preventability_Detective for "Hip Fracture" (shouldn't happen, but bugs exist)
- No check that archetype makes clinical sense

❌ **No validation of domain-archetype compatibility**
```typescript
// INVALID combinations:
HAC domain + Data_Scavenger archetype  // HAC should use Preventability_Detective
Endocrinology domain + Exclusion_Hunter archetype  // Endo should use Data_Scavenger
```

❌ **No confidence scoring**
- Exact match ("CLABSI") vs. fuzzy match (/Mortality/i)
- Fallback to default archetype (low confidence)

### Domain-Archetype Compatibility Matrix

| Domain | Allowed Archetypes | Rationale |
|--------|-------------------|-----------|
| **HAC** | Preventability_Detective | Primary: Preventable harm focus |
| | Exclusion_Hunter | Secondary: Complex exclusion criteria (PSI.09, etc.) |
| **Orthopedics** | Process_Auditor | Primary: Timing and process adherence |
| **Endocrinology** | Data_Scavenger | Primary: Data completeness and quality |
| **Quality** | Exclusion_Hunter | Primary: Mortality metrics with exclusions |
| | Process_Auditor | Secondary: Process measures |
| **Safety** | Preventability_Detective | Primary: Similar to HAC |

### Proposed Implementation

```typescript
/**
 * V9.1 Section 6.7: Archetype Selection Quality Check
 */
function checkArchetypeSelection(plan: PlannerPlan): CheckResult {
  const domain = plan.clinical_config.config_metadata.domain;
  const archetype = plan.clinical_config.config_metadata.archetype;
  const concern = plan.plan_metadata.planning_input_id; // or extract from rationale

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check: Domain-Archetype compatibility
  const allowedArchetypes = getAllowedArchetypesForDomain(domain);
  if (!allowedArchetypes.includes(archetype)) {
    errors.push(
      `Archetype '${archetype}' is not compatible with domain '${domain}'. ` +
      `Allowed: ${allowedArchetypes.join(', ')}`
    );
  }

  // Check: Archetype selection reason exists and is substantive
  const selectionReason = plan.rationale.archetype_selection_reason;
  if (!selectionReason || selectionReason.length < 20) {
    warnings.push('Archetype selection reason is missing or too brief');
  }

  // Check: If archetype is default fallback, flag it
  if (selectionReason.includes('fallback') || selectionReason.includes('default')) {
    warnings.push(
      `Archetype selection used fallback logic for concern '${concern}'. ` +
      `Consider adding explicit mapping to ARCHETYPE_MATRIX.`
    );
  }

  // Check: Concern-specific archetype expectations
  const expectedArchetype = inferExpectedArchetype(concern);
  if (expectedArchetype && archetype !== expectedArchetype) {
    warnings.push(
      `Unexpected archetype for concern '${concern}': ` +
      `got '${archetype}', expected '${expectedArchetype}'`
    );
  }

  return {
    result: errors.length === 0 ? 'YES' : 'NO',
    severity: errors.length > 0 ? 'CRITICAL' : 'MEDIUM',
    message: [...errors, ...warnings].join('; ') || undefined
  };
}

function getAllowedArchetypesForDomain(domain: DomainType): ArchetypeType[] {
  switch (domain) {
    case 'HAC':
    case 'Safety':
      return ['Preventability_Detective', 'Exclusion_Hunter'];
    case 'Orthopedics':
      return ['Process_Auditor'];
    case 'Endocrinology':
      return ['Data_Scavenger'];
    case 'Quality':
      return ['Exclusion_Hunter', 'Process_Auditor'];
    default:
      return ['Preventability_Detective']; // Default fallback
  }
}

function inferExpectedArchetype(concern: string): ArchetypeType | null {
  // Hardcoded expectations for known concerns
  const expectations: Record<string, ArchetypeType> = {
    'CLABSI': 'Preventability_Detective',
    'CAUTI': 'Preventability_Detective',
    'SSI': 'Preventability_Detective',
    'VAE': 'Preventability_Detective',
    'I25': 'Process_Auditor',
    'Hip Fracture': 'Process_Auditor',
    'C35': 'Data_Scavenger',
    'Diabetes': 'Data_Scavenger',
    'Mortality': 'Exclusion_Hunter',
    'MORT': 'Exclusion_Hunter'
  };

  for (const [key, archetype] of Object.entries(expectations)) {
    if (concern.toUpperCase().includes(key.toUpperCase())) {
      return archetype;
    }
  }

  return null; // Unknown concern
}
```

**Severity**: CRITICAL for invalid domain-archetype combos, MEDIUM for suboptimal
**Effort**: 1 hour

---

## 3. Prompt-Archetype Alignment

### Purpose
Validate that the `system_prompt` and task prompts reflect the archetype's clinical focus.

### Archetype-Specific Prompt Expectations

#### Preventability_Detective
**Focus**: Preventable harm, bundle compliance, care gaps

**Expected prompt themes:**
- "preventable" / "preventability"
- "bundle" / "bundle element"
- "care gap" / "missed intervention"
- "timing of intervention"
- "present on admission" / "hospital-acquired"

**Example good prompt:**
```
"Identify preventable central line infections by analyzing bundle compliance,
timing of interventions, and care gaps that may have contributed to infection."
```

#### Process_Auditor
**Focus**: Process adherence, timing, delays, protocol compliance

**Expected prompt themes:**
- "time to" / "timing" / "delay"
- "protocol" / "guideline" / "standard of care"
- "process measure" / "quality indicator"
- "documentation" / "evidence of"
- "adherence" / "compliance"

**Example good prompt:**
```
"Evaluate adherence to orthopedic co-management protocols, focusing on time to
surgery, documentation of interventions, and process deviations."
```

#### Data_Scavenger
**Focus**: Data completeness, missing values, external sources

**Expected prompt themes:**
- "data" / "value" / "measurement"
- "missing" / "absent" / "not documented"
- "external" / "outside source"
- "laboratory" / "lab value"
- "completeness" / "availability"

**Example good prompt:**
```
"Extract laboratory values (HbA1c, LDL) and identify missing data elements required
for diabetes quality reporting. Cross-reference with external lab results."
```

#### Exclusion_Hunter
**Focus**: Exclusion criteria, rule-outs, competing diagnoses

**Expected prompt themes:**
- "exclusion" / "exclude"
- "rule out" / "contraindication"
- "competing diagnosis"
- "exception" / "exemption"
- "eligibility" / "inclusion criteria"

**Example good prompt:**
```
"Identify mortality exclusion criteria including hospice care, comfort measures,
DNR status, and competing terminal diagnoses."
```

### Proposed Implementation

```typescript
/**
 * V9.1 Section 6.8: Prompt-Archetype Alignment Check
 */
function checkPromptArchetypeAlignment(plan: PlannerPlan): CheckResult {
  const archetype = plan.clinical_config.config_metadata.archetype;
  const systemPrompt = plan.clinical_config.prompts.system_prompt;
  const taskPrompts = plan.clinical_config.prompts.task_prompts;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Get expected keywords for this archetype
  const expectedKeywords = getArchetypeKeywords(archetype);
  const requiredKeywords = expectedKeywords.required;
  const encouragedKeywords = expectedKeywords.encouraged;

  // Check system_prompt alignment
  const systemPromptLower = systemPrompt.toLowerCase();
  const missingRequired = requiredKeywords.filter(k =>
    !systemPromptLower.includes(k.toLowerCase())
  );

  if (missingRequired.length > 0) {
    warnings.push(
      `System prompt missing archetype-specific keywords for ${archetype}: ` +
      `${missingRequired.join(', ')}`
    );
  }

  const matchingEncouraged = encouragedKeywords.filter(k =>
    systemPromptLower.includes(k.toLowerCase())
  );

  if (matchingEncouraged.length < encouragedKeywords.length * 0.3) {
    warnings.push(
      `System prompt has weak alignment with ${archetype} focus. ` +
      `Consider including: ${encouragedKeywords.slice(0, 3).join(', ')}`
    );
  }

  // Check task prompts alignment
  const allTaskPrompts = [
    taskPrompts.patient_event_summary.instruction,
    taskPrompts.enrichment.instruction,
    taskPrompts.abstraction?.instruction || '',
    taskPrompts.qa.instruction
  ].join(' ').toLowerCase();

  const taskPromptAlignment = requiredKeywords.filter(k =>
    allTaskPrompts.includes(k.toLowerCase())
  ).length / requiredKeywords.length;

  if (taskPromptAlignment < 0.4) {
    warnings.push(
      `Task prompts have low alignment with ${archetype} (${(taskPromptAlignment * 100).toFixed(0)}%). ` +
      `Task prompts should reinforce archetype focus.`
    );
  }

  return {
    result: errors.length === 0 ? 'YES' : 'NO',
    severity: 'MEDIUM',
    message: [...errors, ...warnings].join('; ') || undefined
  };
}

function getArchetypeKeywords(archetype: ArchetypeType): {
  required: string[];
  encouraged: string[];
} {
  switch (archetype) {
    case 'Preventability_Detective':
      return {
        required: ['preventable', 'bundle', 'care gap'],
        encouraged: [
          'intervention', 'timing', 'hospital-acquired', 'present on admission',
          'compliance', 'element', 'missed', 'delayed'
        ]
      };

    case 'Process_Auditor':
      return {
        required: ['process', 'timing', 'protocol'],
        encouraged: [
          'delay', 'time to', 'adherence', 'guideline', 'standard of care',
          'documentation', 'evidence', 'deviation'
        ]
      };

    case 'Data_Scavenger':
      return {
        required: ['data', 'missing', 'laboratory'],
        encouraged: [
          'value', 'measurement', 'completeness', 'external', 'source',
          'available', 'absent', 'documented'
        ]
      };

    case 'Exclusion_Hunter':
      return {
        required: ['exclusion', 'rule out', 'criteria'],
        encouraged: [
          'competing', 'exception', 'exemption', 'eligibility', 'contraindication',
          'exclude', 'disqualify'
        ]
      };

    default:
      return { required: [], encouraged: [] };
  }
}
```

**Severity**: MEDIUM (doesn't break functionality, but reduces clinical relevance)
**Effort**: 1.5 hours

---

## 4. Task-Specific Prompt Quality

### Purpose
Validate that each task prompt (patient_event_summary, enrichment, abstraction, qa) is appropriate for its intended workflow.

### Task Prompt Requirements

#### patient_event_summary
**Purpose**: Guide abstractors to create narrative clinical timeline
**Required elements:**
- ✅ Mentions "summary" or "timeline"
- ✅ Mentions "patient" or "case"
- ✅ Instructs to include key events
- ✅ Specifies output format (narrative, structured, etc.)

**Example good prompt:**
```
{
  instruction: "Create a concise narrative summary of the patient's clinical timeline,
                highlighting key events related to CLABSI risk: line insertion, bundle
                compliance, and infection onset.",
  output_schema_ref: "patient_event_summary_v1"
}
```

**Red flags:**
- Too generic: "Summarize the case"
- Missing clinical focus
- No mention of timeline/events

---

#### enrichment (Signal Detection)
**Purpose**: Guide signal extraction from clinical notes
**Required elements:**
- ✅ Mentions "signals" or "findings"
- ✅ Mentions "extract" or "identify"
- ✅ References signal groups or categories
- ✅ Specifies evidence requirements

**Example good prompt:**
```
{
  instruction: "Extract clinical signals from documentation and categorize them into:
                rule-in (infection evidence), rule-out (alternative diagnoses),
                bundle compliance, and documentation gaps. Tag each signal with
                evidence type (L1/L2/L3).",
  output_schema_ref: "enrichment_findings_v1"
}
```

**Red flags:**
- No mention of signals/findings
- Generic "extract information"
- Missing categorization instructions

---

#### abstraction (Criteria Evaluation)
**Purpose**: Guide determination of whether criteria are met
**Required elements:**
- ✅ Mentions "criteria" or "rules"
- ✅ Mentions "evaluate" or "determine" or "assess"
- ✅ References decision logic
- ✅ Specifies output (YES/NO, score, etc.)

**Example good prompt:**
```
{
  instruction: "Evaluate each clinical criterion against extracted signals.
                For each criterion, determine if it is MET, NOT MET, or INDETERMINATE
                based on available evidence. Provide justification.",
  output_schema_ref: "abstraction_determination_v1"
}
```

**Red flags:**
- No mention of criteria/rules
- Missing decision logic
- No output specification

---

#### qa (Quality Assurance)
**Purpose**: Guide consistency checking and validation
**Required elements:**
- ✅ Mentions "validate" or "check" or "verify"
- ✅ Mentions "consistency" or "accuracy"
- ✅ Specifies what to check (signals vs criteria, internal contradictions, etc.)
- ✅ Specifies output (issues found, confidence score, etc.)

**Example good prompt:**
```
{
  instruction: "Validate the internal consistency of findings. Check that:
                1) All rule-in signals align with criteria met,
                2) Rule-out signals don't contradict rule-in signals,
                3) All criteria have supporting evidence.
                Flag any inconsistencies or confidence issues.",
  output_schema_ref: "qa_validation_v1"
}
```

**Red flags:**
- Generic "review the work"
- No mention of consistency/validation
- Missing specific checks

---

### Proposed Implementation

```typescript
/**
 * V9.1 Section 6.9: Task-Specific Prompt Quality Check
 */
function checkTaskPromptQuality(plan: PlannerPlan): CheckResult {
  const taskPrompts = plan.clinical_config.prompts.task_prompts;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each task prompt
  const checks = [
    {
      task: 'patient_event_summary',
      prompt: taskPrompts.patient_event_summary,
      requiredKeywords: ['summary', 'timeline', 'patient', 'event'],
      minKeywordsRequired: 2
    },
    {
      task: 'enrichment',
      prompt: taskPrompts.enrichment,
      requiredKeywords: ['signal', 'extract', 'identify', 'finding', 'categorize'],
      minKeywordsRequired: 2
    },
    {
      task: 'abstraction',
      prompt: taskPrompts.abstraction,
      requiredKeywords: ['criteria', 'evaluate', 'determine', 'assess', 'rule'],
      minKeywordsRequired: 2,
      optional: true
    },
    {
      task: 'qa',
      prompt: taskPrompts.qa,
      requiredKeywords: ['validate', 'check', 'verify', 'consistency', 'accuracy'],
      minKeywordsRequired: 2
    }
  ];

  for (const check of checks) {
    if (check.optional && !check.prompt) continue; // Abstraction is optional

    if (!check.prompt || !check.prompt.instruction) {
      errors.push(`Task prompt '${check.task}' is missing or has no instruction`);
      continue;
    }

    const instruction = check.prompt.instruction.toLowerCase();
    const matchingKeywords = check.requiredKeywords.filter(k =>
      instruction.includes(k.toLowerCase())
    );

    if (matchingKeywords.length < check.minKeywordsRequired) {
      warnings.push(
        `Task prompt '${check.task}' has weak specificity. ` +
        `Expected keywords: ${check.requiredKeywords.slice(0, 3).join(', ')}. ` +
        `Found: ${matchingKeywords.join(', ') || 'none'}`
      );
    }

    // Check instruction length
    if (instruction.length < 50) {
      warnings.push(
        `Task prompt '${check.task}' is very short (${instruction.length} chars). ` +
        `Consider adding more specific guidance.`
      );
    }

    // Check output_schema_ref exists
    if (!check.prompt.output_schema_ref || check.prompt.output_schema_ref.length === 0) {
      warnings.push(
        `Task prompt '${check.task}' missing output_schema_ref`
      );
    }
  }

  return {
    result: errors.length === 0 ? 'YES' : 'NO',
    severity: errors.length > 0 ? 'HIGH' : 'MEDIUM',
    message: [...errors, ...warnings].join('; ') || undefined
  };
}
```

**Severity**: HIGH for missing prompts, MEDIUM for weak prompts
**Effort**: 1 hour

---

## Summary: Extended Validation Checklist

### V9.1 Complete Validation Checklist

| Check | Severity | Status | Tier | Effort |
|-------|----------|--------|------|--------|
| **Tier 1: Structural** |
| schema_completeness | CRITICAL | ✅ Phase 3 | 1 | Done |
| domain_structure_5_groups | CRITICAL | ✅ Phase 3 | 1 | Done |
| evidence_typing | CRITICAL | ✅ Phase 3 | 1 | Done |
| dependency_integrity | CRITICAL | ✅ Phase 3 | 1 | Done |
| provenance_safety | CRITICAL | ❌ Phase 4 | 1 | 45min |
| pediatric_compliance | HIGH | ❌ Phase 4 | 1 | 30min |
| **Tier 2: Semantic** |
| template_compliance | HIGH | 🆕 Phase 4 | 2 | 1.5h |
| archetype_selection | CRITICAL | 🆕 Phase 4 | 2 | 1h |
| prompt_archetype_alignment | MEDIUM | 🆕 Phase 4 | 2 | 1.5h |
| task_prompt_quality | HIGH | 🆕 Phase 4 | 2 | 1h |
| **Tier 3: Clinical Quality** |
| clinical_accuracy | N/A | ✅ qualityAssessment | 3 | Exists |
| data_feasibility | N/A | ✅ qualityAssessment | 3 | Exists |
| research_coverage | N/A | ✅ qualityAssessment | 3 | Exists |

---

## Updated Phase 4 Implementation Plan

### Revised Effort Estimates

| Task Category | Subtasks | Total Effort |
|---------------|----------|--------------|
| **Tier 1 (Original)** | provenance_safety, pediatric_compliance | 1.25h |
| **Tier 2 (NEW)** | template, archetype, prompt alignment, task prompts | 5h |
| **Infrastructure** | validateV91.ts creation, refactoring, dispatcher | 3h |
| **Testing & Integration** | Unit tests, integration tests, documentation | 2h |
| **TOTAL** | | **11.25 hours** |

### Implementation Priority

**P0 (Must Have):**
1. Tier 1 validations (provenance_safety, pediatric_compliance)
2. template_compliance
3. archetype_selection

**P1 (Should Have):**
4. prompt_archetype_alignment
5. task_prompt_quality

**P2 (Nice to Have):**
6. Enhanced quality scoring integration

---

## Integration with Existing Quality Assessment

The new semantic validations (Tier 2) should **complement**, not replace, existing quality assessment (Tier 3):

```typescript
// Updated validation flow
export function validatePlanComplete(plan: PlannerPlan): CompleteValidationResult {
  // Tier 1: Structural validation
  const structural = validatePlanV91(plan);

  // Tier 2: Semantic validation (NEW)
  const semantic = validatePlanSemantic(plan);

  // Tier 3: Clinical quality (existing - only for V2 plans)
  const quality = isV2Plan(plan)
    ? assessPlanQuality(plan as PlannerPlanV2)
    : null;

  return {
    structural,
    semantic,
    quality,
    overall_valid: structural.is_valid && semantic.is_valid,
    deployment_ready: structural.is_valid && semantic.is_valid &&
                      (quality?.deployment_ready ?? true)
  };
}
```

---

## Open Questions

1. **Prompt alignment thresholds**: What % keyword match is acceptable?
   - Proposal: 40% for required, 30% for encouraged

2. **Template description matching**: Exact match or semantic similarity?
   - Proposal: Allow paraphrasing if key concepts present

3. **Archetype selection fallback**: Should default fallback be treated as error or warning?
   - Proposal: Warning (allows flexibility while flagging unusual cases)

4. **Task prompt minimums**: Should all 4 task prompts be mandatory?
   - Proposal: patient_event_summary, enrichment, qa are mandatory; abstraction is optional

5. **Integration with qualityAssessment.ts**: Merge or keep separate?
   - Proposal: Keep separate - semantic validation != quality scoring

---

**Next Steps:**
1. Review this addendum
2. Confirm priorities (P0 vs P1)
3. Approve effort estimates
4. Proceed with implementation or request clarifications

---

**Addendum Complete**: Semantic validation requirements documented
