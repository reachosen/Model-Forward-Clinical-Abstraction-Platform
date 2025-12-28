# Artifact Reorganization Plan

> **Status**: Draft → **In Review**
> **Created**: 2024-12-20
> **Updated**: 2024-12-22
> **Owner**: Planning + Eval Factory Teams

---

## 1. Problem Statement

Input/output files are scattered across the codebase making it difficult to:
- Locate artifacts for a specific metric or run
- Understand relationships between prompts, strategies, testcases, and reports
- Hand off certified artifacts to Schema Factory
- Onboard new team members

### Current Pain Points

| Issue | Example |
|-------|---------|
| Duplicate test data | `I25_batch_1.json` exists in 3+ locations |
| Scattered outputs | `safe_I25_batch1.json` in cli root, reports in `data/flywheel/reports/` |
| Hardcoded paths | `generate.ts`, `eval.ts`, `battle-test.ps1` all define paths differently |
| Mixed code + data | `flywheel/dataset/core.ts` (code) vs `data/flywheel/testcases/` (data) |
| Overlapping modules | `flywheel/`, `eval/`, `refinery/` have similar concerns |
| No run context | Can't tell which prompt version produced which report |
| No handoff zone | No clear staging area for Schema Factory |

---

## 2. Design Decisions (Finalized)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Domain hierarchy** | Framework → Specialty nesting | Matches regulatory/clinical bounded contexts (USNWR, HAC/NHSN are stable frameworks) |
| **Prompt code vs data** | Keep `.ts` assemblers + load `.md` templates | Dynamic assembly stays in code; editable prose moves to domain folders |
| **Certified placement** | Parallel handoff zone mirroring domains | Clean handoff to Schema Factory while preserving semantic organization |
| **Cross-domain assets** | Minimal `shared/` folder | Avoid coupling; only scoring harness/contracts live here |
| **Template engine** | Handlebars/Mustache syntax | Standard `{{variable}}` interpolation with documented escaping |

---

## 3. Complete Task Inventory

### Task Types (11 total)

| Task ID | Purpose | Mode | Key Inputs |
|---------|---------|------|------------|
| **Core Pipeline Tasks** | | | |
| `signal_enrichment` | Understand expected signals in patient data | One-shot | Signal group definitions, metric context |
| `event_summary` | Create summary of the clinical event | One-shot | Enriched signals, timeline |
| `20_80_display_fields` | 20% of fields that explain 80% of case + display order | One-shot | Field registry (deterministic) + LLM highlights |
| `followup_questions` | Questions relevant to active signals | One-shot | Enriched signals, identified gaps |
| `exclusion_check` | Determine denominator exclusions/exceptions | One-shot | Exclusion criteria definitions, patient data |
| **Interactive Tasks** | | | |
| `clinical_review_helper` | Conversational assistant for rule-in/rule-out decisions | Interactive | All constituent nodes, patient payload, conversation history |

### Task Execution Modes

| Mode | Description | Context Management |
|------|-------------|-------------------|
| **One-shot** | Single LLM call, deterministic output | Full context in prompt |
| **Interactive** | Multi-turn conversation with retrieval | Summary + last N turns + evidence retrieval per turn |

### Per-Task Artifacts Required

| Task | Prompt Template | Output Schema | Field Registry | Question Bank | Review Rules |
|------|----------------|---------------|----------------|---------------|--------------|
| `signal_enrichment` | ✅ | ✅ | — | — | — |
| `event_summary` | ✅ | ✅ | — | — | — |
| `20_80_display_fields` | ✅ | ✅ | ✅ **Required** | — | — |
| `followup_questions` | ✅ | ✅ | — | ✅ Optional | — |
| `exclusion_check` | ✅ | ✅ | — | — | ✅ **Required** |
| `clinical_review_helper` | ✅ | — (streaming) | — | ✅ Optional | ✅ **Required** |

### Archetypes (7 total)

| Archetype | Task Graph | Primary Use Case |
|-----------|-----------|------------------|
| `Process_Auditor` | signal → event → summary → followup → review → determination | Protocol adherence (I25, I26, etc.) |
| `Preventability_Detective` | signal → event → followup → review → determination | Root cause / HAC (CLABSI, CAUTI) |
| `Preventability_Detective_Metric` | (same as above) | Quality metrics (C35.*, C41.*) |
| `Exclusion_Hunter` | signal → exclusion_check → event | Denominator exclusions |
| `Delay_Driver_Profiler` | signal → event → summary → determination | Timing analysis |
| `Outcome_Tracker` | signal → event → determination | Outcome monitoring |

---

## 3b. Task Mapping to PromptBattleTestFlywheel

> Reference: `AspirationEndtoEndflow.md`

