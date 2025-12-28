# CPPO Quality Criteria

**Version**: 1.0
**Date**: 2025-11-29
**Purpose**: Define quality standards that guide CPPO design and validate outputs

---

## Overview

CPPO implements a **3-Tier Quality Model** that validates plans at structural, semantic, and clinical levels. These criteria guide both:
1. **Design-time decisions** (how we build CPPO)
2. **Runtime validation** (how we validate plan outputs)

---

## Tier 1: Structural Correctness (CRITICAL)

**Gate Policy**: MUST PASS for plan to be usable
**Validation**: Automatic, deterministic checks

### T1.1: Schema Completeness
**Criterion**: All 10 required V9.1 sections must be present

**Required Sections**:
1. `plan_metadata`
2. `rationale`
3. `clinical_config`
4. `clinical_config.config_metadata`
5. `clinical_config.domain`
6. `clinical_config.surveillance`
7. `clinical_config.signals`
8. `clinical_config.timeline`
9. `clinical_config.prompts`
10. `clinical_config.criteria`

**Design Implication**:
- S6 (Plan Assembly) must construct all 10 sections
- Each stage must contribute its required subsection
- No optional top-level sections

**Test**: `checkT1_SchemaCompleteness(plan)`

---

### T1.2: Five-Group Rule
**Criterion**: Exactly 5 signal groups required (V9.1 compliance)

**Validation**:
- `plan.clinical_config.signals.signal_groups.length === 5`
- No more, no less

**Design Implication**:
- S2 (Structural Skeleton) is CRITICAL for this
- Must use domain-specific templates (HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, etc.)
- Signal emphasis from rankings must return exactly 5 groups
- If `getSignalEmphasis()` returns ≠ 5, fall back to domain defaults

**Test**: `checkT1_FiveGroupRule(plan)`

---

### T1.3: Evidence Types
**Criterion**: All signals must have valid `evidence_type` (L1/L2/L3)

**Validation**:
- Every signal has `evidence_type` ∈ {L1, L2, L3}
- No null/undefined evidence_type

**Design Implication**:
- S5 (Task Execution) - `signal_enrichment` task must assign evidence_type
- Prompt must explicitly instruct LLM to classify each signal
- Validation must reject signals without evidence_type

**Test**: `checkT1_EvidenceTypes(plan)`

---

### T1.4: Tool References
**Criterion**: All `signal.linked_tool_id` must reference existing `clinical_tools`

**Validation**:
- Build set of all `clinical_tools[].tool_id`
- Check every `signal.linked_tool_id` ∈ tool_ids
- No dangling references

**Design Implication**:
- S5 - `clinical_review_plan` task must populate `clinical_tools` BEFORE `signal_enrichment`
- Or: S5 must validate tool_id references before returning
- Consider two-pass signal enrichment: (1) identify tools, (2) link signals

**Test**: `checkT1_ToolReferences(plan)`

---

## Tier 2: Semantic Correctness (HIGH/MEDIUM)

**Gate Policy**: Warnings only, plan still usable
**Validation**: Context-aware checks

### T2.1: Template Match
**Criterion**: Signal groups must match domain-specific template

**Validation**:
- HAC domain → must use HAC_GROUP_DEFINITIONS group_ids
- Orthopedics → must use ORTHO_GROUP_DEFINITIONS or ranking-informed groups
- Endocrinology → must use ENDO_GROUP_DEFINITIONS or ranking-informed groups

**Design Implication**:
- S2 must respect domain templates strictly
- When using `signal_emphasis` from rankings, validate against expected domain groups
- If mismatch, prefer domain template over rankings

**Test**: `checkT2_TemplateMatch(plan)`

---

### T2.2: Archetype Compatibility
**Criterion**: Plan structure must align with archetype expectations

**Archetype-Specific Requirements**:
- **Preventability_Detective** (HAC):
  - Must have `rule_in`, `rule_out` groups
  - Signals should reference NHSN/CDC guidelines
  - Focus on preventability assessment

- **Process_Auditor** (USNWR):
  - Must have compliance/delay/documentation groups
  - Signals should reference quality metrics
  - Focus on protocol adherence

- **Preventability_Detective_Metric** (Endo):
  - Must have clinical criteria groups (glycemic, device, etc.)
  - Signals should reference clinical thresholds
  - Focus on metric-based assessment

