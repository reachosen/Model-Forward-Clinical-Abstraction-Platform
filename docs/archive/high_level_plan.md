# High-level plan for the next coding-LLM runs

## P1 – SAFE CHILD CARE Audit (Task-by-Task)

This audit evaluates the current prompts and validators against the **SAFE CHILD CARE** framework to identify safety and quality gaps.

### 1. Task: signal_enrichment
**File:** `orchestrator/prompts/signalEnrichment.ts`
**Validator:** `orchestrator/validators/ContextAwareValidation.ts`

| SAFE Letter | Criterion | Addressed? | Evidence Location | Risk if Missing | Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S** | Supported by Consensus | Implicit | Prompt: "Use definitions from metric_context" | Med | Relies on external `metric_context` being correct. |
| **A** | Avoids Harm | **Explicit** | Prompt: "DO NOT invent facts... timestamps... symptoms" | High | Strong instruction against hallucination. |
| **F** | Few Risks | Implicit | Validator: Checks `evidence_type` presence. | Med | No explicit "risk check" in prompt, but validation helps. |
| **E** | Evidence of Comprehension | **Explicit** | Prompt: "Every signal MUST have provenance" | High | Critical for verification. |
| **C** | Correct Recall | **Explicit** | Prompt: "Use ONLY patient_payload" | High | Enforced by provenance requirement. |
| **H** | Highlights Reasoning | No | N/A | Low | Extraction task, not reasoning. |
| **I** | Incorrect Comprehension Avoided | Implicit | Prompt: "Do NOT extract unrelated findings" | Med | filtered by "relevant to metric". |
| **L** | Learning/Knowledge Accurate | No | Prompt: "DO NOT use guidelines... teaching" | Low | Deliberately suppressed to focus on facts. |
| **D** | Detailed Reasoning | No | N/A | Low | Not a reasoning task. |
| **C** | Cuts Irrelevance | **Explicit** | Prompt: "Prefer fewer high-yield signals" | Med | Focus on signal-to-noise ratio. |
| **A** | All Important Content | Implicit | Prompt: "Extract signals that help answer: {review_questions}" | High | Depends on `review_questions` quality. |
| **R** | Respects Diversity | No | N/A | Med | No explicit bias instruction. |
| **E** | Endures Challenges | No | N/A | High | No "adversarial" or "trick" handling mentioned. |

**Summary:**
*   **Strengths:** Strong safeguards against hallucination (A, C, E) via strict "provenance" and "patient_payload only" rules.
*   **Weaknesses:** Zero mention of bias/diversity (R) or adversarial robustness (E).

---

### 2. Task: event_summary
**File:** `orchestrator/prompts/eventSummary.ts`

| SAFE Letter | Criterion | Addressed? | Evidence Location | Risk if Missing | Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Avoids Harm | **Explicit** | Prompt: "BAD EXAMPLE... Too generic, lecturing" | Med | Prevents misleading generalizations. |
| **C** | Correct Recall | **Explicit** | Prompt: "Fact-based, metric-focused" | High | Timeline accuracy is critical. |
| **D** | Detailed Reasoning | Implicit | Prompt: "Structure the narrative chronologically" | Med | Structure aids reasoning. |
| **C** | Cuts Irrelevance | **Explicit** | Prompt: "Focus on events directly relevant to the metric" | Med | prevents "note bloat". |

**Summary:**
*   **Strengths:** Good "Good vs Bad" examples to guide style and focus.
*   **Weaknesses:** Lacks explicit "Unknown/Missing" handling (I) – if data is missing, will it guess?

---

### 3. Task: followup_questions
**File:** `orchestrator/prompts/followupQuestions.ts`

| SAFE Letter | Criterion | Addressed? | Evidence Location | Risk if Missing | Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S** | Supported by Consensus | **Explicit** | Prompt: "Do NOT ask about abstract 'best practices'" | Med | Forces case-specifics over general theory. |
| **A** | Avoids Harm | Implicit | Prompt: "Focus on what is missing, unclear..." | Med | Identifying gaps prevents harm. |
| **C** | Cuts Irrelevance | **Explicit** | Prompt: "Do NOT ask about general policies" | Low | Reduces reviewer cognitive load. |
| **E** | Endures Challenges | No | N/A | Med | Could be tricked by conflicting notes. |

**Summary:**
*   **Strengths:** Excellent negative constraints ("Do NOT ask about...").
*   **Weaknesses:** No explicit safety check (e.g., "Don't ask questions that imply a wrong diagnosis").

---

### 4. Task: clinical_review_plan
**File:** `orchestrator/prompts/clinicalReviewPlan.ts`

| SAFE Letter | Criterion | Addressed? | Evidence Location | Risk if Missing | Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D** | Detailed Reasoning | **Explicit** | Prompt: "metric_alignment... key_factors... concerns_or_flags" | High | Forces structured clinical thinking. |
| **I** | Incorrect Comprehension Avoided | **Explicit** | Prompt: "If payload does not contain enough info, explicitly mark it" | High | Critical for preventing false certainty. |
| **C** | Cuts Irrelevance | **Explicit** | Prompt: "Keep the tone clinical, factual, terse" | Low | Style enforcement. |

