# End-to-End Workflow: The Model-Forward Lifecycle

> **Last Updated**: 2025-12-27
> **Scope**: Planning Factory (Inception) + Eval Factory (Refinement) + Schema Factory (Materialization)
> **Downstream**: UI Factory (Deployment)

This document describes the operational flow for developing, testing, certifying, and executing clinical abstraction logic using the **Registry-as-Workspace** architecture.

---

## 1. Factory Overview

The system is organized into specialized factories connected by a **Linked Manifest** (`plan.json`) and **Shared Context** (`shared/`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THIS REPOSITORY                                     │
│                                                                             │
│  ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐ │
│  │ Planning Factory│  ────▶  │  Eval Factory   │  ────▶  │ Schema Factory│ │
│  │                 │         │                 │         │               │ │
│  │ • Scaffold      │         │ • Battle Test   │         │ • Synthesize  │ │
│  │ • Generate      │         │ • Refine (.md)  │         │ • Materialize │ │
│  │   (Manifest)    │         │ • Validate      │         │ • Certify     │ │
│  └─────────────────┘         └─────────────────┘         └───────┬───────┘ │
│           │                           │                          │         │
└───────────┼───────────────────────────┼──────────────────────────┼─────────┘
            │                           │                          │
      HUMAN-IN-THE-LOOP           HUMAN-IN-THE-LOOP          GOVERNANCE
     (Strategy Review)           (Edit Registry .md)        (Release v1.0)
                                                                   │
                                                                   ▼
                                                     ┌─────────────────────────┐
                                                     │      UI Factory         │
                                                     │    (Display/Review)     │
                                                     └─────────────────────────┘
```

---

## 2. The Model-Forward Factory Matrix

| Seq | Factory | Goal | Inputs | Outputs (Canonical) | HITL Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Planning Factory** | Seed config for a metric | Metric intent | Metric seed: archetypes, signal groups, signals, v0 task prompts | **Architect / Planner**<br>Reviews strategy & domain mapping. |
| **2** | **Eval Factory** | Battle-test & harden prompts | Seed configs; v0 prompts | Production-ready task prompts; eval strategy & reports | **Clinical Expert**<br>Directly edits Markdown files to fix logic. |
| **3** | **Schema Factory** | Execute & materialize case elements | Hardened prompts; metric configs | Case elements (signals, events, summaries) for UI; ConfigDB seeds | **Governance / Engineer**<br>Validates contracts & freezes logic. |
| **4** | **UI Factory** | Display & review | Case elements | Review screens; timelines; consoles | **Clinician (UAT)**<br>Verifies tool matches workflow. |

---

## 3. Read / Write Authority Matrix

| Factory | Config Seeds | Task Prompts | Raw Patient Data | Case Elements |
| :--- | :--- | :--- | :--- | :--- |
| **Planning** | Write (v0) | Write (v0) | No | No |
| **Eval** | No | Edit (authoritative) | Read (golden) | No |
| **Schema** | Write (final) | Consume | Read | Write |
| **UI** | Read | Read | No | Read |

---

## 4. Phase Details

### Phase 1: Inception (Workspace Initialization)
**Owner**: Planning Team
**Action**: Setup the `domains_registry` and generate the manifest.
**Deliverables**:
- **Source Logic**: Markdown files in `domains_registry/USNWR/{Domain}/_shared/prompts/`
- **Manifest**: `plan.json` containing `template_ref` pointers.

### Phase 2: Quality Strategy & Test Generation (Eval Factory)
**Owner**: Quality Team
**Action**: Define test coverage and generate synthetic/golden narratives.
**Artifact**: `batch_strategies.metadata.json` & `testcases/`.

### Phase 3: Battle Test (The Flywheel)
**Owner**: Quality Team
**Command**: `npx ts-node EvalsFactory/refinery/cli.ts run`
**Action**: The Refinery loop runs the **Registry Source** against **Test Cases**.
**Refinement**: If prompts fail, the human operator **directly edits the .md files** in `domains_registry`.

### Phase 4: Certification & Materialization (Schema Factory)
**Owner**: Governance / Engineering
**Action**: 
1. **Contract Synthesis**: Compiles hydrated prompts + JSON schemas into rigorous validators.
2. **Materialization**: Runs the "Gold Logic" against raw patient payloads to produce stored artifacts (Signals, Events).
3. **Certification**: Freezes the logic into a versioned release (v1).

---

## 5. Technical Mapping (Architecture)

| Component | Storage | Format | Ownership |
|:---|:---|:---|:---|
| **Clinical Logic** | `domains_registry/` | Markdown (.md) | HITL / Evals |
| **Context Logic** | `shared/context_builders/` | TypeScript (.ts) | Engineering |
| **Orchestration** | `plan.json` | Manifest (JSON) | Planner |
| **Validation Data** | `testcases/` | JSON | Evals |
| **Certified Artifacts** | `certified/` | Hybrid | Governance |

---

## 6. Quick Start

```bash
# 1. Initialize workspace for new domain
npx ts-node tools/scaffold-domain.ts --domain Cardiology

# 2. Generate manifest
npx ts-node bin/planner.ts generate --concern C35 --domain Cardiology

# 3. Test and Refine (HITL Loop)
npx ts-node EvalsFactory/refinery/cli.ts run signal_enrichment golden_set --plan output/plan_c35.json

# 4. Edit logic at:
# domains_registry/USNWR/Cardiology/_shared/prompts/signal_enrichment.md

# 5. Synthesize Contracts (Schema Factory)
# (Command TBD)
```