### Phase → Task → Artifact Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PromptBattleTestFlywheel                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  PHASE 1: INCEPTION (S0-S6 Pipeline)                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                                  │    │
│  │   S0: Input           S1: Domain        S2: Skeleton       S3: Task Graph       │    │
│  │   Normalization  ───▶ Resolution   ───▶ (Archetype)   ───▶ Identification       │    │
│  │                                                                                  │    │
│  │                       ┌─────────────────────────────────────────────────────────┐│    │
│  │                       │ S4-S5: Task Execution (Per-Archetype Lanes)             ││    │
│  │                       │                                                          ││    │
│  │                       │   ┌──────────────────┐                                  ││    │
│  │                       │   │ signal_enrichment │◀── definitions/signal_groups    ││    │
│  │                       │   └────────┬─────────┘                                  ││    │
│  │                       │            ▼                                             ││    │
│  │                       │   ┌──────────────────┐                                  ││    │
│  │                       │   │ exclusion_check  │◀── definitions/exclusion_criteria││    │
│  │                       │   └────────┬─────────┘                                  ││    │
│  │                       │            ▼                                             ││    │
│  │                       │   ┌──────────────────┐                                  ││    │
│  │                       │   │ event_summary    │                                  ││    │
│  │                       │   └────────┬─────────┘                                  ││    │
│  │                       │            ▼                                             ││    │
│  │                       │   ┌──────────────────┐                                  ││    │
│  │                       │   │ 20_80_display_fields│◀── definitions/field_registry    ││    │
│  │                       │   └────────┬─────────┘                                  ││    │
│  │                       │            ▼                                             ││    │
│  │                       │   ┌──────────────────┐                                  ││    │
│  │                       │   │ followup_questions│◀── definitions/question_bank   ││    │
│  │                       │   └────────┬─────────┘                                  ││    │
│  │                       └────────────┼─────────────────────────────────────────────┘│    │
│  │                                    ▼                                              │    │
│  │                       ┌─────────────────────────────────────────────────────────┐│    │
│  │                       │ S6: Plan Assembly                                        ││    │
│  │                       │                                                          ││    │
│  │                       │         PlannerPlan.json                                 ││    │
│  │                       └─────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                                │
│                                         ▼                                                │
│  PHASE 2: STRATEGY ─────────────────────────────────────────────────────────────────    │
│  │  Input: Task Prompts from Phase 1                                                    │
│  │  Output: BatchStrategy (strategy/generation.json)                                    │
│  │  Uses: Duet (knowledge) + Doubt (perturbations)                                     │
│  │                                                                                       │
│  PHASE 3: TEST GENERATION ──────────────────────────────────────────────────────────    │
│  │  Input: BatchStrategy                                                                │
│  │  Output: TestCase[] (tests/testcases/batch_*.json)                                  │
│  │  Contains: patient_payload + expectations                                            │
│  │                                                                                       │
│  PHASE 4: BATTLE TEST ──────────────────────────────────────────────────────────────    │
│  │  Run: S0-S6 against each TestCase                                                   │
│  │  Score: SAFE v0 (CR, AH, AC)                                                        │
│  │  Output: EvalReport (runs/{date}/{metric}/report.json)                              │
│  │                                      │                                                │
│  │                               ┌──────┴──────┐                                        │
│  │                               │   PASS?     │                                        │
│  │                               └──────┬──────┘                                        │
│  │                          YES ◀───────┴───────▶ NO                                    │
│  │                           │                    │                                      │
│  │                           ▼                    ▼                                      │
│  PHASE 5: CERTIFY ◀──────────┘          PHASE 4b: REFINERY LOOP                        │
│  │  Copy to: certified/{framework}/{specialty}/metrics/{metric}/                        │
│  │  Artifacts:                         │  Analyze failures                              │
│  │    - prompts.json                   │  Refine prompts                                │
│  │    - definitions.json               │  Loop back to Phase 4                          │
│  │    - tasks.json                     │                                                │
│  │    - certification.json             │                                                │
│  │                                                                                       │
│  UI RUNTIME (Post-Certification) ───────────────────────────────────────────────────    │
│  │  ┌─────────────────────────┐                                                         │
│  │  │ clinical_review_helper  │◀── definitions/review_rules                            │
│  │  │ (Interactive Assistant) │    All constituent nodes from S6                       │
│  │  │                         │    Patient payload (RAG retrieval)                     │
│  │  └─────────────────────────┘                                                         │
│  │  Mode: Conversational, per-turn evidence retrieval                                   │
│  │  Purpose: Help clinician rule-in/rule-out decisions                                 │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Task → Phase Mapping Table

| Task | Phase | When Executed | Input Artifacts | Output |
|------|-------|---------------|-----------------|--------|
| `signal_enrichment` | 1 (Inception) | S4-S5 | `definitions/signal_groups.json` | Enriched signals |
| `exclusion_check` | 1 (Inception) | S4-S5 (early) | `definitions/exclusion_criteria.json` | Exclusion status |
| `event_summary` | 1 (Inception) | S4-S5 | Enriched signals, timeline | Event narrative |
| `20_80_display_fields` | 1 (Inception) | S4-S5 | `definitions/field_registry.json` | 20/80 summary |
| `followup_questions` | 1 (Inception) | S4-S5 | Signals, gaps | Case-specific questions |
| `clinical_review_helper` | UI Runtime | Post-certification | All nodes, review_rules, patient payload | Interactive assistance |

### Definition Files → Phase Usage

| Definition File | Used In Phase | Purpose |
|-----------------|---------------|---------|
| `signal_groups.json` | 1, 3, 4 | What signals to extract; test case expectations |
| `field_registry.json` | 1 | Which fields matter for 20/80 summary |
| `exclusion_criteria.json` | 1, 4 | Denominator exclusions; test edge cases |
| `question_bank.json` | 1 | Seed questions for followup_questions task |
| `review_rules.json` | 1, UI | Rule-in/rule-out criteria; reviewer assistant |
| `metric_thresholds.json` | 1, 4, 5 | Pass/fail thresholds; SAFE scoring; certification |

### Certified Handoff Artifacts (Phase 5 → Schema Factory)

