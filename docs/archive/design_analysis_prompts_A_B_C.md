# Prompt A – Find the “SAFE CHILD CARE Spine” in the Code

## 1. Central Choke Points

These are the locations in the pipeline where tasks naturally funnel through, making them ideal for centralized checks.

| Choke Point Type | File/Function | Tasks Covered | Notes |
| :--- | :--- | :--- | :--- |
| **Pre-LLM** | `S5_TaskExecution.ts` -> `loadPromptTemplate` | All | Best for validating Prompt Construction (S/A/R). We have the prompt text and domain context here. |
| **Post-LLM (Raw)** | `S5_TaskExecution.ts` -> `callLLM` | All | Best for cost tracking and detecting raw model refusals/errors before parsing. |
| **Post-Parse** | `S5_TaskExecution.ts` -> `execute` (after `parse*` calls) | All | We have the structured object. Best for schema validation and basic type safety (C/D). |
| **Post-Validate** | `S5_TaskExecution.ts` -> `validateTaskWithArchetypeContext` | All | **The Main Spine Hook**. This function explicitly receives `task`, `archetype`, and `output`, making it the perfect place for semantic safety checks (F/E/H/I/L). |

## 2. SAFE Dimensions at Choke Points

| File/Function | SAFE Dimensions Naturally Observable | Data Available | Missing Data | Comment |
| :--- | :--- | :--- | :--- | :--- |
| `loadPromptTemplate` | **S** (Supported), **R** (Respects Diversity - via instructions), **A** (Avoids Harm - via constraints) | `context` (domain, archetype, metric), `template_id` | Actual user inputs (patient data) are embedded in context but harder to analyze structurally. | Ideal for "Static Analysis" of the prompt before sending. |
| `callLLM` | **E** (Efficiency/Cost), **A** (Avoids Harm - refusals) | `prompt`, `model`, `raw_response` | Parsed meaning. | Good for "Red Teaming" logs (did it refuse?). |
| `validateTaskWith...` | **F** (Few Risks), **E** (Evidence), **C** (Correctness), **I** (Incorrect avoided), **D** (Detailed), **H** (Highlights reasoning) | `archetype`, `task`, `output` (structured), `domain` | The original raw prompt is further up the stack (need to pass it down if needed). | **Primary location for SAFE scoring.** We can check if "risks" were flagged, if "provenance" exists, etc. |

## 3. Existing SAFE-Aligned Logic

| Criterion | Example | File/Function | Task(s) | Explicit vs Implicit |
| :--- | :--- | :--- | :--- | :--- |
| **A** (Avoids Harm) | "DO NOT invent facts... timestamps... symptoms" | `prompts/*.ts` | All | Explicit |
| **C** (Correctness) | "Use ONLY patient_payload as your factual source" | `prompts/*.ts` | All | Explicit |
| **E** (Evidence) | "Every signal MUST have provenance" | `prompts/signalEnrichment.ts` | signal_enrichment | Explicit |
| **F** (Few Risks) | `validateTaskWithArchetypeContext` checks for missing risk flags | `ContextAwareValidation.ts` | signal_enrichment | Implicit |
| **I** (Incorrect Avoided) | "If... cannot be supported... phrase as 'uncertain'" | `multiArchetypeSynthesis.ts` | Synthesis | Explicit |
| **E** (Endures) | **CoVE Loop**: Draft -> Verify | `S5_TaskExecution.ts` | Synthesis | Explicit |
| **D** (Detailed) | `synthesis_rationale` field | `multiArchetypeSynthesis.ts` | Synthesis | Implicit |

## 4. Summary & Recommendations

