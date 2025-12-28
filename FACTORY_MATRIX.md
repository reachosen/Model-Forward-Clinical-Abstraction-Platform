# Model-Forward Factory — End-to-End Matrix (Aligned to Stated Goals)

| Seq | Factory | Goal | Inputs | Reads | Writes | Outputs (Canonical) | HITL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Planning Factory** | Seed config for a metric | Metric intent | Domain registry; archetypes | v0 configs; v0 prompts | Metric seed: archetypes, signal groups, signals, v0 task prompts | Architect / Planner |
| **2** | **Eval Factory** | Battle-test & harden prompts | Seed configs; v0 prompts | Golden cases; eval rules | Iterative prompt edits | Production-ready task prompts; eval strategy & reports | Clinical expert |
| **3** | **Schema Factory** | Execute & materialize case elements | Hardened prompts; metric configs | ConfigDB; raw patient payload | ConfigDB seeds; task runs | Case elements (signals, events, summaries) for UI | Governance / Engineer |
| **4** | **UI Factory** | Display & review | Case elements | Certified outputs | UI state | Review screens; timelines; consoles | Clinician (UAT) |

---

## Read / Write Authority Matrix

| Factory | Config Seeds | Task Prompts | Raw Patient Data | Case Elements |
| :--- | :--- | :--- | :--- | :--- |
| **Planning** | Write (v0) | Write (v0) | No | No |
| **Eval** | No | Edit (authoritative) | Read (golden) | No |
| **Schema** | Write (final) | Consume | Read | Write |
| **UI** | Read | Read | No | Read |

---

## One-Line Flow

| Stage | What Happens |
| :--- | :--- |
| **Planning** | Seed metric configs + v0 prompts |
| **Eval** | Battle-test → harden task prompts |
| **Schema** | Seed DB + run prompts on raw payload → case elements |
| **UI** | Render case for review |