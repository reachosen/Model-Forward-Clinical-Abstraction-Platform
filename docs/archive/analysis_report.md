# System Analysis: The Registry-Linked Planner Architecture

> **Status**: Current (Post-Refactor)
> **Architecture**: Model-Forward Registry-Linked
> **Key Pattern**: Registry-as-Workspace + Plan-as-Manifest

This document analyzes the current state of the `factory-cli` codebase following the migration to the Unified Control Plane and Registry-Linked architecture.

---

### 1) Task & Prompt Inventory (Unified Control Plane)

**Architecture Change**: The legacy parallel task graph has been replaced by a **Single-Pass Unified Graph**. Logic is no longer embedded in TypeScript strings but loaded from external Markdown files.

| Task Name | Code Logic | Template Source (Registry) | Input Context | Output Schema |
| :--- | :--- | :--- | :--- | :--- |
| **signal_enrichment** | `S5_TaskExecution` | `domains_registry/.../signal_enrichment.md` | Unified Context (All Archetypes) | `schemas/signalEnrichmentSchema.ts` |
| **event_summary** | `S5_TaskExecution` | `domains_registry/.../event_summary.md` | Unified Context | `schemas/eventSummarySchema.ts` |
| **20_80_display_fields** | `S5_TaskExecution` | `domains_registry/.../20_80_display_fields.md` | Unified Context | `schemas/summary2080Schema.ts` |
| **followup_questions** | `S5_TaskExecution` | `domains_registry/.../followup_questions.md` | Unified Context | `schemas/followupQuestionsSchema.ts` |
| **clinical_review_plan** | `S5_TaskExecution` | `domains_registry/.../clinical_review_plan.md` | Unified Context | `schemas/clinicalReviewPlanSchema.ts` |

**Deprecated**: `multi_archetype_synthesis` (Obsolete due to unified single-pass execution).

---

### 2) The "Linker" Pattern (Code vs Config)

The system enforces strict separation between the **Orchestrator (Code)** and the **Clinical Logic (Registry)**.

| Component | Role | Location | Format |
| :--- | :--- | :--- | :--- |
| **Planner Engine** | Orchestration & variable hydration | `PlanningFactory/` | TypeScript |
| **Clinical Logic** | Source of Truth for Prompt Engineering | `domains_registry/` | Markdown (`.md`) |
| **Manifest** | Linker file connecting Logic to Execution | `output/plan_i25.json` | JSON (References) |

**The `template_ref` Contract**:
Instead of embedding prompt text, the `plan.json` contains pointers:
```json
"template_ref": {
  "path": "domains_registry/USNWR/Orthopedics/_shared/prompts/signal_enrichment.md",
  "context_keys": ["metric_context", "patient_payload"]
}
```

---

### 3) Quality Gates & Validation

Validation is now distributed across the lifecycle stages.

| Gate Name | Location | Type | Checks |
| :--- | :--- | :--- | :--- |
| **Integrity Gate** | `S6_PlanAssembly.validate()` | **Structural** | Verifies that every `template_ref` path exists on disk. Halts on broken links. |
| **Tagging Rule** | `prompts/signalEnrichment.ts` | **Semantic** | Enforces LLM to tag signals with Archetypes (e.g., `["Process_Auditor"]`) for UI filtering. |
| **Strict Provenance** | `prompts/signalEnrichment.ts` | **Clinical** | "NO INVENTED PROVENANCE". Signals must have verbatim evidence. |
| **Timing Gap Logic** | `prompts/signalEnrichment.ts` | **Logic** | If timestamps missing -> emit `documentation_gaps`, NOT `delay_drivers`. |

---

### 4) The Flywheel (EvalsFactory)

The Refinery has been generalized to support the Registry-Linked workflow.

| Feature | Implementation | Status |
| :--- | :--- | :--- |
| **Plan-Driven Run** | `EvalsFactory/refinery/cli.ts` accepts `--plan <path>`. | ✅ Active |
| **Dynamic Loading** | Loads logic directly from `domains_registry` via `template_ref`. | ✅ Active |
| **HITL Loop** | Human edits `.md` file -> Re-runs Flywheel -> Immediate feedback. | ✅ Enabled |
| **Golden Set** | Uses static `golden_set.json` for regression testing. | ✅ Active |

---

### 5) Gaps & Future Work

| Gap | Description | Severity | Suggested Action |
| :--- | :--- | :--- | :--- |
| **Certification Tooling** | We have `scaffold` and `refine`, but no `certify` tool to "freeze" the registry into a v1 release. | High | Build `tools/certify-domain.ts` to snapshot the workspace. |
| **Synthetic Gen** | The "Duet & Doubt" synthetic generator is not yet integrated with the Linked Plan. | Medium | Connect `flywheel/dataset/generate.ts` to the new Manifest schema. |
| **ConfigDB Loader** | No automated way to load the final `plan.json` into a runtime database (UI Factory). | Medium | Create a loader script for the downstream UI app. |

---

### 6) Quick-Start for Developers

**1. Initialize Workspace:**
`npx ts-node tools/scaffold-domain.ts --domain Cardiology --source Orthopedics`

**2. Generate Manifest:**
`npx ts-node bin/planner.ts generate --concern C35 --domain Cardiology`

**3. Refine Logic (HITL):**
`npx ts-node EvalsFactory/refinery/cli.ts run signal_enrichment golden_set --plan output/plan_c35.json`
*(Edit Markdown files in registry -> Repeat)*
