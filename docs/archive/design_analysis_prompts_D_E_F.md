# Prompt D – SAFE Scorecard Data Model & API

## 1. Type Model

| Type Name | Fields | Description | Where It Would Be Stored/Used |
| :--- | :--- | :--- | :--- |
| `SAFECriterion` | `'S' \| 'A' \| 'F' \| 'E' \| 'C' \| 'H' \| 'I' \| 'L' \| 'D' \| 'R'` | The union of all SAFE CHILD CARE letters. | `types/safety.ts` |
| `SAFEDimension` | `'Safety_Risk' \| 'Comprehension_Recall' \| 'Reasoning' \| 'Relevance_Completeness' \| 'Equity_Robustness'` | Grouping of letters for higher-level reporting. | `types/safety.ts` |
| `SAFEScore` | `criterion: SAFECriterion`<br>`score: number` (0-1)<br>`reasoning: string`<br>`evidence_snippet?: string`<br>`flagged: boolean` | The score for a single letter, with explanation. | `types/safety.ts` |
| `SAFEScorecard` | `task_id: string`<br>`metric_id: string`<br>`archetype: string`<br>`scores: Record<SAFECriterion, SAFEScore>`<br>`overall_label: 'Pass' \| 'Review' \| 'Fail'` | The full safety report for one task execution. | `TaskOutput.validation` in `PlannerPlan.ts` |

## 2. Observer Function Signatures

| Choke Point (file:fn) | Observer Function Signature | SAFE Dimensions Covered | Inputs Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `S5_TaskExecution.loadPromptTemplate` | `observePromptSafety(promptText: string, context: PromptContext): Promise<Partial<SAFEScorecard>>` | **S** (Supported), **R** (Respects Diversity), **A** (Avoids Harm) | `promptText`, `context.domain`, `context.archetype` | Static analysis of the prompt itself (e.g., checking for specific safety instructions). |
| `S5_TaskExecution.callLLM` | `observeOutputSafety(rawResponse: string, taskType: string): Promise<Partial<SAFEScorecard>>` | **A** (Avoids Harm), **I** (Incorrect Avoided) | `rawResponse` | Checks for refusals, off-policy content, or obvious hallucinations before parsing. |
| `validateTaskWithArchetypeContext` | `scoreTaskSafety(output: any, task: TaskType, archetype: ArchetypeType): SAFEScorecard` | **F** (Few Risks), **E** (Evidence), **C** (Correctness), **D** (Detailed), **H** (Highlights) | `output`, `task`, `archetype` | The primary scoring logic. Calculates the final scorecard based on structured output. |

## 3. S5 Task SAFE Configuration

| Task | Primary SAFE Criteria | Example TaskSafeConfig | Evidence from Current Prompts/Validators |
| :--- | :--- | :--- | :--- |
| `signal_enrichment` | **S, A, C, E** | `{ task_id: 'signal_enrichment', primary: ['S','A','C','E'], required_provenance: true }` | Prompt requires "verbatim text" (C, E) and "DO NOT invent" (A). |
| `event_summary` | **C, A, D** | `{ task_id: 'event_summary', primary: ['C','A','D'], timeline_check: true }` | Prompt asks for "factual, timeline-focused" summary (C, D). |
| `followup_questions` | **S, A, C** | `{ task_id: 'followup_questions', primary: ['S','A','C'], forbidden_topics: ['policy'] }` | Prompt forbids "general policies" (C) and "abstract best practices" (S). |
| `clinical_review_plan` | **H, D, C** | `{ task_id: 'clinical_review_plan', primary: ['H','D','C'], logic_check: 'root_cause' }` | Prompt asks for "concerns_or_flags" (H) and "key_factors" (D). |
| `multi_archetype_synthesis` | **E, H, D, R** | `{ task_id: 'multi_archetype_synthesis', primary: ['E','H','D','R'], cove_mode: true }` | CoVE loop explicitly targets Robustness (E) and Rationale (H). |

## 4. Summary

*   **Centralize in `validateTaskWithArchetypeContext`:** Use this for all **semantic** checks (checking the *content* of the output against clinical rules). This is where the bulk of scoring happens.
*   **Prompt-Level Checks:** Use `observePromptSafety` for **instructional** checks (ensuring the prompt *asks* for safety). Ideally, this is done at design time or in CI/CD, but can be a runtime check for dynamic prompts.
*   **Flywheel/Batch-Level:** Use for **statistical** checks (R - Equity, E - Robustness). Single-shot execution can't easily measure bias or consistency; that requires a batch of cases.

---

# Prompt E – Prompt Refinery Factory Skeleton

## 1. Module Structure

| Module Path | File Name | Responsibility | Upstream Dependencies | Downstream Consumers |
| :--- | :--- | :--- | :--- | :--- |
| `refinery/config` | `definitions.ts` | Types for RefineryRunConfig, CandidatePrompt | `models/PlannerPlan` | `refinery/runners` |
| `refinery/runners` | `RefineryRunner.ts` | Orchestrates a refinement loop (Load Data -> Run -> Eval) | `S5_TaskExecution`, `flywheel/dataset` | CLI, API |
| `refinery/evaluators` | `SAFEEvaluator.ts` | Implements SAFE scoring logic (the "Scorecard" from Prompt D) | `ContextAwareValidation` | `RefineryRunner` |
| `refinery/adapters` | `S5Adapter.ts` | Wraps `S5_TaskExecution` to run a single task in isolation | `S5_TaskExecution` | `RefineryRunner` |
| `refinery/reports` | `ReportGenerator.ts` | Aggregates scores into a readable report | `types` | `RefineryRunner` |