```
certified/{FRAMEWORK}/{SPECIALTY}/metrics/{METRIC}/
├── prompts/                      # Certified prompt templates
│   ├── signal_enrichment.md
│   ├── event_summary.md
│   ├── 20_80_display_fields.md
│   ├── followup_questions.md
│   ├── exclusion_check.md
│   └── clinical_review_helper.md
│
├── definitions/                  # Certified semantic definitions
│   ├── signal_groups.json
│   ├── field_registry.json
│   ├── exclusion_criteria.json
│   ├── question_bank.json
│   ├── review_rules.json
│   └── metric_thresholds.json
│
├── config/                       # Certified execution config
│   ├── tasks.json               # LLM settings per task
│   └── task_graph.json          # Execution order
│
├── schemas/                      # Output schemas (if metric-specific)
│   └── (overrides only)
│
└── certification.json            # Audit metadata
    {
      "metric_id": "I25",
      "framework": "USNWR",
      "specialty": "Orthopedics",
      "certified_at": "2024-12-22T10:30:00Z",
      "prompt_version": "v2.1",
      "eval_run_id": "2024-12-22/I25_batch_full",
      "scores": {
        "CR": 0.94,
        "AH": 1.0,
        "AC": 0.88
      },
      "test_case_count": 25,
      "certified_by": "quality-team"
    }
```

---

## 4. Semantic Hierarchy

### Layer Model

| Layer | Folder | What Belongs Here | Sharing Rule |
|-------|--------|-------------------|--------------|
| 0 | `shared/` | Cross-domain primitives (scoring, contracts, harness) | Used across multiple frameworks |
| 1 | `domains/<FRAMEWORK>/` | Top-level regulatory context (HAC, USNWR, SPS) | Framework is primary boundary |
| 2 | `domains/<FRAMEWORK>/<SPECIALTY>/` | Clinical specialty (Orthopedics, Cardiology) | Specialty groups related metrics |
| 2 | `domains/<FRAMEWORK>/<SPECIALTY>/_shared/` | Specialty-wide assets (shared prompts, archetypes) | Used by ≥2 metrics in specialty |
| 3 | `domains/.../<SPECIALTY>/metrics/<METRIC_ID>/` | Metric-specific assets | Metric owns overrides + tests |
| 3 | `.../metrics/<METRIC_ID>/prompts/` | Task prompt templates (.md) | Override `_shared` if needed |
| 3 | `.../metrics/<METRIC_ID>/signals/` | Metric-scoped signals + enrich rules | If shared, move to `_shared/signals/` |
| 3 | `.../metrics/<METRIC_ID>/tests/` | Testcases + semantic gates + golden | Tests are metric-owned (auditable) |
| 3 | `.../metrics/<METRIC_ID>/archetypes/<ARCHETYPE>/` | Archetype-specific overrides | Keep inside metric unless domain-shared |

---

## 4. Target Architecture