**Design Implication**:
- S1 sets archetype → S3/S4/S5 must use archetype-specific task graphs and prompts
- Prompt templates should be organized: `prompts/{domain}/{archetype}/{task}/v{N}.ts`

**Test**: `checkT2_ArchetypeCompatibility(plan)`

---

### T2.3: Provenance Sources
**Criterion**: Signals should cite authoritative sources

**Expected Sources by Domain**:
- HAC: CDC NHSN, AHRQ, CMS
- Orthopedics: AAOS, NHSN, AHRQ_ORTHO
- Endocrinology: KDIGO, ADA, Endocrine Society

**Design Implication**:
- S5 - Research bundle integration (already exists in `researchAugmentedPlanner.ts`)
- Prompts should instruct LLM to cite sources
- Signal schema should have optional `source` field

**Test**: `checkT2_ProvenanceSources(plan)`

---

### T2.4: Pediatric Safety
**Criterion**: Plans must respect pediatric-specific constraints

**Checks**:
- Age-appropriate language in prompts/summaries
- Pediatric-specific risk factors highlighted
- No adult-only guidelines cited

**Design Implication**:
- All prompts must include pediatric context
- S0 intentInference already pediatric-aware
- S5 event_summary / 20_80_display_fields tasks must emphasize pediatric context

**Test**: `checkT2_PediatricSafety(plan)`

---

### T2.5: Prompt Keywords
**Criterion**: Task prompts must contain domain-specific keywords

**Expected Keywords by Task**:
- `signal_enrichment`: "evidence", "rule in", "rule out", "bundle"
- `event_summary`: "narrative", "timeline", "patient story"
- `20_80_display_fields`: "first screen", "concise", "20/80 rule"
- `followup_questions`: "clarification", "missing data", "ambiguity"

**Design Implication**:
- S4 (Prompt Plan) must select correct prompt templates
- Prompt registry should validate keyword presence
- Consider prompt template linting tool

**Test**: `checkT2_PromptKeywords(plan)`

---

### T2.6: Task Prompt Quality
**Criterion**: Prompts must be clear, complete, and contextual

**Quality Metrics**:
- Prompt length: 500-2000 tokens (not too short, not bloated)
- Includes example outputs
- Specifies response format (JSON schema if structured)
- Includes ranking context (for USNWR top 20)

**Design Implication**:
- S5 `buildPromptWithContext()` method is CRITICAL
- Must inject:
  - `ranking_context.summary` → event_summary
  - `ranking_context.top_performer_benchmarks` → 20_80_display_fields
  - `ranking_context.signal_emphasis` → signal_enrichment
- Prompts should be versioned (v3, v4, etc.)

**Test**: `checkT2_TaskPromptQuality(plan)`

---

### T2.7: Ranking Awareness ⭐ NEW
**Criterion**: USNWR plans for top 20 specialties must demonstrate ranking awareness

