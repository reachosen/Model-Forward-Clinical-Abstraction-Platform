# 🚀 I32a Mission Control Handover Guide

This guide defines the goals and the end-to-end operational sequence for the **I32a** clinical metric onboarding.

---

## 🎯 Goals for the Planner
**Core Intention**: To serve as the "Architect Agent" that translates clinical intent into a deterministic technical blueprint (`lean_plan.json`), ensuring zero-loss communication between the Registry and the Production Pipeline.

### For Planning Personnel (The Setup)
*   **Semantic Integrity**: Ensure the plan correctly inherits specialized definitions from the Registry (e.g., I32a-specific scoliosis signals).
*   **Logical Sequencing**: Guarantee that task dependencies (e.g., Signal Enrichment → Event Summary) are explicitly registered.
*   **Schema Consistency**: Provide strict technical contracts for every task to prevent downstream parsing failures.

### For Evals Personnel (The Refinement)
*   **Metric Anchoring**: Provide high-fidelity "Clinical Focus" and "Risk Factors" needed to ground the Evaluator's safety logic.
*   **Ground Truth Mapping**: Define canonical signal IDs so the **Accountant** can accurately measure **Recall (CR)**.
*   **Contextual Richness**: Inject domain-specific benchmarks (Specialty Ranking) to ensure evaluations reflect clinical excellence.

---

## 📑 The Registry: Semantic Source of Truth
The Registry is the **authoritative input** for all factories.

1.  **Populating the Registry**: Before running Step 1, the Registry must contain the metric's definitions and v0 templates (done via `plan:scaffold`).
2.  **Planner Interaction**: `plan:generate` scans the Registry and prioritizes the metric folder (`I32a/prompts/`) before falling back to `_shared/`.
3.  **Certification Update**: `schema:certify` reads the Registry's **current state**, expands it using the **Unified Hydration Engine**, and "freezes" it into the `certified/` release folder. 

---

## 🛠️ Prerequisites
*   **Environment**: Node.js 16+, TypeScript 4.5+.
*   **API Access**: An OpenAI API Key must be in the **ROOT .env file** (`Model-Forward-Clinical-Abstraction-Platform/.env`).
    *   *Note*: All factories now use a single centralized environment loader.
*   **Setup**: Run `npm install` inside the `factory-cli` directory.

---

## 🚀 The Mission Control Sequence (I32a)
Execute these commands in order from the `factory-cli` folder.

|  Step | Mission ID          | Command                                                                                | What this does (plain English)                    |
| ----: | ------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **0** | `ops:teardown`      | `npm run missions -- run ops:teardown --metric I32a`                                   | Resets workspace. Keeps `/certified` safe.        |
| **-** | `eval:status`       | `npm run missions -- run eval:status --metric I32a`                                    | **The Dashboard**: Confirms workspace is clean.   |
| **1** | `plan:generate`     | `npm run missions -- run plan:generate --concern I32a --domain orthopedics`            | Creates **lean_plan.json** (the blueprint).       |
| **2** | `eval:roundtrip`    | `npm run missions -- run eval:roundtrip --metric I32a`                                 | Generates **200 clinical cases** (Golden Set).    |
| **5a**| `eval:qa-scorecard` | `npm run missions -- run eval:qa-scorecard --metric I32a --batch golden_set_v2`        | **Diagnostic Run**: Establish your baseline score.|
| **3** | `eval:optimize`     | `npm run missions -- run eval:optimize --metric I32a --loops 3 --task signal_enrichment`| Improves prompts using agentic feedback.          |
| **+** | `eval:leap`         | `npm run missions -- run eval:leap --metric I32a`                                      | **Leap Forward**: Mines hardest cases → v3 set.   |
| **4** | **Manual Land**     | *See Landing Protocol*                                                                 | Selects best sandbox result → source registry.    |
| **5b**| `eval:qa-scorecard` | `npm run missions -- run eval:qa-scorecard --metric I32a --batch golden_set_v2`        | **Final Grade**: Verifies improved prompt PASSES. |
| **6** | `schema:certify`    | `npm run missions -- run schema:certify --plan output/i32a-orthopedics/lean_plan.json` | Freezes config into `/certified`.                 |
| **7** | `schema:seed`       | `npm run missions -- run schema:seed --metric I32a`                                    | Emits Snowflake SQL for deployment.               |

---

## 🏗️ The Landing Protocol (Manual Registry Update)
The Flywheel generates prompt candidates in a sandbox. To update the Registry with your winner:

1.  **Identify Winner**: At the end of Step 3, review the **Final Prompt Evolution** summary.
2.  **Land the File**: Copy the best prompt text and overwrite:
    *   **Path**: `domains_registry/USNWR/Orthopedics/metrics/I32a/prompts/signal_enrichment.md`
3.  **Effect**: Step 6 (Certify) will now use this "v2" logic instead of domain defaults.

---

## 📈 Score-to-Sequence Mapping (Troubleshooting)
If your Step 5 Safety Grade fails, use this mapping to iterate.

| If this Score Drops... | It Means the Model... | Fix it in this Step: |
| :-------------------- | :-------------------- | :------------------- |
| **CR (Recall)**       | Missed a signal ID.   | **Step 3**: Refine "Extraction Guidance". |
| **EF (Fidelity)**     | Paraphrased a quote.  | **Step 3**: Strengthen "Strict Rules" for provenance. |
| **DR (Doubt)**        | Hallucinated certainty| **Step 3**: Enhance "Ambiguity Handling" instructions. |
| **AC (Context)**      | Linked wrong causes.  | **Step 3**: Refine the "Clinical Focus" narrative. |

---

## 🔍 Understanding the Logs
*   **Dual-Pass Pipeline**: `plan:generate` runs in two passes (**PASS A** for strategy, **PASS B** for assembly).
*   **Reconciled Math**: Step 2 audit results now sum perfectly (Golden + Dropped + Other = Total).
*   **Evolution Summary**: Step 3 displays v0, Last, and Current prompts side-by-side at the absolute end.
*   **Hierarchical Layout**: All major logs now use a tree structure (`├─`, `└─`) for clarity.

---

## ⚠️ Important Rules
*   **Schema Requirement**: Every prompt **MUST** contain a `**REQUIRED JSON SCHEMA:**` block. 
*   **Hydration Logic**: Testing and Certification use the **Unified Hydration Engine**. A prompt tested in the Flywheel is guaranteed to be 1:1 with the certified version.
*   **Database Versioning**: Step 7 (SQL Seed) hashes content. The database maintains history automatically.