```
factory-cli/
│
├── domains/                                    # Semantic source of truth
│   │
│   ├── HAC/                                    # Framework: Hospital-Acquired Conditions (NHSN)
│   │   ├── _shared/                            # Shared across all HAC metrics
│   │   │   ├── prompts/
│   │   │   │   └── clinical_reviewer_base.md
│   │   │   ├── archetypes/
│   │   │   │   └── Preventability_Detective/
│   │   │   │       └── base.md
│   │   │   └── signals/
│   │   │       └── common_hac_signals.json
│   │   │
│   │   └── metrics/
│   │       ├── CLABSI/
│   │       │   ├── prompts/
│   │       │   │   └── clinical_review_plan.md   # Override or extend base
│   │       │   ├── signals/
│   │       │   │   └── pediatric_icu.json
│   │       │   ├── tests/
│   │       │   │   ├── testcases/
│   │       │   │   │   └── batch_1.json
│   │       │   │   └── golden/
│   │       │   │       └── certified_outputs.json
│   │       │   └── strategy/
│   │       │       └── generation_config.json
│   │       │
│   │       ├── CAUTI/
│   │       ├── VAP/
│   │       └── SSI/
│   │
│   ├── USNWR/                                  # Framework: US News & World Report
│   │   ├── Orthopedics/
│   │   │   ├── _shared/
│   │   │   │   ├── prompts/
│   │   │   │   │   └── ortho_reviewer_base.md
│   │   │   │   └── archetypes/
│   │   │   │       ├── Process_Auditor/
│   │   │   │       │   └── base.md
│   │   │   │       └── Preventability_Detective/
│   │   │   │           └── base.md
│   │   │   │
│   │   │   └── metrics/
│   │   │       ├── I25/                             # Complete metric structure
│   │   │       │   │
│   │   │       │   ├── prompts/                     # Task prompt templates (.md)
│   │   │       │   │   ├── signal_enrichment.md
│   │       │   │   ├── event_summary.md
│   │       │   │   ├── 20_80_display_fields.md
│   │       │   │   ├── followup_questions.md
│   │   │       │   │   ├── exclusion_check.md
│   │       │   │   └── clinical_review_helper.md
│   │   │       │   │
│   │   │       │   ├── definitions/                 # Metric-specific semantic definitions
│   │   │       │   │   ├── signal_groups.json       # What signals to look for
│   │   │       │   │   ├── field_registry.json      # 20/80 fields + order + weights
│   │   │       │   │   ├── exclusion_criteria.json  # Denominator exclusions
│   │   │       │   │   ├── question_bank.json       # Followup questions tied to signals
│   │   │       │   │   ├── review_rules.json        # Rule-in/rule-out criteria
│   │   │       │   │   └── metric_thresholds.json   # Pass/fail thresholds
│   │   │       │   │
│   │   │       │   ├── config/                      # Task execution configuration
│   │   │       │   │   ├── tasks.json               # LLM config per task
│   │   │       │   │   ├── task_graph.json          # Execution order (if non-default)
│   │   │       │   │   └── context_policies.json    # What context each task receives
│   │   │       │   │
│   │   │       │   ├── signals/                     # Signal extraction rules
│   │   │       │   │   └── enrich_rules.json
│   │   │       │   │
│   │   │       │   ├── archetypes/                  # Archetype-specific overrides
│   │   │       │   │   └── Process_Auditor/
│   │   │       │   │       └── prompts/
│   │   │       │   │
│   │   │       │   ├── tests/
│   │   │       │   │   ├── testcases/
│   │   │       │   │   │   ├── batch_1.json
│   │   │       │   │   │   └── batch_2.json
│   │   │       │   │   └── golden/
│   │   │       │   │
│   │   │       │   └── strategy/
│   │   │       │       └── generation.json
│   │   │       │
│   │   │       ├── I26/
│   │   │       ├── I27/
│   │   │       ├── I32a/
│   │   │       └── I32b/
│   │   │
│   │   ├── Cardiology/
│   │   │   └── metrics/
│   │   │       ├── E24/
│   │   │       └── C01/
│   │   │
│   │   ├── Endocrinology/
│   │   │   └── metrics/
│   │   │       ├── C35.1a1/
│   │   │       └── C41.1a/
│   │   │
│   │   ├── Nephrology/
│   │   ├── Neonatology/
│   │   ├── Neurology/
│   │   ├── Gastroenterology/
│   │   ├── Urology/
│   │   ├── Pulmonology/
│   │   ├── Behavioral_Health/
│   │   └── Cancer/
│   │
│   └── SPS/                                    # Framework: Solutions for Patient Safety
│       └── ...
│
├── shared/                                     # Cross-domain primitives (keep minimal)
│   │
│   ├── schemas/                                # Output schemas for all tasks
│   │   ├── signal_enrichment.schema.json
│   │   ├── event_summary.schema.json
│   │   ├── 20_80_display_fields.schema.json           # NEW
│   │   ├── followup_questions.schema.json
│   │   ├── exclusion_check.schema.json         # NEW
│   │   └── clinical_review_plan.schema.json
│   │
│   ├── archetypes/                             # Default archetype task graphs
│   │   ├── Process_Auditor.json
│   │   ├── Preventability_Detective.json
│   │   ├── Exclusion_Hunter.json
│   │   ├── Delay_Driver_Profiler.json
│   │   └── Outcome_Tracker.json
│   │
│   ├── contracts/                              # TypeScript types, interfaces
│   │   └── PlannerPlan.schema.json
│   │
│   ├── scoring/                                # SAFE scorer (used by all metrics)
│   │   ├── SafeScorer.ts
│   │   └── SafeReporter.ts
│   │
│   └── harness/                                # Generic test harness
│       └── TestRunner.ts
│
├── runs/                                       # Ephemeral outputs (.gitignore'd)
│   └── {YYYY-MM-DD}/{METRIC_ID}_{batch}/
│       ├── manifest.json                       # Run metadata (prompt version, config)
│       ├── raw_outputs/
│       ├── report.json
│       └── safe_scores.json
│
├── certified/                                  # Handoff zone → Schema Factory (mirrors domains)
│   ├── HAC/
│   │   └── metrics/
│   │       └── CLABSI/
│   │           ├── prompts.json
│   │           ├── tasks.json
│   │           ├── config.json
│   │           └── certification.json          # Audit trail
│   └── USNWR/
│       └── Orthopedics/
│           └── metrics/
│               └── I25/
│                   └── ...
│
├── orchestrator/                               # Planning Factory CODE (unchanged)
│   ├── stages/                                 # S0-S6 pipeline
│   ├── prompts/                                # PromptAssembler .ts files (load templates)
│   ├── validators/
│   └── config/
│
├── eval/                                       # Eval Factory CODE (consolidated)
│   ├── generation/                             # ← from flywheel/dataset
│   ├── graders/
│   ├── scoring/                                # ← from flywheel/validation
│   ├── optimization/                           # ← from flywheel/optimizer
│   ├── refinery/                               # ← from refinery/
│   └── runners/
│
├── utils/
│   ├── pathConfig.ts                           # Centralized path resolution
│   └── templateLoader.ts                       # Load .md templates from domains/
│
└── docs/
```

---

## 5. Definition File Examples

### 5.1 `definitions/field_registry.json` (for 20_80_display_fields)

```json
{
  "metric_id": "I25",
  "version": "1.0",
  "description": "20/80 field registry for I25 (Supracondylar fracture to OR <18 hours)",

  "critical_fields": [
    {
      "field_id": "arrival_timestamp",
      "display_name": "ED/Hospital Arrival Time",
      "source_path": "patient_payload.encounters[0].admission_datetime",
      "weight": 1.0,
      "display_order": 1,
      "required": true
    },
    {
      "field_id": "or_start_timestamp",
      "display_name": "OR Procedure Start Time",
      "source_path": "patient_payload.procedures[?type='surgical'].start_datetime",
      "weight": 1.0,
      "display_order": 2,
      "required": true
    },
    {
      "field_id": "time_to_or",
      "display_name": "Time to OR (calculated)",
      "derived_from": ["arrival_timestamp", "or_start_timestamp"],
      "formula": "or_start_timestamp - arrival_timestamp",
      "unit": "hours",
      "weight": 1.0,
      "display_order": 3,
      "threshold": { "pass": "<18", "fail": ">=18" }
    },
    {
      "field_id": "fracture_type",
      "display_name": "Fracture Classification",
      "source_path": "patient_payload.diagnoses[?category='fracture'].description",
      "weight": 0.8,
      "display_order": 4
    }
  ],

  "optional_highlights": {
    "llm_can_suggest": true,
    "max_suggestions": 3,
    "suggestion_prompt": "Identify up to 3 additional fields that may explain delays or complications"
  }
}
```

### 5.2 `definitions/exclusion_criteria.json`