**Checks**:
- Plan mentions rank or specialty name in `event_summary`
- Signals reference top performer benchmarks (Boston Children's, CHOP, Stanford)
- Signal groups aligned with `quality_differentiators` from rankings data

**Design Implication**:
- S1 loads `ranking_context` → CRITICAL dependency for S5
- S5 prompts MUST inject ranking context if present
- S6 global validation should check for ranking mentions

**Test**: `checkT2_RankingAwareness(plan)` ← **Already exists in validateV91.ts!**

---

## Tier 3: Clinical Quality

**Gate Policy**: Aspirational, requires clinical expert review
**Validation**: Manual or external LLM-based assessment

### T3.1: Clinical Accuracy
**Criterion**: Signals must be clinically valid and relevant

**Validation**: External validator (qualityAssessment.ts)
- Uses LLM to assess clinical plausibility
- Checks for medical contradictions
- Verifies clinical logic

**Design Implication**:
- S6 can optionally call `qualityAssessment.assessPlanQuality(plan)`
- Not blocking, but should be logged

---

### T3.2: Actionability
**Criterion**: Signals must be actionable by clinicians

**Checks**:
- Signal has clear next step
- Linked to a clinical tool
- Includes threshold or criterion

**Design Implication**:
- S5 `clinical_review_plan` task must define actionable tools
- Signal prompts should emphasize "what should the clinician do?"

---

### T3.3: Completeness
**Criterion**: Plan covers all relevant clinical aspects

**Checks**:
- All high-priority signal groups have ≥ 1 signal
- No empty signal groups
- Event summary addresses all major risks

**Design Implication**:
- S5 validation should reject empty signal groups
- Retry logic if critical groups are empty

---

## Design-Time Quality Criteria (CPPO Implementation)

### DT.1: Stage Isolation
**Criterion**: Each stage should be independently testable

**Guidelines**:
- ✅ Pure input/output functions (no hidden state)
- ✅ Validation function for each stage
- ✅ Mock-friendly (inject dependencies)

**Status**: ✅ S0, S1, S2 already follow this

---

### DT.2: Validation Gates
**Criterion**: Every stage must have a validation gate

**Guidelines**:
- Stage can only proceed if previous stage validation passes
- Validation failures logged to `run_manifest.json`
- Tier 1 failures → halt pipeline
- Tier 2 failures → warn but continue

**Status**: ⚠️ Partially implemented (S0-S2 have validators, but no gate enforcement yet)

**Action Needed**: Create `StageOrchestrator` that enforces gates

---

### DT.3: Observability
**Criterion**: Every run must emit complete observability data

**Requirements**:
- `run_manifest.json` written for every run (success or failure)
- Includes stage durations, retry counts, validation results
- Prompt versions and model names logged

**Status**: ⚠️ Not yet implemented

**Action Needed**:
- Create `RunManifest.ts` writer
- Integrate into MetaOrchestrator

---

### DT.4: Prompt Versioning
**Criterion**: All prompts must be versioned and tracked

**Guidelines**:
- Prompts stored in `prompts/{domain}/{archetype}/{task}/v{N}.ts`
- Eval mode can compare v3 vs v4
- run_manifest.json records which version was used

**Status**: ⚠️ Folder structure exists, no prompts written yet

**Action Needed**:
- Implement S4 (Prompt Plan) with version selection
- Create prompt registry

---

### DT.5: Ranking Integration Completeness ⭐
**Criterion**: All ranking intelligence must flow through the pipeline

**Checklist**:
- ✅ S1 loads `ranking_context` for USNWR top 20
- ✅ S1 uses `getSignalEmphasis()` for signal groups
- ✅ S2 uses `signal_emphasis` to select groups
- ⚠️ S5 must inject `ranking_context.summary` into prompts (not yet implemented)
- ⚠️ S5 must inject `top_performer_benchmarks` into prompts (not yet implemented)
- ⚠️ S6 must validate ranking mentions (not yet implemented)

**Action Needed**:
- S5 implementation with prompt injection
- S6 validation using `checkT2_RankingAwareness()`

---

## Quality Metrics Dashboard (Future)

Track these metrics across runs:

**Structural Quality**:
- Tier 1 pass rate (target: 100%)
- Tier 2 warning rate (target: < 10%)

**Ranking Integration**:
- % of USNWR plans with ranking_context populated (target: 100% for top 20)
- % of USNWR plans mentioning rank in event_summary (target: > 90%)

**Execution Quality**:
- Average stage durations
- Retry rates by stage
- Prompt version distribution

---

## Next Steps: Applying Quality Criteria

1. **Create Validation Framework** (`orchestrator/validators/ValidationFramework.ts`)
   - Enforce gates between stages
   - Log validation results to manifest

2. **Implement S3-S6 with Quality in Mind**
   - S3: Validate TaskGraph is acyclic
   - S4: Validate prompt versions exist
   - S5: Validate prompt injection for USNWR
   - S6: Run Tier 1/2/3 validation

3. **Create Quality Checklist for Each Stage**
   - S0: concern_id extracted, valid format
   - S1: ranking_context present for USNWR top 20
   - S2: exactly 5 groups, correct group_ids
   - S3: DAG validated, must_run nodes exist
   - S4: prompt templates found, versions match
   - S5: all tasks executed, Tier 1 checks pass per task
   - S6: Tier 1 MUST PASS, Tier 2 warnings logged, Tier 3 optional

---

## References

- **Source**: `factory-cli/planner/validateV91.ts`
- **Related**: `validatePlan.ts`, `qualityAssessment.ts`, `externalValidator.ts`
- **ARCHITECTURE.md**: Section "Decision 3: Retry Strategy"