*   **Best Location:** `validateTaskWithArchetypeContext` in `ContextAwareValidation.ts`. It already switches on `task` and `archetype`, making it the natural home for a "SAFE Scorecard" calculator.
*   **Secondary Location:** `loadPromptTemplate` in `S5_TaskExecution.ts` for injecting safety instructions (the "S" and "A" of SAFE) dynamically into the prompt system message.
*   **Easiest Dimensions:** **A** (Avoids Harm) and **C** (Correctness) are already heavily emphasized in prompt text. **E** (Evidence) is structurally enforced via the `provenance` field in signals.
*   **Hardest Dimensions:** **R** (Respects Diversity) and **L** (Learning) are currently missing. No logic checks for bias or outdated medical info. These would require new validators or specific "Red Team" prompt variations.

---

# Prompt B – Generic Flywheel / Batch Evaluator Interfaces (Design-Only)

## 1. Current Coupling Analysis

| Concern | Current Function/Pattern | Inputs | Outputs | Hardcoded To | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dataset Gen** | `runGenerator` (`dataset/core.ts`) | `GeneratorConfig` | `json file` | **I25** (System prompt text) | `buildSystemPrompt` has hardcoded "I25 Supracondylar..." text. |
| **Expectations** | `TestCase.expectations` (`types.ts`) | N/A (Type Def) | N/A | **Task-Specific** | Has specific keys: `signal_generation`, `event_summary`. |
| **Validation** | `validateSignals` (`checks.ts`) | `TestCase`, `EngineOutput` | `Recall %` | **Task-Specific** | Hardcoded to look for `must_find_signals`. |
| **Loop Control** | `runFlywheel` (`loop.ts`) | `maxLoops` | N/A | **I25** | Hardcoded `CONCERN_ID = 'I25'`. |

## 2. Proposed Generic Interfaces

| Interface Name | Field or Method | Type | Evidence in Code | Required? |
| :--- | :--- | :--- | :--- | :--- |
| `FlywheelDataset<TCase>` | `cases` | `TCase[]` | `data.test_cases` array | Y |
| | `metadata` | `Record<string, any>` | `batch_plan` object | N |
| `FlywheelExpectation<TOutput>` | `validate(output: TOutput)` | `ValidationResult` | `validateSignals` logic | Y |
| | `target_metric_id` | `string` | `concern_id` in TestCase | Y |
| `TaskValidator<TOutput>` | `score(output: TOutput, expected: any)` | `number` (0-1) | `recall` calc in checks | Y |
| `FlywheelLoop<TCase, TOutput>` | `run(prompt: string, dataset: TCase[])` | `Promise<Report>` | `runner.run()` | Y |
| | `optimize(report: Report)` | `Promise<string>` | `optimizePrompt()` | Y |

## 3. Interface Slots for S5 Tasks

| Task | TOutput Shape | Expectation Shape | Candidate Validator | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `signal_enrichment` | `SignalEnrichmentResult` | `must_find_signals: string[]` | `RecallValidator` | Already exists. |
| `event_summary` | `EventSummaryResult` | `must_contain_phrases: string[]` | `PhraseCoverageValidator` | Logic exists in `checks.ts`. |
| `summary_20_80` | `{ patient: string, provider: string }` | `key_facts: string[]` | `FactCoverageValidator` | Needs new validator. |
| `followup_questions` | `FollowupQuestionsResult` | `required_themes: string[]` | `ThemeCoverageValidator` | Logic exists in `checks.ts`. |
| `clinical_review_plan` | `ClinicalReviewPlanResult` | `required_flags: string[]` | `FlagPresenceValidator` | Needs new validator. |
| `multi_archetype_synthesis` | `MultiArchetypeSynthesisResult` | `final_determination: string` | `DeterminationMatchValidator` | Needs new validator. |

## 4. Summary

*   **Already Generic:** The `I25BatchRunner` structure (load files -> run engine -> aggregate) is structurally sound and mostly generic, except for the file pattern matching.
*   **Deeply Coupled:** `dataset/core.ts` is the biggest blocker. The `buildSystemPrompt` function is 100% hardcoded to I25 clinical logic. This needs to be injected via a `MetricDefinition` configuration.
*   **Key Abstractions Needed:**
    1.  `MetricDefinition`: A config object defining the clinical domain, target, and scoring rules (to replace hardcoded I25 prompt).
    2.  `TaskEvaluator`: A strategy pattern interface `(output, expectation) => Score` so we can swap `validateSignals` for `validateSummary` without `if/else` chains.