```json
{
  "metric_id": "I25",
  "version": "1.0",
  "description": "Denominator exclusion criteria for I25",

  "exclusions": [
    {
      "exclusion_id": "polytrauma",
      "description": "Patient has polytrauma requiring multi-system management",
      "detection_rule": {
        "type": "diagnosis_present",
        "codes": ["S00-T88 with multiple body regions"],
        "context": "Any diagnosis indicating polytrauma"
      },
      "evidence_required": true
    },
    {
      "exclusion_id": "preexisting_hardware",
      "description": "Fracture site has pre-existing hardware requiring removal",
      "detection_rule": {
        "type": "procedure_present",
        "codes": ["CPT:20680", "CPT:20670"],
        "timing": "same_encounter"
      }
    },
    {
      "exclusion_id": "medical_instability",
      "description": "Patient medically unstable requiring stabilization before surgery",
      "detection_rule": {
        "type": "llm_assessment",
        "prompt_key": "medical_instability_check",
        "confidence_threshold": 0.85
      }
    }
  ],

  "exceptions": [
    {
      "exception_id": "weekend_or_holiday",
      "description": "Arrival during weekend or hospital-recognized holiday",
      "detection_rule": {
        "type": "temporal_check",
        "field": "arrival_timestamp",
        "condition": "is_weekend_or_holiday"
      },
      "adjustment": "extends_threshold_by_hours",
      "adjustment_value": 24
    }
  ]
}
```

### 5.3 `definitions/review_rules.json` (for clinical_review_helper)

```json
{
  "metric_id": "I25",
  "version": "1.0",
  "description": "Rule-in/rule-out decision criteria for clinical reviewer",

  "decision_framework": {
    "possible_outcomes": ["pass", "fail", "needs_review", "excluded"],
    "default_if_unclear": "needs_review"
  },

  "rule_in_criteria": [
    {
      "rule_id": "clear_pass",
      "description": "Time to OR documented and < 18 hours",
      "conditions": [
        { "field": "time_to_or", "operator": "<", "value": 18 },
        { "field": "arrival_timestamp", "operator": "is_not_null" },
        { "field": "or_start_timestamp", "operator": "is_not_null" }
      ],
      "outcome": "pass",
      "confidence": "high"
    }
  ],

  "rule_out_criteria": [
    {
      "rule_id": "clear_fail",
      "description": "Time to OR documented and >= 18 hours with no valid exception",
      "conditions": [
        { "field": "time_to_or", "operator": ">=", "value": 18 },
        { "field": "has_valid_exception", "operator": "==", "value": false }
      ],
      "outcome": "fail",
      "confidence": "high"
    }
  ],

  "ambiguity_triggers": [
    {
      "trigger_id": "missing_timestamp",
      "description": "Arrival or OR time not clearly documented",
      "detection": { "field": "arrival_timestamp OR or_start_timestamp", "operator": "is_null" },
      "reviewer_prompt": "Please locate documentation of {{missing_field}} in the chart"
    },
    {
      "trigger_id": "conflicting_times",
      "description": "Multiple timestamps documented with discrepancies",
      "detection": { "type": "llm_assessment", "prompt_key": "timestamp_conflict_check" },
      "reviewer_prompt": "Multiple timestamps found. Which should be used for metric calculation?"
    }
  ],

  "interactive_queries": [
    {
      "query_id": "find_arrival_time",
      "description": "Help reviewer locate arrival timestamp",
      "retrieval_strategy": "search_notes_for_keywords",
      "keywords": ["arrived", "presented", "admission", "ED arrival", "triage"]
    },
    {
      "query_id": "find_or_time",
      "description": "Help reviewer locate OR start time",
      "retrieval_strategy": "search_notes_for_keywords",
      "keywords": ["OR", "surgery", "procedure", "incision", "anesthesia start"]
    }
  ]
}
```

### 5.4 `definitions/metric_thresholds.json`

```json
{
  "metric_id": "I25",
  "version": "1.0",
  "description": "Pass/fail thresholds for metric determination",

  "primary_threshold": {
    "field": "time_to_or",
    "unit": "hours",
    "pass_condition": "< 18",
    "fail_condition": ">= 18"
  },

  "confidence_levels": {
    "high": { "min_score": 0.9, "action": "auto_determine" },
    "medium": { "min_score": 0.7, "max_score": 0.9, "action": "flag_for_review" },
    "low": { "max_score": 0.7, "action": "require_manual_review" }
  },

  "override_rules": [
    {
      "condition": "exclusion_applies",
      "outcome": "excluded",
      "bypass_threshold": true
    },
    {
      "condition": "exception_applies",
      "outcome": "recalculate_with_adjustment"
    }
  ]
}
```

### 5.5 Context Management for `clinical_review_helper`

The interactive assistant uses lightweight context management:

```typescript
interface ReviewSession {
  session_id: string;
  metric_id: string;
  patient_id: string;

  // Compressed context (always included)
  summary: {
    event_summary: string;          // From event_summary task
    key_signals: Signal[];          // Top 5 signals from enrichment
    current_determination: string;  // pass | fail | needs_review
    open_questions: string[];       // Unresolved ambiguities
  };

  // Conversation history (sliding window)
  turns: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    evidence_retrieved?: EvidenceChunk[];  // RAG results for this turn
  }[];
  max_turns_in_context: 10;  // Keep last N turns

  // On-demand retrieval
  retrieval_config: {
    strategy: 'semantic_search';
    index: 'patient_payload_chunks';
    top_k: 5;
  };
}
```

**Context Policy:**
- Always include: `summary` (compressed)
- Sliding window: Last 10 turns of conversation
- Per-turn retrieval: Query patient payload based on user question
- Evidence linking: Each retrieved chunk includes source location for verification

---

## 6. Migration Mapping