## 2. Core Refinery Runner API

```typescript
// refinery/config/definitions.ts

export interface RefineryCandidate {
  id: string;
  task_type: string;
  prompt_template: string; // The candidate text
  version_label: string;
}

export interface RefineryRunConfig {
  run_id: string;
  metric_id: string;
  task_type: string;
  dataset_id: string; // ID of a golden set file
  candidate: RefineryCandidate;
  sample_size?: number;
}

export interface RefineryReport {
  run_id: string;
  overall_score: number;
  safe_scorecard: SAFEScorecard; // Aggregated
  passed_cases: number;
  failed_cases: number;
  details: {
    case_id: string;
    output: any;
    scorecard: SAFEScorecard;
  }[];
}

// refinery/runners/RefineryRunner.ts
export class RefineryRunner {
  constructor(
    private s5Adapter: S5Adapter,
    private datasetLoader: DatasetLoader,
    private evaluator: SAFEEvaluator
  ) {}

  async run(config: RefineryRunConfig): Promise<RefineryReport>;
}
```

## 3. Reuse Strategy

| Existing Component (file:fn) | Refinery Role | How It Would Be Called | Parameters |
| :--- | :--- | :--- | :--- |
| `S5_TaskExecution.callLLM` | **LLM Adapter** | Wrapped by `S5Adapter` to execute the candidate prompt. | `prompt`, `schema`, `model` |
| `flywheel/dataset/core.ts` | **Dataset Provider** | `DatasetLoader` uses it to load test cases (needs generalization from I25). | `metric_id` |
| `ContextAwareValidation.validate...` | **Validator Base** | `SAFEEvaluator` calls it for the "F" (Risk) and "C" (Correctness) scores. | `task`, `archetype`, `output` |
| `promptBuilder.buildMetricContextString` | **Context Builder** | `S5Adapter` uses it to prep the system prompt. | `packet` |

## 4. End-to-End Refinement Flow

1.  **Configure:** User defines a `RefineryRunConfig` (e.g., "Test `signal_enrichment` v2 on I25 Golden Set").
2.  **Load Data:** `RefineryRunner` calls `DatasetLoader` to get `TestCase[]` (standardized format).
3.  **Prepare Task:** `S5Adapter` hydrates the candidate prompt with `metric_context` from the dataset.
4.  **Execute:** For each case, `S5Adapter` calls `callLLM` -> `parse`.
5.  **Evaluate:** `SAFEEvaluator` runs:
    *   Structural checks (Schema)
    *   Semantic checks (`validateTaskWith...`)
    *   SAFE Scorecard calculation
6.  **Aggregate:** `ReportGenerator` compiles individual scorecards into a `RefineryReport`.
7.  **Review:** Report is saved; if scores > threshold, prompt can be marked for promotion.

---

# Prompt F – Migration & Implementation Checklist

## 1. Categorized Changes

| Category | Change Item | Target Files | Short Description | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Quick-Win** | **Extract Prompts** | `prompts/*.ts`, `config/prompts.json` | Move hardcoded prompt text into a JSON registry file. | None |
| **Quick-Win** | **Add Safety Hooks** | `S5_TaskExecution.ts` | Add empty observer hooks (`observePrompt`, `observeOutput`) to choke points. | None |
| **Medium** | **SAFE Types** | `types/safety.ts` | Define `SAFEScorecard`, `SAFECriterion` types. | None |
| **Medium** | **Refinery Module** | `refinery/` | Create the basic scaffold (`Runner`, `Config`) defined in Prompt E. | SAFE Types |
| **Deep** | **Generic Flywheel** | `flywheel/dataset/core.ts` | Refactor generation to take `MetricConfig` instead of hardcoded I25. | None |
| **Deep** | **SAFE Evaluator** | `refinery/evaluators/SAFE` | Implement the full scoring logic using `ContextAwareValidation`. | SAFE Types, Safety Hooks |

## 2. PR Roadmap

| Change Item | Recommended PR Size | Suggested Tests | Risk Profile |
| :--- | :--- | :--- | :--- |
| **1. SAFE Types & Hooks** | **S** | Unit tests for `observe` functions (mocked). | Low |
| **2. Extract Prompts to Registry** | **M** | Regression test: Run batch runner, ensure outputs match previous. | Med |
| **3. Refinery Skeleton** | **M** | Unit test `RefineryRunner` with mock adapter. | Low |
| **4. Generalize Dataset Gen** | **L** | Test generating cases for I25 AND a new metric (e.g., I32b). | High |
| **5. Connect Evaluator** | **L** | Integration test: Run Refinery on 10 cases, verify Scorecard output. | Med |

## 3. Priority Order

| Priority | Change Item | Reason It Must Come Early |
| :--- | :--- | :--- |
| **1** | **SAFE Types & Hooks** | Establishes the "language" for quality across the system. Low risk, high value. |
| **2** | **Extract Prompts** | Prerequisite for "Refinery" to be useful (swapping prompts requires them to be data). |
| **3** | **Refinery Skeleton** | Builds the tool that will allow us to iterate on the Deep features (Generalization). |

## 4. Summary

*   **First Move:** Define `types/safety.ts` and add the `observe*` hooks to `S5_TaskExecution`. This is non-breaking and sets the stage.
*   **Key Enabler:** Extracting prompts to JSON is crucial. Without it, the Refinery can't easily "inject" candidate prompts.
*   **Scope limit:** Keep **Adversarial Generation** out of v1. Focus on validating *existing* golden sets first. Generalizing the Flywheel to create *new* data for *any* metric is a heavy lift (Deep) and can wait until the basic scoring loop works.
