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
*   **Metric Anchoring**: Provide the high-fidelity "Clinical Focus" and "Risk Factors" needed to ground the Evaluator's safety logic.
*   **Ground Truth Mapping**: Define canonical signal IDs so the **Accountant** can accurately measure **Recall (CR)**.
*   **Contextual Richness**: Inject domain-specific benchmarks (Specialty Ranking) to ensure evaluations reflect real-world clinical excellence.

---

## 📑 The Registry: Semantic Source of Truth
The Registry is the "Source Code" for the clinical logic. It is not an output; it is the **authoritative input** for all factories.

1.  **Populating the Registry**: Before running Step 1 (Inception), the Registry must contain the metric's definitions (signals, questions) and v0 prompts. This is usually done via `plan:scaffold`.
2.  **Planner Interaction**: The Planner (`plan:generate`) scans the Registry to find the best available prompts. It prioritizes the metric folder (`I32a/prompts/`) and falls back to `_shared/prompts/`.
3.  **Certification Update**: When you run `schema:certify`, the system reads the **current state** of the Registry and "freezes" it into the `certified/` folder. 
    *   *Note*: The Registry is the "Workspace"; the `certified/` folder is the "Release".

---

## 🛠️ Prerequisites
*   **Environment**: Node.js 16+, TypeScript 4.5+.
*   **API Access**: An OpenAI API Key must be in `factory-cli/.env`.
*   **Setup**: Run `npm install` inside the `factory-cli` directory.

---

## 🚀 The Mission Control Sequence (I32a)
Execute these commands in order from the `factory-cli` folder. All commands are now **Metric-Driven**.

| Step | Mission ID         | Command                                                                          | Result                                         |
| :--- | :----------------- | :------------------------------------------------------------------------------- | :--------------------------------------------- |
| **1**| `plan:generate`    | `npm run missions -- run plan:generate --concern I32a --domain orthopedics`      | Builds `lean_plan.json` (The Blueprint).       |
| **2**| `eval:roundtrip`   | `npm run missions -- run eval:roundtrip --metric I32a`                           | Generates "Balanced 50" tests & **Test Plan**. |
| **3**| `eval:optimize`    | `npm run missions -- run eval:optimize --metric I32a`                            | Runs AI-driven agentic improvement loop.       |
| **4**| **Manual Land**    | *See "Landing Protocol" below*                                                   | Promotes Sandbox winner to Source Registry.    |
| **5**| `eval:qa-scorecard`| `npm run missions -- run eval:qa-scorecard --metric I32a --batch "I32a_batch_*"` | Generates final Clinical Safety Grade.         |
| **6**| `schema:certify`   | `npm run missions -- run schema:certify --plan output/i32a-Orthopedics/lean_plan.json` | Freezes Registry into `/certified` folder.     |
| **7**| `schema:seed`      | `npm run missions -- run schema:seed --metric I32a`                              | Generates Snowflake SQL for Handover.          |

---

## 🏗️ The Landing Protocol (Manual Registry Update)
The Flywheel generates prompt candidates in a sandbox. To update the Registry with your winner:

1.  **Identify Winner**: Open `data/flywheel/prompts/prompt_history_I32a.json` and pick the highest-scoring text.
2.  **Land the File**: Overwrite `domains_registry/USNWR/Orthopedics/metrics/I32a/prompts/signal_enrichment.md`.
3.  **Effect**: Subsequent runs of Step 6 (Certify) will now use this "v2" logic instead of the domain defaults.

---

## 📂 Key File Locations

| Artifact           | Location                                                                              |
| :----------------- | :------------------------------------------------------------------------------------ |
| **Source Prompts** | `domains_registry/USNWR/Orthopedics/metrics/I32a/prompts/`                            |
| **Testbatch Plan** | `domains_registry/USNWR/Orthopedics/metrics/I32a/tests/testcases/generation_strategy.json` |
| **Clinical Tests** | `domains_registry/USNWR/Orthopedics/metrics/I32a/tests/testcases/`                    |
| **Certified Release**| `certified/Orthopedics/I32a/`                                                       |
| **Handover SQL**   | `output/i32a-Orthopedics/seed_snowflake.sql`                                          |

---

## ⚠️ Important Rules
*   **Schema Requirement**: Every prompt **MUST** contain a `**REQUIRED JSON SCHEMA:**` block. If the AI optimizer removes this block, Step 6 (Certification) will fail.
*   **Plan Dependency**: Steps 2 through 7 depend on the `lean_plan.json` created in Step 1.
*   **Database Versioning**: Step 7 (SQL Seed) uses content-based hashing. The database maintains the history of all certified versions automatically. **Provenance is handled by the data layer.**
*   **Rollback**: To revert to the standard v0 prompt, simply delete the metric-specific file in the Registry.