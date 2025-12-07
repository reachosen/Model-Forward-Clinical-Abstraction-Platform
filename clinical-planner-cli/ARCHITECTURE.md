# Clinical Progressive Plan Orchestrator (CPPO) - Architecture

**Date**: 2025-12-06
**Version**: 2.0.0 (Unified V10 Semantic Architecture)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Philosophy](#core-philosophy)
3. [Semantic Context Model](#semantic-context-model)
4. [Multi-Archetype Model](#multi-archetype-model)
5. [Stage Definitions (S0-S6)](#stage-definitions-s0-s6)
6. [Quality-First Validation](#quality-first-validation)
7. [Data Flow & Integration](#data-flow--integration)
8. [Folder Structure](#folder-structure)

---

## Architecture Overview

CPPO is the **Planning Factory** for the Model-Forward Clinical Abstraction Platform. It orchestrates the generation of clinical review plans by transforming a high-level intent (e.g., "Review I25 cases") into a structured, legally and clinically compliant execution plan.

It integrates **HAC** (Patient Safety) and **USNWR** (Rankings/Quality) domains into a single, quality-driven pipeline that supports **multi-archetype reasoning**.

---

## Core Philosophy

### 1. A Metric is Not Solved by One Archetype
Complex metrics require multiple reasoning strategies. A single plan often involves:
- **Exclusion_Hunter**: Validating denominator exclusions.
- **Preventability_Detective**: Analyzing root cause and bundles.
- **Process_Auditor**: Checking timestamps and protocol adherence.

**Principle**: A metric may have many archetypes, but each **task** belongs to exactly one archetype.

### 2. Quality Drives the Pipeline
The pipeline is **quality-first**, not just structure-first.
- **Tier 1 (Structural)**: Valid JSON, required fields.
- **Tier 2 (Semantic)**: Grounded in differentiators, benchmarks, and domain specifics.
- **Tier 3 (Clinical)**: Accurate evidence attribution and clinical reasoning (executed by LLMs).

### 3. Quality-Guided Generation
We prevent errors rather than just detecting them:
- **Pre-population**: Use templates for deterministic parts (S2 signal groups).
- **Schema Enforcement**: Use strictly typed JSON schemas for LLM outputs.
- **Prompt Injection**: Inject context (rankings, rules) directly into prompts.

---

## Semantic Context Model

The **Semantic Context** persists through every stage (S0–S6), acting as the "brain" of the plan.

```json
{
  "concern": "I32b",
  "domain": "Orthopedics",
  "metric_type": "USNWR",
  "ranking_context": {
    "rank": 20,
    "summary": "Lurie is ranked #20...",
    "top_performer_benchmarks": "Boston Children's..."
  },
  "hac_context": {
    "exclusions": ["...", "..."],
    "preventability_criteria": ["..."]
  },
  "differentiators": [
    "Time to OR",
    "Readmission vs staged",
    "Documentation gaps"
  ],
  "archetypes": ["Exclusion_Hunter", "Process_Auditor"],
  "signal_groups": [...],
  "questions": [...]
}
```

---

## Multi-Archetype Model

### Archetype Definitions

| Archetype | Purpose | Used For |
| :--- | :--- | :--- |
| **Exclusion_Hunter** | Validate numerator/denominator, find exclusions. | Readmissions, staged procedures, HAC exclusions. |
| **Preventability_Detective** | Bundle analysis, cause-and-effect reasoning. | SSI, readmits, CF care, HAC preventability. |
| **Process_Auditor** | Time, delays, protocol adherence. | I25/I26, device-days, UE risk, VAE. |
| **Documentation_Inspector** | Find missing or conflicting documentation. | UE, bundles, SIRS criteria. |
| **Delay_Driver_Profiler** | Identify bottlenecks in care delivery. | Time-to-intervention metrics. |

### Differentiator Mapping
A global mapping determines which archetype handles which aspect of the metric:

*   **Time to OR** → `Process_Auditor`
*   **Readmission** → `Exclusion_Hunter`
*   **Preventability** → `Preventability_Detective`
*   **Documentation Gaps** → `Documentation_Inspector`

---

## Stage Definitions (S0-S6)

### S0: Input Normalization & Routing
**Goal**: Normalize input, extract concern_id, load initial context.
*   **Inputs**: Concern ID, Domain.
*   **Outputs**: `RoutedInput` with inferred metadata.
*   **Fail Smell**: Domain not mapped; no ranking or HAC context found.

### S1: Domain & Archetype Resolution
**Goal**: Identify **all** archetypes needed for the metric.
*   **Logic**: Maps concern -> [Archetype1, Archetype2]. Loads `ranking_context` for USNWR or `hac_context` for HAC.
*   **Fail Smell**: Only one archetype selected when metric requires several (e.g., I32b needs Exclusion + Preventability).

### S2: Structural Skeleton
**Goal**: Build a tagged signal group skeleton with exactly 5 groups.
*   **Logic**: Uses `domainRouter` and `rankingsLoader`.
    *   **HAC**: `[rule_in, rule_out, delay_drivers, doc_gaps, bundle_gaps]`
    *   **USNWR (Ranked)**: Groups from `signal_emphasis` (aligned with quality differentiators).
*   **Fail Smell**: No signal groups linked to differentiators; < 5 groups.

### S3: Task Graph Identification
**Goal**: Build the execution graph with one lane per archetype.
*   **Structure**:
    *   **Lane 1 (Exclusion_Hunter)**: `exclusion_enrichment` → `exclusion_summary`
    *   **Lane 2 (Preventability_Detective)**: `bundle_enrichment` → `gap_analysis`
    *   **Synthesis**: `multi_archetype_synthesis` (merges lanes)
*   **Fail Smell**: Mixed-archetype tasks; archetype without tasks.

### S4: Prompt Plan Generation
**Goal**: Configure prompts for each task with context injection.
*   **Logic**: Attaches `PromptConfig` (template_id, model, json_schema) to each node.
*   **Fail Smell**: Missing differentiator references; prompt not grounded in signal groups.

### S5: Task Execution & Local Validation
**Goal**: Execute tasks using LLM with strict schemas and CoVE.
*   **Execution**:
    *   **Standard Tasks**: `signal_enrichment`, `event_summary` (Schema-driven).
    *   **CoVE Tasks**: `multi_archetype_synthesis` (Draft → Verify pattern).
*   **Prompting**: Uses `buildMetricFramedPrompt` to sandwich context.
*   **Fail Smell**: Missing references to benchmarks or HAC rules in output.

### S6: Plan Assembly & Global Validation
**Goal**: Assemble final `PlannerPlanV2` and validate against all tiers.
*   **Output**: Complete plan ready for the Schema Factory.
*   **Fail Smell**: Unassigned differentiators; missing signal groups.

---

## Quality-First Validation

The system enforces a 3-Tier Validation Model:

| Tier | Focus | Enforcement |
| :--- | :--- | :--- |
| **Tier 1 (Structural)** | Valid JSON, schema completeness, 5 signal groups. | **HALT**. Pipeline fails immediately. |
| **Tier 2 (Semantic)** | Alignment with differentiators, archetypes, and rankings. | **WARN**. Logged for review. |
| **Tier 3 (Clinical)** | Evidence accuracy, correct attribution. | **SCORE**. Assessed post-hoc or by humans. |

---

## Data Flow & Integration

### Output Path (Canonical)
The S5 outputs are transformed into a queryable SQL layer via `S5OutputLoader` and `SnowflakeLoader`:

1.  **`signal_enrichment`** → `LEDGER.SIGNAL_LEDGER` (Granular signals)
2.  **`event_summary`** → `LEDGER.EVENT_SUMMARIES` (Narratives)
3.  **`multi_archetype_synthesis`** → `LEDGER.CASE_DECISIONS` (Final calls)
4.  **Plan Blob** → `LEDGER.ABSTRACTION_LEDGER` (Full JSON archive)

### Rankings Integration (USNWR)
*   `lurie_usnwr_rankings.json` → `rankingsLoader.ts`
*   S1 loads `ranking_context`.
*   S2 uses `signal_emphasis` for groups.
*   S5 injects `top_performer_benchmarks` into prompts.

---

## Folder Structure

```
clinical-planner-cli/
├── orchestrator/                    # Core Pipeline
│   ├── MetaOrchestrator.ts
│   ├── stages/                     # S0-S6 Implementations
│   ├── tasks/                      # Task Runners
│   ├── validators/                 # Context-Aware Validators
│   ├── prompts/                    # Task Core Bodies (TS modules)
│   │   ├── eventSummary.ts
│   │   ├── signalEnrichment.ts
│   │   └── ...
│   └── schemas/                    # JSON Schemas & Interfaces
│       ├── signalEnrichmentSchema.ts
│       └── ...
│
├── loaders/                        # SQL Generation
│   ├── SnowflakeLoader.ts          # Plan Blob Loader
│   └── S5OutputLoader.ts           # Canonical Table Loader
│
├── prompts/                        # (Legacy/Reference prompts)
│
├── eval/                           # Prompt Refinery (Eval Mode)
│
├── cli/                            # Entry Points
│   ├── bin/planner.ts              # Main CLI
│   ├── learn.ts                    # Learning Loop
│   └── revise.ts                   # Revision Tool
│
├── models/                         # Shared Data Models
│   ├── PlannerPlan.ts
│   ├── Provenance.ts
│   └── ...
│
├── utils/                          # Utilities
│   ├── rankingsLoader.ts
│   └── ...
│
├── ARCHITECTURE.md                 # This file
└── package.json
```