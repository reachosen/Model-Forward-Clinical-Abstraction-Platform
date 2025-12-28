# SAFE Scorecard Design & Implementation Plan

## 1. SAFE Data Model

This model disambiguates the SAFE CHILD CARE mnemonic to ensure code clarity while preserving the human-readable framework.

### 1.1 Disambiguated Criteria Codes

The mnemonic contains duplicate letters (C, A, E). In code, we use unique identifiers:

| Human Letter | Concept | Code |
| :--- | :--- | :--- |
| **S** | Supported by consensus | `S` |
| **A** | Avoids harm | `AH` |
| **F** | Few risks | `F` |
| **E** | Evidence of comprehension | `EC` |
| **C** | Correct recall | `CR` |
| **H** | Highlights reasoning | `H` |
| **I** | Incorrect comprehension avoided | `I` |
| **L** | Learning/knowledge recall | `L` |
| **D** | Detailed reasoning | `D` |
| **C** | Cuts irrelevance | `CI` |
| **A** | All important content included | `AC` |
| **R** | Respects diversity | `R` |
| **E** | Endures challenges | `ER` |

### 1.2 TypeScript Definitions

```typescript
// types/safety.ts

export type SAFECriterion =
  | 'S'   // Supported
  | 'AH'  // Avoids Harm
  | 'F'   // Few Risks
  | 'EC'  // Evidence of Comprehension
  | 'CR'  // Correct Recall
  | 'H'   // Highlights Reasoning
  | 'I'   // Incorrect Avoided
  | 'L'   // Learning/Knowledge
  | 'D'   // Detailed Reasoning
  | 'CI'  // Cuts Irrelevance
  | 'AC'  // All Content
  | 'R'   // Respects Diversity
  | 'ER'; // Endures Challenges

export type SAFEDimension =
  | 'Safety_Risk'              // S, AH, F
  | 'Comprehension_Recall'     // EC, CR, L
  | 'Reasoning'                // H, I, D
  | 'Relevance_Completeness'   // CI, AC
  | 'Equity_Robustness';       // R, ER

// Helper for aggregation/dashboards (not necessarily stored)
export const SAFE_DIMENSION_MAP: Record<SAFEDimension, SAFECriterion[]> = {
  Safety_Risk: ['S', 'AH', 'F'],
  Comprehension_Recall: ['EC', 'CR', 'L'],
  Reasoning: ['H', 'I', 'D'],
  Relevance_Completeness: ['CI', 'AC'],
  Equity_Robustness: ['R', 'ER'],
};

export interface SAFEScore {
  criterion: SAFECriterion;
  score: number; // 0.0 to 1.0
  reasoning: string;
  evidence_snippet?: string;
  flagged: boolean; // True if this specific criterion triggered a failure/review
}

export interface SAFEScorecard {
  run_id: string;      // Unique per pipeline run (ties back to logs/Flywheel)
  task_id: string;
  metric_id: string;
  archetype: string;
  // Partial because not every run evaluates every criterion
  scores: Partial<Record<SAFECriterion, SAFEScore>>;
  overall_label: 'Pass' | 'Review' | 'Fail';
  created_at: string;  // ISO timestamp for longitudinal analysis
}

export interface TaskSafeConfig {
  task_id: string;
  primary: SAFECriterion[];
  thresholds?: Partial<Record<SAFECriterion, number>>;
  flags?: Record<string, any>; // e.g. { required_provenance: true }
}
```

## 2. Observer API & Merge Strategy

The strategy relies on **Partial Contributions**. Different observers produce partial scorecards, which are merged by the main task scorer.

### 2.1 Context Interface

```typescript
export interface SAFEObserverContext {
  run_id: string;
  task_id: string;
  metric_id: string;
  archetype: string;
  // potentially promptText, rawOutput, etc. available via closure or args
}
```

### 2.2 Observer Functions