**Summary:**
*   **Strengths:** Explicit instruction to handle missing info ("documentation unclear"), aligning with (I).
*   **Weaknesses:** No explicit bias check (R).

---

### 5. Task: multi_archetype_synthesis
**File:** `orchestrator/prompts/multiArchetypeSynthesis.ts`

| SAFE Letter | Criterion | Addressed? | Evidence Location | Risk if Missing | Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E** | Endures Challenges | **Explicit** | Prompt (Verify): "REMOVE any unsupported or speculative content" | High | **CoVE** pattern explicitly targets robustness. |
| **S** | Supported by Consensus | Implicit | Prompt: "Consider ranking benchmarks" | Med | Brings in external standards. |
| **H** | Highlights Reasoning | **Explicit** | Prompt: "synthesis_rationale" field | High | Explains *why* the call was made. |
| **R** | Respects Diversity | No | N/A | Med | No bias check in synthesis. |

**Summary:**
*   **Strengths:** The **Draft -> Verify** loop is a major safety feature (E), explicitly acting as a hallucination filter.
*   **Weaknesses:** Relies entirely on upstream lanes being correct; no independent "sanity check" against raw text in synthesis.

---

## P2 – Generic Flywheel & Batch Evaluator Map

Analysis of how to generalize the current `I25`-specific Flywheel.

### 1. Current Coupling

| Assumption | File/Function | Type | How Strongly Coupled? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Concern ID "I25"** | `dataset/core.ts` (`buildSystemPrompt`) | Metric-specific | **Hardcoded** | Prompt explicitly mentions "I25", "Supracondylar Humerus". |
| **Archetypes** | `dataset/core.ts` | Domain-specific | **Hardcoded** | Lists specific archetypes (Process_Auditor, etc.) in text. |
| **Filename Pattern** | `validation/runner.ts` (`run`) | Config-specific | **Hardcoded** | `/(I25_batch_\d+|golden_set)\.json$/` |
| **Signal Groups** | `validation/checks.ts` (`validateSignals`) | Task-specific | Inferred | Assumes `must_find_signals` structure exists in expectations. |

### 2. Potential Abstractions

| Potential Abstraction | Current Name/File | What It Encapsulates | What Must Be Parameterized |
| :--- | :--- | :--- | :--- |
| **ScenarioGenerator** | `dataset/core.ts` | LLM call to create cases | `SystemPrompt` (template), `ConcernDef`, `ArchetypeList` |
| **BatchLoader** | `validation/runner.ts` | File reading & parsing | `FilePattern`, `DataDir` |
| **TaskValidator** | `validation/checks.ts` | Logic to score outputs | `ExpectationSchema` (signals vs summary vs questions) |
| **FlywheelLoop** | `optimizer/loop.ts` | Iterative refinement logic | `ConcernID`, `TaskID`, `BaselinePrompt`, `ValidationFn` |

### 3. Batch Evaluator Behavior

| Evaluator Component | File/Function | Input | Output | Task-Agnostic? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Signal Recall** | `checks.ts` (`validateSignals`) | Output Signals, Expectation Strings | Recall % | **Yes** | Just string matching; logic is generic. |
| **Summary Coverage** | `checks.ts` (`validateSummary`) | Output Summary, Required Phrases | Coverage % | **Yes** | Generic phrase matching. |
| **Structure Check** | `checks.ts` (`validateStructural`) | Output JSON | Pass/Fail | No | Hardcoded field checks (`signals`, `summary`). Needs Schema-based check. |

### 4. Generalization Gaps

| Needed Parameter | Where to Plug In | Currently Hardcoded To | Impact if Not Generalized |
| :--- | :--- | :--- | :--- |
| **Metric Definition** | `dataset/core.ts` | I25 System Prompt text | **High** (Cannot generate cases for other metrics) |
| **Validation Schema** | `validation/checks.ts` | `signals`, `summary` fields | **High** (Cannot validate other task outputs) |
| **Golden Set Path** | `optimizer/loop.ts` | `flywheel/testcases/golden_set.json` | **Med** (Must manually move files to test others) |

---

## P3 – Prompt Registry & Config Separation Map

Map of moving prompts from TS code to a structured registry.

### 1. Prompt Inventory

| Task | Prompt Identifier | File | Dynamic Inputs | Metric-Specific? | Domain-Specific? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **signal_enrichment** | `getSignalEnrichmentCoreBody` | `prompts/signalEnrichment.ts` | `risk_factors`, `review_questions`, `signal_groups` | **Yes** | **Yes** |
| **event_summary** | `getEventSummaryCoreBody` | `prompts/eventSummary.ts` | `metric_name`, `ranking_context` | **Yes** | No |
| **summary_20_80** | `getSummary2080CoreBody` | `prompts/summary2080.ts` | `signal_groups`, `ranking_context` | **Yes** | No |
| **followup_questions** | `getFollowupQuestionsCoreBody` | `prompts/followupQuestions.ts` | `signal_groups`, `review_questions` | **Yes** | No |
| **clinical_review_plan** | `getClinicalReviewPlanCoreBody` | `prompts/clinicalReviewPlan.ts` | `clinical_focus`, `metric_name` | **Yes** | No |

