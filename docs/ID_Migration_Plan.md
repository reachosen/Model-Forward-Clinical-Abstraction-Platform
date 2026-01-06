# Clinical Factory ID Migration & Robustness Analysis

**Status:** Draft
**Context:** Brainstorming Analysis for "Negative ID" Regressions
**Author:** Senior TypeScript Engineer (Simulated)

---

### 1. Dependency Map: Negated Signal IDs

This table maps where "Negative IDs" (e.g., `absence_of_perfusion_checks`, `pre_op_warming_not_documented`) persist in the codebase and the impact of renaming them.

| File | Identifier/Key | Consumer | Reference Type | Break if Renamed? | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `domains_registry/.../_shared/signals.json` | `infection_risks` array values | **Generator** (Derive Tool) | **Source String** | **YES** (Generates ID) | Update string to positive phrasing (e.g., "Antibiotic Prophylaxis Compliance") carefully. |
| `domains_registry/.../I32a/definitions/signal_groups.json` | `signal_id`: `absence_of_...`, `not_documented` | **Accountant, UI, Planner** | **Primary Key** | **YES** | Regenerate via `derive-definitions` with a stable Alias map or updated Source strings. |
| `tools/accountant.ts` | `aliasMap` (Line ~75) | **Accountant** | **Alias Key** | **YES** (Mapping breaks) | Update `aliasMap` to link Old-Negative IDs to New-Positive IDs bi-directionally. |
| `data/coverage_map.json` | keys (e.g., `pre_op_warming_not_documented`) | **Reporting** | **Data Key** | No (History only) | Archive historical files or run a migration script. |
| `data/accountant_report.json` | keys | **Reporting** | **Data Key** | No | Archive. |
| `tests/testcases/.../*.json` | `expected_signals[].signal_id` | **Evals / Accountant** | **Expectation** | **YES** (Validation Fails) | Batch migrate test cases with a script that handles **Semantic Inversion** (flipping polarity). |
| `output/.../plan.json` | `clinical_config.signals` | **UI / Runtime** | **Configuration** | **YES** (Runtime Mismatch) | Regenerate plans after fixing Source/Registry. |
| `learning_drafts/*.json` | `id` field | **Auto-Healer** | **Patch Target** | **YES** (Patch Fails) | Reject/Archive pending drafts matching old IDs. |

---

### 2. Root Cause: Why Positive-Form IDs Caused Regressions

Why did moving to positive IDs (e.g., `documentation_gap`) fail previously?

| Issue | Evidence from Code | Impact | Root Cause Mechanism |
| :--- | :--- | :--- | :--- |
| **Semantic Inversion** | `accountant.ts` `aliasMap` maps `not_documented` → `documentation_gap`. | **False Positives / Negatives** | Flipping ID from "Absence" (Negative) to "Presence" (Positive) flips the `Polarity` logic. Legacy test cases expect `polarity: "AFFIRM"` for "No documentation". New ID implies `polarity: "DENY"` for "No documentation". The Accountant flags this as an intent mismatch. |
| **Truncation Collisions** | `derive-definitions.ts` uses `.substring(0, 40)`. Ex: `antibiotic_prophylaxis_not_given_within_` (trailing `_`). | **Unstable IDs** | "Positive" strings might have different lengths, causing different truncation points, breaking strict equality checks in Accountant (`registrySignalSet.has(id)`). |
| **Dual Source of Truth** | `signals.json` (Source strings) vs `signal_groups.json` (Derived IDs). | **Configuration Drift** | Manual edits to `signal_groups.json` (restores) desync from `signals.json`. Running `derive-definitions.ts` blindly overwrites manual fixes. |
| **Strict ID Matching** | `accountant.ts` fails `INVALID_SIGNAL_ID` if ID isn't in Registry. | **Pipeline Blocker** | Any rename strictly breaks the audit gate unless the `aliasMap` is perfectly synchronized. |

---

### 3. Design Options for ID Migration

| Option | Description | Effort | Risk | Restore-Proof? | Long-Term | Recommended |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **(A) Rename in Source** | Edit `signals.json` to "Prophylaxis Timely", regen all. | High (Migrate 100s of tests) | High (Semantic inversion) | No (Restore reverts it) | Best | No (Too disruptive) |
| **(B) Alias Map (Code)** | Expand `aliasMap` in `accountant.ts` to map Old → New. | Low | Low | Yes (Code logic) | Tech Debt | **Yes (Immediate)** |
| **(C) Normalize Loader** | Shared `SemanticPacketLoader` normalizes on load. | Medium | Medium | Yes | Good | Yes (Parallel) |
| **(D) Hybrid Schema** | Add `aliases: []` to `signals.json` and `signal_groups.json`. | Medium | Low | Yes | Excellent | **Yes (Strategic)** |

---

### 4. Idempotent Pipeline & Source of Truth

To preventing future regressions from restores:

| Component | Role | Logic / Rules | Validation Strategy |
| :--- | :--- | :--- | :--- |
| **`signals.json`** | **AUTHORITATIVE SOURCE** | Human-readable strings. | Must be versioned in Git. Manual edits allowed here ONLY. |
| **`derive-definitions.ts`** | **Transformer** | `toSnakeCase(str.substring(0,40))` → ID. | **Must be deterministic.** Should throw error if duplicate IDs are generated. |
| **`signal_groups.json`** | **Derived Artifact** | Generated output. | **READ-ONLY.** CI Check should fail if this is modified without a corresponding `signals.json` change. |
| **Merge Strategy** | **Gemini → Source** | Gemini proposes changes to `signals.json` (Strings). | Reviewer approves String change. CI auto-runs `derive` to update IDs. |

---

### 5. Deny Templates Robustness

Proposed hardening for `accountant.ts` deny-matching logic.

| Current Logic (`accountant.ts`) | Weakness | Proposed Fix | Expected Deny% Impact |
| :--- | :--- | :--- | :--- |
| `substring.toLowerCase().includes(template)` | Brittle. `not documented` vs `not recorded` fails. | **Token Overlap / Levenshtein.** Allow 80% similarity match. OR **Stemming** (document vs documented). | **< 2%** (Reduces false positives) |
| Hardcoded `denyLexicon` | Limited (`denies`, `no evidence`). Misses "unremarkable", "ruled out". | **Configurable Lexicon** in Registry per-signal or per-domain. | **< 1%** |
| Case-insensitive string search | Fails on nuances like "No infection" vs "No, infection present". | **NLP Negation Scope** (dependency parsing) or simple **Windowed Search** (search near key terms). | **< 0.5%** |

---

### 6. Migration Plan (Stepwise)

| Phase | Action | Mechanism | Success Criteria |
| :--- | :--- | :--- | :--- |
| **1. Stabilize** | Keep Negative IDs in `signals.json`. | `derive-definitions` generates current IDs. | Accountant passes with current `signal_groups.json`. |
| **2. Alias (Code)** | Add Positive aliases to `accountant.ts` `aliasMap`. | Map `not_documented` → `documentation_gap`. | Accountant accepts *both* IDs (if logic allows). |
| **3. Dual-Write** | Update Prompts to output Positive IDs. | Gemini prompts emit `documentation_gap`. | Accountant maps Positive → Negative (via inverse alias) to check Registry. |
| **4. Schema Lift** | Add `aliases` field to `signal_groups.json`. | Update `derive` to populates `aliases`. | Registry natively supports lookup by Alias. |
| **5. Cutover** | Rename Source strings in `signals.json`. | Regen IDs. Update Test Cases. | `aliasMap` removed. Registry has Positive IDs. |