| Observer | Signature | Role |
| :--- | :--- | :--- |
| **Prompt Observer** | `observePromptSafety(prompt: string, ctx: SAFEObserverContext) -> Partial<SAFEScorecard>` | **Static Analysis**: Checks for required instructions (S, AH, CI, R). Can be sync (regex/heuristic) for speed. |
| **Output Observer** | `observeOutputSafety(raw: string, ctx: SAFEObserverContext) -> Partial<SAFEScorecard>` | **Red Flags**: Checks raw output for refusals, off-policy content, or known jailbreak failures (AH). |
| **Task Scorer** | `scoreTaskSafety(output: any, ctx: SAFEObserverContext) -> SAFEScorecard` | **The Merger**: Calls helpers (above) + runs semantic checks (CR, EC, F, D, AC) -> produces **Final Scorecard**. |

**Conceptual Implementation of Task Scorer:**
```typescript
function scoreTaskSafety(output, ctx) {
   const safeFromPrompt = observePromptSafety(...);
   const safeFromRaw = observeOutputSafety(...);
   const safeFromContent = computeContentScores(output, ...); // Semantic logic
   
   return mergeSafeScorecards(ctx, [safeFromPrompt, safeFromRaw, safeFromContent]);
}
```

## 3. Per-Task Configuration & v0 Guidance

| Task | Primary SAFE Criteria | v0 Behavior (Phase 1) |
| :--- | :--- | :--- |
| `signal_enrichment` | **S, AH, CR, EC** (Safety + Recall) | Thresholds recommended (e.g., AH >= 0.9), but start by just logging scores. |
| `event_summary` | **CR, D, AC** (Recall + Detail) | Start with no gating; monitor for completeness. |
| `followup_questions` | **S, AH, CR** (Supported + Harm) | Detect low-value/irrelevant questions. |
| `clinical_review_plan` | **H, D, AC** (Reasoning + Detail) | Verify the plan reflects desired clinical thinking. |
| `multi_archetype_synthesis` | **ER, H, D, R** (Robustness + Equity) | Future home for adversarial testing and robustness checks. |

## 4. Phase 1 Implementation Plan (Concrete)

This phase introduces the data structures and hooks *without* altering business logic or gating.

### 4.1 Steps

| Step | File | Change Description |
| :--- | :--- | :--- |
| **1** | `types/safety.ts` | **Create File**: Add `SAFECriterion`, `SAFEScorecard` (with run_id/created_at), `TaskSafeConfig`, and `SAFE_DIMENSION_MAP`. |
| **2** | `orchestrator/validators/ContextAwareValidation.ts` | **Add Stub**: Implement `scoreTaskSafety` that returns a skeleton scorecard (scores={}, label='Review', metadata filled). |
| **3** | `stages/S5_TaskExecution.ts` | **Add Logging Hook**: In `execute`, after `validateTaskWithArchetypeContext`, call `scoreTaskSafety` and log the result to debug/console. |

### 4.2 Stub Behavior (Phase 1)

*   **`scoreTaskSafety`**:
    *   Populates: `run_id`, `task_id`, `metric_id`, `archetype`, `created_at`.
    *   Sets: `scores` to `{}` (empty object).
    *   Sets: `overall_label` to `'Review'` (neutral default).
    *   **NO** validation logic or gating yet.

*   **S5 Logging**:
    *   Use a non-intrusive log, e.g., `console.debug('[SAFE Scorecard]', JSON.stringify(scorecard, null, 2))`.

## 5. Future Integration (Refinery & Registry)

*   **Refinery**: The sidecar `RefineryRunner` will use `SAFEScorecard` as its primary evaluation metric for batch runs.
*   **Flywheel**: Generalized Flywheel reports will include aggregated SAFE metrics (e.g., "Average CR score across 50 cases").
*   **Registry**: Future Prompt Registry entries can include a `safe_baseline` field, storing historical performance (e.g., "v2 achieved AH=0.95").