### Current → New Location Reference

| Current Location | New Location | Notes |
|-----------------|--------------|-------|
| **Testcases** | | |
| `data/flywheel/testcases/I25_batch_1.json` | `domains/USNWR/Orthopedics/metrics/I25/tests/testcases/batch_1.json` | |
| `data/flywheel/testcases/batch1_full/I25_batch_*.json` | `domains/USNWR/Orthopedics/metrics/I25/tests/testcases/batch_*.json` | Flatten |
| `data/flywheel/testcases/samples/` | DELETE or `domains/.../tests/golden/` | If curated |
| `data/flywheel/testcases/golden_set.json` | `domains/USNWR/Orthopedics/metrics/I25/tests/golden/` | |
| `data/flywheel/I32b_tests.json` | `domains/USNWR/Orthopedics/metrics/I32b/tests/testcases/batch_1.json` | |
| **Signals** | | |
| `signal_library/HAC_CLABSI__pediatric_icu.json` | `domains/HAC/metrics/CLABSI/signals/pediatric_icu.json` | |
| **Strategies** | | |
| `flywheel/dataset/batch_strategies.metadata.json` | `shared/harness/strategy_registry.json` | Cross-domain |
| `data/flywheel/testcases/generation_strategy.json` | `domains/USNWR/Orthopedics/metrics/I25/strategy/generation.json` | |
| **Reports (ephemeral)** | | |
| `data/flywheel/reports/I25_report.json` | `runs/YYYY-MM-DD/I25_batch1/report.json` | Git-ignored |
| `safe_I25_batch1.json` (root) | `runs/YYYY-MM-DD/I25_batch1/safe_scores.json` | Git-ignored |
| **Prompts** | | |
| `orchestrator/prompts/clinicalReviewPlan.ts` | Keep as code; loads template from `domains/.../prompts/clinical_review_plan.md` | |
| `orchestrator/config/prompts.json` | `domains/<FRAMEWORK>/_shared/prompts/registry.json` | Per-framework |
| **Stray files (DELETE)** | | |
| `cli/safe_I25_batch1.md` | DELETE | |
| `cli/planner_plan.json` | DELETE | |
| `cli/temp_snippet.txt` | DELETE | |
| `output/*.json` | DELETE (regenerate) | |

---

## 6. Implementation Stories

### Epic 1: Foundation - Path Configuration & Folder Structure

#### Story 1.1: Create pathConfig.ts with Semantic Paths
**Priority**: P0 (Blocker)

**Description**:
Create centralized path resolution that understands the `domains/<FRAMEWORK>/<SPECIALTY>/metrics/<METRIC>/` hierarchy.

**Implementation**:
```typescript
// utils/pathConfig.ts
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CLI_ROOT = path.resolve(__dirname, '..');

export interface MetricPath {
  framework: string;   // HAC, USNWR, SPS
  specialty?: string;  // Orthopedics, Cardiology (null for HAC)
  metric: string;      // I25, CLABSI
}

export const Paths = {
  // Semantic domain paths
  domains: () => path.join(CLI_ROOT, 'domains'),

  framework: (framework: string) =>
    path.join(Paths.domains(), framework),

  specialty: (framework: string, specialty: string) =>
    path.join(Paths.framework(framework), specialty),

  metric: (p: MetricPath) => p.specialty
    ? path.join(Paths.specialty(p.framework, p.specialty), 'metrics', p.metric)
    : path.join(Paths.framework(p.framework), 'metrics', p.metric),

  // Metric sub-paths
  metricPrompts: (p: MetricPath) => path.join(Paths.metric(p), 'prompts'),
  metricSignals: (p: MetricPath) => path.join(Paths.metric(p), 'signals'),
  metricTests: (p: MetricPath) => path.join(Paths.metric(p), 'tests'),
  metricTestcases: (p: MetricPath) => path.join(Paths.metricTests(p), 'testcases'),
  metricGolden: (p: MetricPath) => path.join(Paths.metricTests(p), 'golden'),
  metricStrategy: (p: MetricPath) => path.join(Paths.metric(p), 'strategy'),

  // Shared paths (within specialty or framework)
  shared: (framework: string, specialty?: string) => specialty
    ? path.join(Paths.specialty(framework, specialty), '_shared')
    : path.join(Paths.framework(framework), '_shared'),

  sharedPrompts: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'prompts'),

  sharedArchetypes: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'archetypes'),

  // Cross-domain shared
  crossDomain: () => path.join(CLI_ROOT, 'shared'),
  contracts: () => path.join(Paths.crossDomain(), 'contracts'),
  scoring: () => path.join(Paths.crossDomain(), 'scoring'),
  harness: () => path.join(Paths.crossDomain(), 'harness'),

  // Runs (ephemeral)
  runs: () => path.join(CLI_ROOT, process.env.RUNS_DIR || 'runs'),
  run: (date: string, metricBatch: string) =>
    path.join(Paths.runs(), date, metricBatch),

  // Certified (handoff zone, mirrors domains)
  certified: () => path.join(CLI_ROOT, process.env.CERTIFIED_DIR || 'certified'),
  certifiedMetric: (p: MetricPath) => p.specialty
    ? path.join(Paths.certified(), p.framework, p.specialty, 'metrics', p.metric)
    : path.join(Paths.certified(), p.framework, 'metrics', p.metric),
};

// Helper to resolve metric path from concern_id using concern-registry
export function resolveMetricPath(concernId: string): MetricPath {
  // Load from concern-registry.json
  const registry = require('../config/concern-registry.json');
  const concern = registry.concerns[concernId];

  if (!concern) {
    throw new Error(`Unknown concern_id: ${concernId}`);
  }

  // Map domain to framework/specialty
  const frameworkMap: Record<string, { framework: string; specialty?: string }> = {
    'HAC': { framework: 'HAC' },
    'Orthopedics': { framework: 'USNWR', specialty: 'Orthopedics' },
    'Cardiology': { framework: 'USNWR', specialty: 'Cardiology' },
    'Endocrinology': { framework: 'USNWR', specialty: 'Endocrinology' },
    'Nephrology': { framework: 'USNWR', specialty: 'Nephrology' },
    'Neonatology': { framework: 'USNWR', specialty: 'Neonatology' },
    'Neurology': { framework: 'USNWR', specialty: 'Neurology' },
    'Gastroenterology': { framework: 'USNWR', specialty: 'Gastroenterology' },
    'Urology': { framework: 'USNWR', specialty: 'Urology' },
    'Pulmonology': { framework: 'USNWR', specialty: 'Pulmonology' },
    'Behavioral Health': { framework: 'USNWR', specialty: 'Behavioral_Health' },
    'Cancer': { framework: 'USNWR', specialty: 'Cancer' },
  };

  const mapping = frameworkMap[concern.domain] || { framework: 'USNWR', specialty: concern.domain };

  return {
    framework: mapping.framework,
    specialty: mapping.specialty,
    metric: concernId,
  };
}

export function createRunId(metric: string, batch?: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const suffix = batch ? `${metric}_${batch}` : metric;
  return { date, suffix };
}
```