---

# Prompt C – Prompt Registry “Extraction Map”

## 1. Prompt Component Analysis

| Task | Prompt Piece | Where Defined | Constant/Dynamic? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **All** | **Role Name** | `promptBuilder.ts` (`buildDynamicRoleName`) | **Dynamic** | Composed of Domain + Metric + Archetype. |
| **All** | **Context Boilerplate** | `promptBuilder.ts` (`buildSystemPrompt`) | Constant | "Use ONLY patient_payload..." |
| `signal_enrichment` | Core Instruction | `prompts/signalEnrichment.ts` | **Dynamic** | Varies by `risk_factors` and `archetype`. |
| `signal_enrichment` | Signal Groups | `prompts/signalEnrichment.ts` | **Dynamic** | Pulled from `metric.signal_groups`. |
| `event_summary` | Examples | `prompts/eventSummary.ts` | Constant | Hardcoded "Good vs Bad" text. |
| `summary_20_80` | Rules | `prompts/summary2080.ts` | Constant | "Use ONLY 20% of facts..." |
| `followup_questions` | Hints | `prompts/followupQuestions.ts` | **Dynamic** | Pulled from `metric.review_questions`. |

## 2. Prompt Registry Schema (Inferred)

| Field Name | Description | Example Value | Source in Code | Required? |
| :--- | :--- | :--- | :--- | :--- |
| `prompt_id` | Unique key | `signal_enrichment_v1` | N/A (implied) | Y |
| `task_type` | Links to planner | `signal_enrichment` | `S5_TaskExecution.ts` | Y |
| `base_role_template` | Role string template | `Clinical Signal Extractor for {{metric_name}}` | `promptBuilder.ts` | Y |
| `system_instruction` | Main static text | `Analyze the encounter...` | `prompts/*.ts` | Y |
| `few_shot_examples` | Good/Bad examples | `[{ input: "...", output: "..." }]` | `prompts/eventSummary.ts` | N |
| `required_vars` | List of dynamic inputs | `["risk_factors", "signal_groups"]` | `prompts/*.ts` | Y |
| `output_schema_ref` | JSON Schema ID | `signalEnrichmentSchema` | `S5_TaskExecution.ts` | Y |

## 3. Logic vs Data Separation

| Item Type | Example | Stay in Code vs Move to Config | Risk if Mis-classified |
| :--- | :--- | :--- | :--- |
| **Data** | "Good Example: Patient arrived at 14:00..." | **Move to Config**. It's static content. | Low |
| **Logic** | `if (archetype === 'Process_Auditor') ...` | **Stay in Code** (mostly). Complex conditional logic is hard to express in JSON. | High (Spaghetti JSON) |
| **Data** | `signal_groups` list | **Move to Config** (Metric Def). It's purely declarative. | Low |
| **Logic** | `buildMetricContextString` formatting | **Stay in Code**. It's a utility formatter. | Low |

## 4. Summary

*   **Minimum Viable Registry:** Needs to store the **template text** (with `{{handlebars}}` style placeholders) and the **variable map** required to fill it.
*   **The Hard Part:** The archetype-specific switching logic inside `signalEnrichment.ts` (the `if/else` blocks for priorities) is currently "Code". To move this to "Config", the Prompt Registry would need to support **variant lookups** (e.g., `prompt_id: signal_enrichment_process_auditor`).
*   **Recommendation:** Flatten the polymorphism. Instead of one big `signal_enrichment` prompt with `if` statements, create specific prompt entries for `signal_enrichment.process_auditor`, `signal_enrichment.preventability`, etc., and select the ID dynamically in the code.
