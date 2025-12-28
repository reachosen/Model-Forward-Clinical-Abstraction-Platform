# Design Lock: USNWR Ortho Demo Architecture

**Status**: LOCKED
**Date**: 2024-12-23
**Scope**: 10-Day Sprint to Demo

This document resolves the gaps between the "Factory Vision" and the codebase reality. It serves as the definitive specification for the implementation.

---

## 1. Mission Catalog & Naming (The Fix)

We will expand `missions.ts` to include these specific, implementation-ready missions.

| Mission ID | New/Existing | Purpose | Command / Implementation |
| :--- | :--- | :--- | :--- |
| `plan:ingest` | **NEW** | deterministic transform of `metrics.json` → `PlannerPlan` | `ts-node tools/ingest-ortho.ts` |
| `strategy:derive` | **NEW** | Heuristic generation of `BatchStrategy` from `signals.json` | `ts-node tools/derive-strategy.ts` |
| `eval:generate` | Existing | Generates test cases from Strategy | `ts-node flywheel/dataset/generate.ts` |
| `eval:run` | Existing | Runs the battle test | `ts-node bin/planner.ts eval` |
| `refine:optimize` | **NEW** | The "Self-Healing" agent loop | `ts-node tools/refine.ts` |
| `gov:certify` | **NEW** | Checks thresholds and copies to `certified/` | `ts-node tools/certify.ts` |
| `mission:launch` | **NEW** | The Conductor entry point | `ts-node tools/conductor.ts launch` |

---

## 2. Artifact Contract & Data Layout

We define a rigid file structure to ensure composability and "resume" capability.

### Run Artifacts (Ephemeral)
Located in `output/runs/{run_id}/{metric_id}/`:

*   `manifest.json`: Inputs, config, git-sha, timestamp.
*   `plan.json`: The `PlannerPlan` (S6 output).
*   `strategy.json`: The `BatchStrategy` (Phase 2 output).
*   `test_cases.json`: Generated synthetic patients.
*   `eval_report.json`: Full grading results.
*   `optimization.log`: (Optional) Trace of the refinery loop.

### Certified Artifacts (Permanent)
Located in `certified/{domain}/{metric}/`:

*   `v{N}/prompts.json`: The freeze-dried prompts.
*   `v{N}/config.json`: The schema/config for the UI.
*   `v{N}/certification.json`: Signed metadata (who, when, score).
*   `LATEST`: Symlink or text file pointing to the current version.

---

## 3. The Dependency Graph (Implicit)

Rather than a complex DAG engine, we define the **Track** as a linear sequence with strictly typed inputs/outputs.

**The "Ortho Standard" Track:**

1.  **Ingest**
    *   *In*: `metrics.json` path, `metric_id`
    *   *Out*: `plan.json`
2.  **Strategy**
    *   *In*: `plan.json` (for signals), `signals.json`
    *   *Out*: `strategy.json`
3.  **Generate**
    *   *In*: `strategy.json`
    *   *Out*: `test_cases.json`
4.  **Battle**
    *   *In*: `plan.json` (prompts), `test_cases.json`
    *   *Out*: `eval_report.json`
5.  **Refine (Conditional)**
    *   *In*: `eval_report.json` (if FAIL)
    *   *Out*: `plan_v2.json`
6.  **Certify**
    *   *In*: `eval_report.json` (must be PASS)
    *   *Out*: (Writes to `certified/`)

---

## 4. Safety & Scoring Policy

To address the "Safety Override" gap, we define a **Scoring Policy** that the Evaluator must enforce.

**File**: `config/scoring_policy.json`
```json
{
  "safety_override": {
    "enabled": true,
    "rule": "IF safety_signal_missed THEN score = 0.0 (FAIL)"
  },
  "thresholds": {
    "critical_recall": 0.95,
    "general_recall": 0.90,
    "avoid_harm": 1.0
  }
}
```

**Implementation**: The `eval:run` tool will load this policy and override the raw score if a "Safety Signal" (defined in the Plan) was present in the Input but missing in the Output.

---

## 5. UI & Observability

To support the "Flight Board", the Conductor will emit structured events to `stdout` (or a file) in **NDJSON** format.

**Stream Example:**
```json
{"type": "step_start", "runId": "123", "metric": "I25", "step": "strategy"}
{"type": "log", "runId": "123", "metric": "I25", "level": "info", "message": "Deriving scenarios for delay_drivers..."}
{"type": "step_end", "runId": "123", "metric": "I25", "step": "strategy", "status": "success", "artifact": "strategy.json"}
```

The CLI Dashboard (`cli-table3`) consumes this stream to render the live view.

---

## 6. Scope Lock

For the USNWR Ortho Demo, we support **ONLY** these metrics:

1.  **I25**: Supracondylar Fracture (Process + Safety)
2.  **I26**: Femoral Shaft Fracture (Process + Autonomy)
3.  **I32a**: AIS Readmission (Outcome)
4.  **P40**: VTE Prophylaxis (Simple/Boolean)

*I27 is excluded to reduce scope creep.*

---

## 7. Implementation Order (Next 3 Steps)

1.  **Update Missions**: Edit `factory-cli/tools/missions.ts` to add the 5 new missions.
2.  **Scaffold Conductor**: Create `tools/conductor/` with the `Campaign` and `Track` interfaces.
3.  **Build Ingest Tool**: Create `tools/ingest-ortho.ts` to prove we can read the JSON.
