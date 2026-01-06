# Planning & Schema Factory Handover Guide

**Scope:** I32a (Orthopedics) Clinical Abstraction Pipeline
**Date:** January 6, 2026
**Status:** Certified & Ready for Seeding

---

## 1. System Overview

The **Model-Forward Clinical Abstraction Platform** automates the creation of clinical review configurations. This handover covers the **Planning → Certification** pipeline, which transforms high-level metric intent into rigorous, type-safe backend artifacts.

### The Pipeline

```mermaid
graph TD
    A[Metric Intent (I32a)] -->|bin/planner.ts| B(PlanningFactory)
    B -->|S1: Domain Resolution| C{Context Loader}
    C -->|Load| D[Prompts .md]
    C -->|Load| E[Definitions .json]
    C -->|Load| F[Registry .json]
    B -->|S5: Execution| G[Plan JSON]
    G -->|SchemaFactory/cli.ts| H(SchemaFactory)
    H -->|Hydrate & Synthesize| I[Certified Artifacts]
    I -->|Manual| J[(ConfigDB)]
```

---

## 2. Dependency Matrix

The system relies on a mix of static config and dynamic file loading.

| Component | Location | Loader Mechanism | Criticality | Behavior if Missing |
| :--- | :--- | :--- | :--- | :--- |
| **Logic (Prompts)** | `domains_registry/USNWR/Orthopedics/_shared/prompts/*.md` | Dynamic `fs.readFileSync` (S5) | 🔴 **CRITICAL** | Task execution fails. |
| **Definitions** | `domains_registry/USNWR/Orthopedics/metrics/I32a/definitions/*.json` | Dynamic `fs.readFileSync` (S1) | 🟡 **HIGH** | System degrades to generic defaults (Soft Fail). |
| **Registry** | `factory-cli/config/concern-registry.json` | Dynamic `fs.readFileSync` (S0) | 🔴 **CRITICAL** | Process crashes immediately. |
| **Task Config** | `PlanningFactory/config/taskConfig.ts` | Static `import` (Compile-time) | 🔴 **CRITICAL** | Compile error / Runtime crash. |
| **API Keys** | `Model-Forward-Clinical-Abstraction-Platform/.env` | `dotenv` (Repo Root) | 🔴 **CRITICAL** | LLM calls fail (401 Unauthorized). |

---

## 3. End-to-End Execution Guide

Follow these steps to regenerate the certified artifacts from scratch.

### Prerequisites
1.  Ensure `.env` exists at repository root with `OPENAI_API_KEY`.
2.  Navigate to `factory-cli/`.

### Step 1: Clean (Optional)
Clear old outputs to ensure a fresh run.
```bash
# PowerShell
Remove-Item -Recurse -Force factory-cli/output/i32a-Orthopedics
Remove-Item -Recurse -Force factory-cli/certified/Orthopedics/I32a
```

### Step 2: Generate Plan (PlanningFactory)
Creates the execution blueprint and runs the "Dry Run" task execution.
```bash
npx ts-node bin/planner.ts generate --concern I32a --domain Orthopedics
```
*   **Output:** `factory-cli/output/i32a-Orthopedics/plan.json`

### Step 3: Certify Artifacts (SchemaFactory)
Hydrates the plan with full context and generates strict Zod contracts.
```bash
npx ts-node SchemaFactory/cli.ts certify -p output/i32a-Orthopedics/plan.json
```
*   **Output:** `factory-cli/certified/Orthopedics/I32a/`

### Step 4: Seed (Pending Implementation)
Currently, "Seeding" involves committing the certified artifacts to the repo.
*   **Future Command:** `npx ts-node SchemaFactory/cli.ts seed -m I32a`
*   **Action:** Insert `prompt.md` and `schema.json` into `config_db.prompts` and `config_db.configs`.

---

## 4. Artifact Reference

After Step 3, the `certified/` folder contains the "Golden Source" for the runtime.

**Location:** `factory-cli/certified/Orthopedics/I32a/`

| File | Purpose | Consumer |
| :--- | :--- | :--- |
| **`manifest.json`** | Bill of Materials (Version, Date, Hash). | ConfigDB Seeder |
| **`*/prompt.md`** | The fully hydrated, context-aware prompt text. | LLM Engine (Runtime) |
| **`*/schema.json`** | Raw JSON Schema Draft 7 for validation. | LLM Engine (Structured Output) |
| **`*/contract.ts`** | TypeScript Zod definitions generated from schema. | Backend API / EventDB |

---

## 5. Known Issues & Fixes

### 1. `exclusion_check.md` Schema Error
*   **Issue:** The original prompt contained pseudo-code (`true | false`) in the `REQUIRED JSON SCHEMA` block, causing SchemaFactory to crash.
*   **Fix Applied:** The file has been patched to use valid Draft 7 JSON Schema (`type: "string", enum: ["excluded", ...]`).
*   **Prevention:** All future prompts must use valid JSON Schema in the `REQUIRED JSON SCHEMA` block.

### 2. "Failed to load Semantic Packet"
*   **Issue:** Logs show warnings about negated signal IDs (e.g., `no_documentation`).
*   **Impact:** S1 falls back to generic rules.
*   **Fix:** Ensure `metrics/I32a/definitions/signal_groups.json` contains only positive signal IDs.

### 3. Missing ConfigDB Seeder
*   **Issue:** `factory-cli/SchemaFactory/generators/configDB.ts` does not exist.
*   **Workaround:** Manually ingest files or commit to git.

---

## 6. Directory Map

```text
Model-Forward-Clinical-Abstraction-Platform/
├── .env                                      # [Repo Root] API Keys
└── factory-cli/
    ├── bin/planner.ts                        # [Exec] Generation Entry Point
    ├── SchemaFactory/
    │   └── cli.ts                            # [Exec] Certification Entry Point
    ├── config/
    │   └── concern-registry.json             # [Config] Registry
    ├── domains_registry/
    │   └── USNWR/
    │       └── Orthopedics/
    │           ├── _shared/prompts/          # [Source] Prompts
    │           └── metrics/I32a/definitions/ # [Source] Definitions
    ├── output/
    │   └── i32a-Orthopedics/plan.json        # [Artifact] Intermediate Plan
    └── certified/
        └── Orthopedics/I32a/                 # [Artifact] FINAL OUTPUT
```
