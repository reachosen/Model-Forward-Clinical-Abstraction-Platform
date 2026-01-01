# Architecture Interface & Gap Analysis

**Status:** Draft
**Date:** 2025-12-29
**Author:** Gemini

## Overview

This document analyzes the interface between Planning, Evals, Schema, and UI factories, specifically focusing on the data flow of **Prompt Artifacts**.

## 1. The Interface Map

The system relies on a "Registry-as-Workspace" model where `domains_registry/` is the source of truth for clinical logic (prompts).

| Flow Step | Producer | Consumer | Artifact | Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Scaffold** | `plan:scaffold` | `domains_registry` | **Initial Markdown Prompts** | `domains_registry/.../*.md` | ✅ Working |
| **2. Plan** | `plan:generate` (S0-S6) | `EvalsFactory` | **Linked Manifest** (`plan.json`) | `output/plan_*.json` | ✅ Working (via S6 fix) |
| **3. Eval (Read)** | `eval:refine` | `RefineryRunner` | **Source Prompt** | Read via `template_ref` in plan | ✅ Working |
| **4. Eval (Write)** | `eval:refine` | `domains_registry` | **Optimized Prompt** | `domains_registry/.../*.md` | ❌ **GAP DETECTED** |
| **5. Certify** | `schema:certify` | `SchemaFactory` | **Certified Artifact** | `certified/.../*.json` | ⚠️ Pending Imp. |

---

## 2. Gap Analysis

### Gap A: The "Broken Flywheel" (Critical)
**Issue:** `EvalsFactory` (Refinery) can score prompts but cannot save improvements.
- **Current Behavior:** It runs the loop, prints a score, and discards the "winning" prompt candidate.
- **Impact:** Clinical experts or the automated optimizer cannot persist their changes.
- **Fix:** Implement a "Promotion" mechanism.
    - **Option 1 (Automated):** If `refine` is run with `--apply`, overwrite the `.md` file in `domains_registry`.
    - **Option 2 (Safe):** Output a "patch" file or "improved candidate" to `learning_drafts/`, requiring human approval to merge.

### Gap B: Logic Duplication in Planning (Architectural)
**Issue:** `S4_PromptPlanGeneration` generates a prompt plan, but `S6_PlanAssembly` **ignores it** and manually reconstructs the prompt configuration (including `template_ref` paths).
- **Current Behavior:** `S4` calculates valid `PromptConfig` objects (now including `template_ref` thanks to recent patch), but `S6` logic hardcodes the path construction again.
- **Impact:** Changes to prompt strategy in `S4` (e.g., A/B testing versions, changing model defaults) will be silently ignored by `S6` in the final output.
- **Fix:** Refactor `S6` to use the `PromptPlan` output from `S4` as the source of truth for the `clinical_config.prompts` section.

### Gap C: Patient Payload Injection (Runtime)
**Issue:** `RefineryRunner` has to manually append `PATIENT DATA: ...` to the prompt.
- **Current Behavior:** The `.md` templates in `domains_registry` generally do not include a `{{patient_payload}}` placeholder, relying on system prompt context.
- **Impact:** Inconsistent behavior between "Test Mode" (Refinery) and "Production Mode" (S5 execution).
- **Fix:** Standardize `S5Adapter` to handle context injection consistently across both modes.

---

## 3. Proposed Solution: The "Promote" Mission

We should introduce a structured way to close the loop from Evals → Registry.

### New Mission: `eval:promote`

**Command:**
```bash
npm run missions -- eval:promote --candidate <run_id> --target <task_type>
```

**Workflow:**
1.  **Refine:** `npm run missions -- eval:refine ...` -> Outputs `runs/{date}/{id}/best_candidate.md`.
2.  **Review:** Human reviews the generated markdown.
3.  **Promote:** `npm run missions -- eval:promote ...` -> Overwrites `domains_registry/.../{task}.md`.

## 4. Immediate Next Steps

1.  **Refactor S6:** Make `S6_PlanAssembly` consume `S4`'s prompt plan directly.
2.  **Implement Write-Back:** Add `saveCandidate()` to `RefineryRunner` to store the best prompt to a temp location.
3.  **Create Promote Tool:** Create a CLI tool to copy that temp file to `domains_registry`.