**Acceptance Criteria**:
- [ ] `Paths.metric({ framework: 'USNWR', specialty: 'Orthopedics', metric: 'I25' })` returns correct path
- [ ] `resolveMetricPath('I25')` returns `{ framework: 'USNWR', specialty: 'Orthopedics', metric: 'I25' }`
- [ ] `resolveMetricPath('CLABSI')` returns `{ framework: 'HAC', metric: 'CLABSI' }`

---

#### Story 1.2: Create templateLoader.ts
**Priority**: P0

**Description**:
Utility to load `.md` prompt templates from domain folders with fallback to `_shared`.

**Implementation**:
```typescript
// utils/templateLoader.ts
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { Paths, MetricPath } from './pathConfig';

export interface TemplateContext {
  metric: string;
  archetype?: string;
  [key: string]: unknown;
}

/**
 * Load prompt template with fallback chain:
 * 1. Metric-specific: domains/.../metrics/I25/prompts/{templateName}.md
 * 2. Specialty shared: domains/.../Orthopedics/_shared/prompts/{templateName}.md
 * 3. Framework shared: domains/USNWR/_shared/prompts/{templateName}.md
 */
export function loadTemplate(
  metricPath: MetricPath,
  templateName: string,
  context: TemplateContext
): string {
  const searchPaths = [
    // 1. Metric-specific
    path.join(Paths.metricPrompts(metricPath), `${templateName}.md`),

    // 2. Specialty shared (if applicable)
    ...(metricPath.specialty
      ? [path.join(Paths.sharedPrompts(metricPath.framework, metricPath.specialty), `${templateName}.md`)]
      : []),

    // 3. Framework shared
    path.join(Paths.sharedPrompts(metricPath.framework), `${templateName}.md`),
  ];

  for (const templatePath of searchPaths) {
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf-8');
      const compiled = Handlebars.compile(raw);
      return compiled(context);
    }
  }

  throw new Error(
    `Template '${templateName}' not found for ${metricPath.metric}. ` +
    `Searched: ${searchPaths.join(', ')}`
  );
}

/**
 * Load archetype-specific template with fallback
 */
export function loadArchetypeTemplate(
  metricPath: MetricPath,
  archetype: string,
  templateName: string,
  context: TemplateContext
): string {
  const searchPaths = [
    // 1. Metric + archetype specific
    path.join(Paths.metric(metricPath), 'archetypes', archetype, 'prompts', `${templateName}.md`),

    // 2. Specialty shared archetype
    ...(metricPath.specialty
      ? [path.join(Paths.sharedArchetypes(metricPath.framework, metricPath.specialty), archetype, `${templateName}.md`)]
      : []),

    // 3. Framework shared archetype
    path.join(Paths.sharedArchetypes(metricPath.framework), archetype, `${templateName}.md`),

    // 4. Fall back to non-archetype template
  ];

  for (const templatePath of searchPaths) {
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf-8');
      const compiled = Handlebars.compile(raw);
      return compiled({ ...context, archetype });
    }
  }

  // Fallback to base template
  return loadTemplate(metricPath, templateName, context);
}
```

**Acceptance Criteria**:
- [ ] Templates loaded with `{{variable}}` interpolation
- [ ] Fallback chain works: metric → specialty._shared → framework._shared
- [ ] Clear error message when template not found

---

#### Story 1.3: Create folder scaffolding
**Priority**: P0

**Description**:
Create the initial folder structure for domains, shared, runs, certified.