### 2. Existing "Registry-like" Structures

| Registry-Like Item | File | Maps | Relation to Prompts |
| :--- | :--- | :--- | :--- |
| **ConcernRegistry** | `config/concern-registry.json` | `concern_id` → `domain`, `archetype` | Determines which `metric_context` is loaded. |
| **PromptBuilder** | `utils/promptBuilder.ts` | `task_type` → `RoleName` | Constructs the "System" part of the prompt dynamically. |

### 3. Minimal Prompt Registry Schema (Proposed)

| Field Name | Example Value | Source in Current Code | Used By | Required? |
| :--- | :--- | :--- | :--- | :--- |
| `task_id` | "signal_enrichment" | `S5_TaskExecution.ts` | Planner | Y |
| `template_version` | "1.0.0" | (Implicit in git) | Optimizer | Y |
| `role_template` | "Clinical Signal Extractor for {{metric}}" | `promptBuilder.ts` | Prompt Construction | Y |
| `core_instruction` | "Extract signals... rules:..." | `prompts/*.ts` | Prompt Construction | Y |
| `dynamic_vars` | `["risk_factors", "signal_groups"]` | `prompts/*.ts` logic | Prompt Construction | N |
| `safety_constraints` | `["no_hallucination", "patient_payload_only"]` | (Embedded in text) | Safety Checks | N |

### 4. Separation Gaps

| Coupling Type | Example | How It Limits Externalization | Risk Level |
| :--- | :--- | :--- | :--- |
| **Logic-in-Prompt** | `signalEnrichment.ts` (conditional `if archetype === ...`) | Logic must be replicated in template engine (e.g., Handlebars/Jinja). | **High** |
| **Hardcoded Function Calls** | `S5_TaskExecution` calls `getSignalEnrichmentCoreBody` | Prevents hot-swapping prompt text without code deploy. | **High** |

---

## P4 – Factory Hook Points & Observability

Where to plug in the Refinery Factory.

### 1. Pipeline Map

| Stage | File | Inputs | Outputs | Downstream |
| :--- | :--- | :--- | :--- | :--- |
| **S0** | `S0_InputNormalization` | Raw JSON | `PlanningInput` | S1 |
| **S1** | `S1_DomainResolution` | `PlanningInput` | `DomainContext` | S2 |
| **S2** | `S2_StructuralSkeleton` | `DomainContext` | `StructuralSkeleton` | S3 |
| **S3** | `S3_TaskGraphID` | `Skeleton` | `TaskGraph` | S4 |
| **S4** | `S4_PromptPlanGen` | `TaskGraph` | `PromptPlan` | **S5** |
| **S5** | `S5_TaskExecution` | `PromptPlan` | `TaskExecutionResults` | S6 |

### 2. Task Execution Hook Points (S5)

| Task | Hook Type | File/Function | Inputs | Outputs | Comments |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **All** | **Prompt Build** | `S5_TaskExecution.ts` -> `loadPromptTemplate` | `context`, `task_type` | `Final Prompt String` | Best place to inject "Candidate Prompts" from Refinery. |
| **All** | **LLM Call** | `S5_TaskExecution.ts` -> `callLLM` | `prompt`, `model`, `params` | `Raw Response` | Central point for logging cost/latency. |
| **All** | **Parse** | `S5_TaskExecution.ts` -> `parse*` | `Raw Response` | `Typed Object` | Catch JSON errors here. |
| **All** | **Validate** | `S5_TaskExecution.ts` -> `validateTaskWithArchetypeContext` | `Typed Object`, `Context` | `ValidationResult` | **Critical Hook**: Failed validation = Feedback signal for Refinery. |

### 3. Observability Opportunities

| Hook Point | What Can Be Logged | Metadata Available | Before/After Validation | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt Build** | The exact system/user prompt used. | `run_id`, `task_id`, `version` | Before | reproducing bugs. |
| **Validation** | `errors`, `warnings`, `pass/fail` | `archetype`, `domain` | After | **Flywheel Scoring** (Did it pass?). |
| **LLM Call** | `tokens_in`, `tokens_out`, `latency` | `model_name` | N/A | Cost tracking. |

### 4. Gaps

| Gap | Location | Impact | What We Cannot Observe |
| :--- | :--- | :--- | :--- |
| **No Event Bus** | `S5_TaskExecution.ts` | Med | Logs go to console; no structured storage for offline analysis. |
| **Swallowed Retries** | `callLLM` (if it retried) | Low | We don't see how many attempts it took to get valid JSON. |
| **Semantic Drift** | `validateTask...` | High | We validate structure, but not "is this clinically accurate" (only Flywheel does that offline). |