**Script** (`scripts/scaffold-domains.ts`):
```typescript
import * as fs from 'fs';
import * as path from 'path';

const CLI_ROOT = path.resolve(__dirname, '..');

const structure = {
  'domains/HAC/_shared/prompts': '.gitkeep',
  'domains/HAC/_shared/archetypes/Preventability_Detective': '.gitkeep',
  'domains/HAC/metrics/CLABSI/prompts': '.gitkeep',
  'domains/HAC/metrics/CLABSI/signals': '.gitkeep',
  'domains/HAC/metrics/CLABSI/tests/testcases': '.gitkeep',
  'domains/HAC/metrics/CLABSI/tests/golden': '.gitkeep',
  'domains/HAC/metrics/CLABSI/strategy': '.gitkeep',

  'domains/USNWR/Orthopedics/_shared/prompts': '.gitkeep',
  'domains/USNWR/Orthopedics/_shared/archetypes/Process_Auditor': '.gitkeep',
  'domains/USNWR/Orthopedics/metrics/I25/prompts': '.gitkeep',
  'domains/USNWR/Orthopedics/metrics/I25/signals': '.gitkeep',
  'domains/USNWR/Orthopedics/metrics/I25/tests/testcases': '.gitkeep',
  'domains/USNWR/Orthopedics/metrics/I25/tests/golden': '.gitkeep',
  'domains/USNWR/Orthopedics/metrics/I25/strategy': '.gitkeep',

  'shared/contracts': '.gitkeep',
  'shared/scoring': '.gitkeep',
  'shared/harness': '.gitkeep',

  'runs': '.gitkeep',

  'certified/HAC/metrics': '.gitkeep',
  'certified/USNWR/Orthopedics/metrics': '.gitkeep',
};

for (const [dir, file] of Object.entries(structure)) {
  const fullPath = path.join(CLI_ROOT, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  fs.writeFileSync(path.join(fullPath, file), '');
  console.log(`Created: ${dir}/`);
}
```

---

### Epic 2: Data Migration

#### Story 2.1: Migrate I25 testcases
**Priority**: P1

**Source → Destination**:
```
data/flywheel/testcases/I25_batch_1.json
  → domains/USNWR/Orthopedics/metrics/I25/tests/testcases/batch_1.json

data/flywheel/testcases/batch1_full/I25_batch_*.json
  → domains/USNWR/Orthopedics/metrics/I25/tests/testcases/batch_*.json (flatten)
```

---

#### Story 2.2: Migrate HAC signals
**Priority**: P1

**Source → Destination**:
```
signal_library/HAC_CLABSI__pediatric_icu.json
  → domains/HAC/metrics/CLABSI/signals/pediatric_icu.json
```

---

#### Story 2.3: Extract prompt templates from code
**Priority**: P1

**Description**:
Extract prose sections from `orchestrator/prompts/*.ts` into `.md` files.

**Example** - `clinicalReviewPlan.ts`:
```typescript
// BEFORE (in .ts file)
const SYSTEM_PROMPT = `You are a clinical abstractor reviewing...`;

// AFTER (load from .md)
import { loadTemplate, resolveMetricPath } from '../utils/templateLoader';

export function buildClinicalReviewPlanPrompt(context: TaskContext): string {
  const metricPath = resolveMetricPath(context.concernId);
  return loadTemplate(metricPath, 'clinical_review_plan', {
    metric: context.concernId,
    archetype: context.archetype,
    ...context.variables,
  });
}
```

**Template file** (`domains/HAC/_shared/prompts/clinical_review_plan.md`):
```markdown
You are a clinical abstractor reviewing patient records for {{metric}}.

## Your Task
Review the clinical narrative and identify...

{{#if archetype}}
### Mode: {{archetype}}
{{/if}}
```

---

#### Story 2.4: Clean up stray files
**Priority**: P2

**DELETE**:
- `cli/safe_I25_batch1.json`
- `cli/safe_I25_batch1.md`
- `cli/planner_plan.json`
- `cli/temp_snippet.txt`
- `output/*.json` (regenerate via pipeline)

---

### Epic 3: Code Consolidation (unchanged from original plan)

Move `flywheel/` → `eval/` as previously specified.

---

### Epic 4: Update Code to Use New Paths

#### Story 4.1: Update generate.ts
```typescript
// BEFORE
const OUTPUT_DIR = path.join(__dirname, '../../data/flywheel/testcases');

// AFTER
import { Paths, resolveMetricPath } from '../../utils/pathConfig';
const metricPath = resolveMetricPath(metric);
const OUTPUT_DIR = Paths.metricTestcases(metricPath);
```

#### Story 4.2: Update eval.ts
```typescript
// BEFORE
.option('--test-dir <path>', 'Test data directory', './data/flywheel/testcases')

// AFTER
import { Paths, resolveMetricPath } from '../utils/pathConfig';
const metricPath = resolveMetricPath(options.metric);
const testDir = options.testDir || Paths.metricTestcases(metricPath);
```

---

## 7. Implementation Order

```
Phase 1: Foundation
├── 1.1 pathConfig.ts with semantic paths
├── 1.2 templateLoader.ts
└── 1.3 Scaffold folder structure

Phase 2: Data Migration
├── 2.1 Migrate I25 testcases
├── 2.2 Migrate HAC signals
├── 2.3 Extract prompt templates
└── 2.4 Clean up stray files

Phase 3: Code Consolidation
├── flywheel/ → eval/
└── refinery/ → eval/refinery/

Phase 4: Code Updates
├── Update imports to use Paths.*
└── Update prompt builders to use templateLoader

Phase 5: Documentation
└── Update READMEs
```

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | Keep legacy paths as aliases during migration |
| Template escaping issues | Document Handlebars escaping; use `{{{raw}}}` for code blocks |
| Deep nesting complexity | `resolveMetricPath()` abstracts path construction |
| Missing templates at runtime | Clear error messages with search path list |

---

## 9. Success Criteria

- [ ] All paths resolved via `Paths.*` or `resolveMetricPath()`
- [ ] Prompt prose lives in `.md` files under `domains/`
- [ ] `domains/<FRAMEWORK>/<SPECIALTY>/metrics/<METRIC>/` hierarchy established
- [ ] `runs/` is git-ignored, `certified/` mirrors domain structure
- [ ] Template fallback chain works: metric → specialty._shared → framework._shared
- [ ] All existing missions (`flywheel:prep`, `safe:score`) still work
- [ ] TypeScript compiles with no errors after migration
