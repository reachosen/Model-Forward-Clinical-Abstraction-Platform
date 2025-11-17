# CA FACTORY IMPLEMENTATION PLAN - ADDENDUM
## Critical Refinements for Ask Panel / Interrogation Support

**Date:** 2025-01-17
**Purpose:** Address gaps identified in the base implementation plan to ensure proper support for Ask-the-Case Panel / interrogation tasks

---

## §1: CONCEPT → CODE MAPPING REFINEMENTS

### Additional Mappings for Ask Panel / Interrogation

| Concept | Current Location | Where It Will Plug Into | Notes |
|---------|------------------|------------------------|-------|
| **Ask Panel Interrogation Tasks** | `components/AskTheCasePanel.tsx` (lines 1-327) | **NEW:** Task-aware `/v1/task/{task_id}/ask` endpoint OR extend `/v1/case/{patient_id}/ask` to accept task context | Currently calls generic Q&A, needs task routing |
| **Explain Task** | ❌ Not distinguished | **NEW:** `clabsi.abstraction.explain` sub-task OR `mode: "explain"` parameter | Generate explanatory narrative for criteria/signals |
| **Summarize Task** | ❌ Not distinguished | **NEW:** `clabsi.enrichment.summarize` OR `mode: "summarize"` | Summarize signal groups into key findings |
| **Validate Task** | ❌ Not distinguished | **NEW:** `clabsi.abstraction.validate` OR `mode: "validate"` | Cross-check enrichment + abstraction coherence |
| **Interrogation Context** | ❌ Not tracked | **NEW:** `abstraction.qa_history[]` with per-question `interrogation_context` | What was being interrogated (signal, metric, criterion) |

### Endpoint Routing for Interrogation Types

```
Current:
POST /v1/case/{patient_id}/ask
  → Generic Q&A, no task awareness

Proposed:
POST /v1/case/{patient_id}/ask
  + Query params: ?task_id=clabsi.abstraction&mode=explain&context_type=criterion&context_id=criterion_1

OR (cleaner):
POST /v1/task/clabsi.abstraction/interrogate
  Body: { case_id, mode: "explain", context: { type: "criterion", id: "criterion_1" }, question }

Response includes:
{
  "answer": "...",
  "task_context": {
    "task_id": "clabsi.abstraction",
    "interrogation_mode": "explain",
    "interrogation_context": { "type": "criterion", "id": "criterion_1" }
  }
}
```

**Files to Update:**
- `backend/api/main.py` - Add interrogation routing
- `reference-implementation/react/src/components/AskTheCasePanel.tsx` - Pass interrogation context
- `reference-implementation/react/src/api/cafactory.ts` - New method: `interrogateTask()`

---

## §2: CASE JSON MIGRATION REFINEMENTS

### Explicit Interrogation Context in 4-Section Model

**Problem:** Current plan has `abstraction.qa_history` but no explicit slot for **what was being interrogated**.

**Solution:** Extend `qa_history` entries with `interrogation_context`:

```json
{
  "abstraction": {
    "task_metadata": { ... },
    "narrative": "...",
    "criteria_evaluation": { ... },

    "qa_history": [
      {
        "question": "Why does this meet criterion 1?",
        "answer": "The central line was in place for 5 days...",
        "citations": [ ... ],
        "timestamp": "2024-01-20T14:35:00Z",
        "confidence": 0.92,

        // NEW: Interrogation context
        "interrogation_context": {
          "mode": "explain",              // explain | summarize | validate
          "target_type": "criterion",     // criterion | signal | metric | narrative
          "target_id": "criterion_1",     // ID of what was interrogated
          "target_label": "Central line >2 days",
          "program_type": "HAC",          // HAC | USNWR
          "metric_id": "CLABSI",
          "signal_type": "DEVICE",        // Optional: if interrogating a signal
          "signal_id": null
        },

        "follow_up_suggestions": [
          "What about the other criteria?",
          "Is there alternate evidence?"
        ]
      }
    ]
  }
}
```

**Additional Fields in Enrichment:**

```json
{
  "enrichment": {
    "task_metadata": {
      "task_id": "clabsi.enrichment",
      "program_type": "HAC",       // NEW: HAC | USNWR
      "metric_id": "CLABSI",       // NEW: Which metric
      "supports_interrogation": true  // NEW: Can this be interrogated?
    },
    "summary": {
      "signals_identified": 12,
      "signal_groups_count": 4,

      // NEW: Per-group interrogation support
      "interrogation_support": {
        "DEVICE": { "supports_explain": true, "supports_validate": true },
        "LAB": { "supports_explain": true, "supports_validate": true },
        "VITAL": { "supports_explain": true, "supports_validate": false }
      }
    },
    "signal_groups": [ ... ]
  }
}
```

**Files to Update:**
- `backend/data/mock/cases/PAT-*.json` - Add interrogation_context to qa_history examples
- `backend/ca_factory/adapters/case_adapter.py` - Generate interrogation metadata
- `reference-implementation/react/src/types/index.ts` - Add InterrogationContext type

---

## §3: API CHANGES REFINEMENTS

### Dedicated Interrogation Endpoint

**Problem:** Current plan adds `/api/demo/enrich`, `/abstract`, `/full` but no explicit interrogation endpoint.

**Solution:** Add `/v1/task/{task_id}/interrogate` alongside existing endpoints.

#### New Endpoint: POST /v1/task/{task_id}/interrogate

**Purpose:** Task-aware interrogation with context about what is being interrogated.

**Request:**
```json
{
  "case_id": "case-001",
  "question": "Why does this meet criterion 1?",
  "mode": "explain",                    // explain | summarize | validate
  "context": {
    "type": "criterion",                // criterion | signal | metric | narrative
    "id": "criterion_1",
    "label": "Central line >2 days",
    "program_type": "HAC",
    "metric_id": "CLABSI",
    "signal_type": "DEVICE",            // Optional
    "signal_id": null                   // Optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "The central line was in place for 5 days (inserted Day 1, event Day 5), which exceeds the >2 day threshold required by NHSN CLABSI criteria.",
    "evidence_citations": [
      {
        "citation_id": "EVT-001",
        "source_type": "CLINICAL_EVENT",
        "excerpt": "PICC line inserted Jan 15, 2024",
        "relevance_score": 0.98
      }
    ],
    "confidence": 0.92,
    "follow_up_suggestions": [
      "What about the other CLABSI criteria?",
      "Is there evidence of alternate infection sources?"
    ]
  },
  "task_context": {
    "task_id": "clabsi.abstraction",
    "task_type": "abstraction",
    "concern_id": "clabsi",
    "prompt_version": "v1.0",
    "mode": "interactive",
    "executed_at": "2024-01-20T14:35:00Z",

    // NEW: Interrogation metadata
    "interrogation_mode": "explain",
    "interrogation_context": {
      "type": "criterion",
      "id": "criterion_1",
      "label": "Central line >2 days"
    }
  },
  "metadata": { ... }
}
```

**Implementation Location:**
- File: `backend/api/main.py`
- New handler function after line 400 (after existing endpoints)

**CAFactory Changes:**
```python
# In CAFactory
async def interrogate_task(
    self,
    task_id: str,
    case_id: str,
    question: str,
    mode: str,  # explain | summarize | validate
    context: dict
) -> dict:
    """
    Interrogate a specific task with context about what is being interrogated.

    This routes to the appropriate agent based on:
    - task_id: Which task (enrichment, abstraction)
    - mode: What kind of interrogation (explain, summarize, validate)
    - context: What is being interrogated (criterion, signal, metric)
    """
    task = self.task_registry.get_task(task_id)

    # Build interrogation prompt based on mode + context
    interrogation_prompt = self._build_interrogation_prompt(
        question, mode, context, task
    )

    # Execute via appropriate agent
    agent = self._find_agent_for_interrogation(task_id, mode)
    result = await self.agent_manager.execute_agent(
        agent_id=agent.agent_id,
        prompt=interrogation_prompt,
        context=context
    )

    return {
        "answer": result["answer"],
        "evidence_citations": result["citations"],
        "confidence": result["confidence"],
        "follow_up_suggestions": result["follow_ups"],
        "_task_metadata": {
            "interrogation_mode": mode,
            "interrogation_context": context
        }
    }
```

**Files to Create/Modify:**
- `backend/api/main.py` - Add `/v1/task/{task_id}/interrogate` endpoint
- `backend/ca_factory/core/factory.py` - Add `interrogate_task()` method
- `backend/ca_factory/core/interrogation.py` (NEW) - Interrogation prompt builder
- `reference-implementation/react/src/api/cafactory.ts` - Add `interrogateTask()` method

**Tests to Add:**
- `backend/tests/integration/test_interrogation_endpoint.py`
  - `test_interrogate_criterion_explain()`
  - `test_interrogate_signal_summarize()`
  - `test_interrogate_metric_validate()`
  - `test_interrogation_context_in_response()`

---

## §4: UI REFACTOR REFINEMENTS

### Explicit Ask Panel Placement in Pipeline

**Problem:** Current plan adds pipeline stepper and sections, but doesn't clearly allocate a place for Ask Panel per-task.

**Solution:** Add dedicated interrogation panel in each section.

#### Stage B Enhancement: Add Interrogation Panels

**Files to Modify:**
- `reference-implementation/react/src/pages/CaseViewPage.tsx`

**New Structure:**
```typescript
<div id="enrichment" className="section section-enrichment">
  <h2>Section B: Enrichment</h2>

  <TaskMetadataBadge {...enrichmentMetadata} />

  <EnrichmentSummary summary={caseData.enrichment.summary} />

  <SignalsPanel signalGroups={caseData.enrichment.signal_groups} />

  {/* NEW: Per-Section Interrogation Panel */}
  <InterrogationPanel
    taskId="clabsi.enrichment"
    availableModes={["explain", "summarize"]}
    availableTargets={[
      { type: "signal_group", id: "DEVICE", label: "Device signals" },
      { type: "signal_group", id: "LAB", label: "Lab signals" },
      { type: "signal", id: "SIG-001", label: "Temperature spike" }
    ]}
    onAsk={async (question, mode, context) => {
      const response = await api.interrogateTask("clabsi.enrichment", caseId, question, mode, context);
      // Append to qa_history in state
      return response;
    }}
  />
</div>

<div id="abstraction" className="section section-abstraction">
  <h2>Section C: Abstraction & Feedback</h2>

  <TaskMetadataBadge {...abstractionMetadata} />

  <ClinicalNarrative narrative={caseData.abstraction.narrative} />

  <CriteriaEvaluation criteria={caseData.abstraction.criteria_evaluation} />

  {/* NEW: Abstraction Interrogation Panel */}
  <InterrogationPanel
    taskId="clabsi.abstraction"
    availableModes={["explain", "validate"]}
    availableTargets={[
      { type: "criterion", id: "criterion_1", label: "Central line >2 days" },
      { type: "criterion", id: "criterion_2", label: "Positive blood culture" },
      { type: "narrative", id: "narrative", label: "Clinical narrative" }
    ]}
    onAsk={async (question, mode, context) => {
      const response = await api.interrogateTask("clabsi.abstraction", caseId, question, mode, context);
      return response;
    }}
  />

  <QAHistoryDisplay history={caseData.abstraction.qa_history} />

  <FeedbackPanel {...} />
</div>
```

**Files to Create:**
- `reference-implementation/react/src/components/InterrogationPanel.tsx`
- `reference-implementation/react/src/components/QAHistoryDisplay.tsx` (refactor from AskTheCasePanel)

**InterrogationPanel Props:**
```typescript
interface InterrogationPanelProps {
  taskId: string;                    // e.g., "clabsi.enrichment"
  availableModes: string[];          // ["explain", "summarize", "validate"]
  availableTargets: Target[];        // What can be interrogated in this section
  onAsk: (question: string, mode: string, context: InterrogationContext) => Promise<Response>;
  placeholder?: string;
  suggestedQuestions?: string[];
}

interface Target {
  type: 'criterion' | 'signal' | 'signal_group' | 'metric' | 'narrative';
  id: string;
  label: string;
}
```

**UI Features:**
- Mode selector dropdown: Explain | Summarize | Validate
- Target selector: "What are you asking about?" (dropdown of criteria, signals, etc.)
- Question input box
- Q&A history below (filtered to this task only)
- Visual indicator showing interrogation_context for each Q&A entry

**Tests to Add:**
- `reference-implementation/react/src/components/__tests__/InterrogationPanel.test.tsx`
  - `test_shows_mode_selector()`
  - `test_shows_target_selector()`
  - `test_submits_with_interrogation_context()`
  - `test_displays_qa_history_for_task()`

---

## §5: CONFIG REFINEMENTS

### Extended Task Config with Interrogation Metadata

**Problem:** Current task config has `task_id`, `prompt_versions`, `agent_profiles`, but missing metadata for interrogation routing.

**Solution:** Add program/metric/signal metadata to tasks.

**Updated Task Config Structure:**

```json
{
  "concern_id": "clabsi",
  "concern_name": "Central Line-Associated Bloodstream Infection",

  // NEW: Program/Metric context
  "program_type": "HAC",
  "metric_id": "CLABSI",
  "metric_category": "Healthcare-Associated Condition",

  "system_prompt": "...",

  "tasks": [
    {
      "task_id": "clabsi.enrichment",
      "task_type": "enrichment",
      "description": "Extract and structure clinical signals from raw context",

      // NEW: Interrogation support
      "supports_interrogation": true,
      "interrogation_modes": ["explain", "summarize"],

      // NEW: Program/metric context (inherited from concern if not specified)
      "program_type": "HAC",
      "metric_id": "CLABSI",

      // NEW: Signal context
      "signal_types": ["DEVICE", "LAB", "VITAL", "SYMPTOM"],
      "primary_signal_type": "DEVICE",

      "execution_modes": ["batch", "on_demand"],
      "default_mode": "batch",

      "prompt_versions": [
        {
          "version_id": "v1.0",
          "status": "stable",
          "created_at": "2024-01-15",
          "changelog": "Initial CLABSI enrichment prompt",

          // NEW: Mode-specific prompts
          "prompts": {
            "batch": "{{ base_prompt }}",
            "on_demand": "{{ base_prompt }}",
            "explain": "{{ base_prompt }} + Explain the following signal: {context}",
            "summarize": "{{ base_prompt }} + Summarize the signal groups: {context}"
          }
        }
      ],

      "active_version": "v1.0",
      "agent_profiles": ["evidence_retrieval_clabsi_v1", "timeline_analysis_clabsi_v1"],

      // NEW: Interrogation agent mapping
      "interrogation_agents": {
        "explain": "qa_response_clabsi_v1",
        "summarize": "summary_generation_clabsi_v1"
      },

      "expected_inputs": ["patient_context", "clinical_notes", "lab_results"],
      "expected_outputs": ["signal_groups", "enrichment_summary", "timeline_phases"],

      "quality_thresholds": {
        "min_confidence": 0.85,
        "min_signal_coverage": 0.90
      }
    },
    {
      "task_id": "clabsi.abstraction",
      "task_type": "abstraction",
      "description": "Generate clinical narrative and evaluate NHSN criteria",

      // NEW: Interrogation support
      "supports_interrogation": true,
      "interrogation_modes": ["explain", "validate"],

      "program_type": "HAC",
      "metric_id": "CLABSI",

      // NEW: Criteria context
      "criteria_ids": [
        "criterion_1",
        "criterion_2",
        "criterion_3",
        "criterion_4",
        "criterion_5",
        "criterion_6"
      ],

      "execution_modes": ["interactive", "batch"],
      "default_mode": "interactive",

      "prompt_versions": [
        {
          "version_id": "v1.0",
          "status": "stable",
          "prompts": {
            "interactive": "{{ base_prompt }}",
            "batch": "{{ base_prompt }}",
            "explain": "{{ base_prompt }} + Explain why this criterion is met: {context}",
            "validate": "{{ base_prompt }} + Validate coherence between enrichment and abstraction: {context}"
          }
        }
      ],

      "active_version": "v1.0",
      "agent_profiles": [
        "qa_response_clabsi_v1",
        "rule_evaluation_clabsi_v1",
        "summary_generation_clabsi_v1"
      ],

      // NEW: Interrogation agent mapping
      "interrogation_agents": {
        "explain": "qa_response_clabsi_v1",
        "validate": "rule_evaluation_clabsi_v1"
      },

      "expected_inputs": ["enrichment_output", "user_questions"],
      "expected_outputs": ["narrative", "criteria_evaluation", "qa_history"],

      "quality_thresholds": {
        "min_confidence": 0.80,
        "min_criteria_accuracy": 0.95
      }
    }
  ]
}
```

**Files to Modify:**
- `backend/configs/projects/clabsi/agent_config.json` - Add all new fields
- `backend/ca_factory/config/loader.py` - Parse new fields in Task class

**Task Class Updates:**
```python
class Task:
    def __init__(self, config: dict):
        # ... existing fields ...

        # NEW: Interrogation support
        self.supports_interrogation = config.get("supports_interrogation", False)
        self.interrogation_modes = config.get("interrogation_modes", [])
        self.interrogation_agents = config.get("interrogation_agents", {})

        # NEW: Program/metric context
        self.program_type = config.get("program_type")
        self.metric_id = config.get("metric_id")
        self.signal_types = config.get("signal_types", [])
        self.criteria_ids = config.get("criteria_ids", [])

    def get_interrogation_agent(self, mode: str) -> str:
        """Get agent ID for specific interrogation mode."""
        return self.interrogation_agents.get(mode)

    def get_interrogation_prompt(self, mode: str, context: dict) -> str:
        """Get mode-specific prompt with context substitution."""
        active_prompt = self.get_active_prompt()
        prompt_template = active_prompt["prompts"].get(mode)
        # Substitute {context} placeholder
        return prompt_template.format(context=context)
```

---

## §6: TESTING REFINEMENTS

### Additional Tests for Interrogation Support

#### Backend Tests

**Test File:** `backend/tests/unit/test_interrogation.py`

1. `test_task_supports_interrogation()`
   - Load task config
   - Assert: clabsi.enrichment has supports_interrogation=True
   - Assert: interrogation_modes = ["explain", "summarize"]

2. `test_task_has_interrogation_agents()`
   - Load task config
   - Assert: interrogation_agents maps modes to agent IDs
   - Assert: get_interrogation_agent("explain") returns correct agent

3. `test_interrogation_prompt_substitution()`
   - Get interrogation prompt for mode="explain"
   - Assert: {context} placeholder is substituted with actual context

**Test File:** `backend/tests/integration/test_interrogation_endpoint.py`

4. `test_interrogate_criterion_explain()`
   - POST /v1/task/clabsi.abstraction/interrogate
   - Body: mode="explain", context={type:"criterion", id:"criterion_1"}
   - Assert: response has answer
   - Assert: task_context.interrogation_mode = "explain"
   - Assert: task_context.interrogation_context.type = "criterion"

5. `test_interrogate_signal_summarize()`
   - POST /v1/task/clabsi.enrichment/interrogate
   - Body: mode="summarize", context={type:"signal_group", id:"LAB"}
   - Assert: response summarizes LAB signals

6. `test_interrogation_appends_to_qa_history()`
   - Interrogate a case
   - GET /api/demo/case/{case_id}/full
   - Assert: abstraction.qa_history has new entry with interrogation_context

**Test File:** `backend/tests/integration/test_task_context_correctness.py`

7. `test_task_context_always_present()`
   - Call all endpoints (enrich, abstract, ask, interrogate)
   - Assert: Every response has task_context
   - Assert: task_context has required fields

8. `test_no_breaking_changes_to_pat_json()`
   - Load PAT-001-clabsi-positive.json
   - Assert: Still has expected fields (patient, enrichment, abstraction)
   - Assert: qa_history format is correct

#### Frontend Tests

**Test File:** `reference-implementation/react/src/components/__tests__/InterrogationPanel.test.tsx`

9. `test_shows_mode_selector()`
   - Render InterrogationPanel with modes=["explain", "summarize"]
   - Assert: Dropdown shows both modes

10. `test_shows_target_selector()`
    - Render with availableTargets=[{type:"criterion", id:"c1", label:"Criterion 1"}]
    - Assert: Dropdown shows "Criterion 1"

11. `test_submits_with_interrogation_context()`
    - User selects mode="explain", target="criterion_1"
    - User types question and submits
    - Assert: onAsk called with correct interrogation_context

12. `test_displays_qa_history_with_context_badges()`
    - Render with qa_history containing interrogation_context
    - Assert: Each Q&A entry shows badge like "Explaining: Criterion 1"

#### E2E Tests

**Test File:** `tests/e2e/test_interrogation_flow.spec.ts`

13. `test_interrogate_criterion_from_abstraction_section()`
    - Navigate to demo case
    - Scroll to abstraction section
    - Click "Explain" mode, select "Criterion 1" target
    - Type question: "Why does this meet criterion 1?"
    - Submit
    - Assert: Response appears with explanation
    - Assert: Q&A history shows interrogation badge

14. `test_interrogate_signal_group_from_enrichment_section()`
    - Navigate to demo case
    - Scroll to enrichment section
    - Click "Summarize" mode, select "LAB signals" target
    - Type question: "What do the lab results show?"
    - Submit
    - Assert: Response appears with summary

15. `test_qa_history_preserves_interrogation_context()`
    - Interrogate multiple times with different contexts
    - Assert: Each Q&A in history shows correct mode + target
    - Assert: Can filter history by context type

---

## UPDATED IMPLEMENTATION CHECKLIST

### Phase 1: Case JSON Restructure
- [ ] 1.1: Create CaseAdapter with interrogation_context support
- [ ] 1.2: Add unit tests for adapter (including interrogation fields)
- [ ] 1.3: Wire adapter into demo endpoints with feature flag
- [ ] 1.4: Rewrite PAT-*.json with interrogation_context in qa_history examples
- [ ] 1.5: Remove adapter, use new structure directly
- [ ] 1.6: Update TypeScript types with InterrogationContext
- [ ] 1.7: Update integration tests

### Phase 2: API Changes
- [ ] 2.1: Add task_context to all existing endpoints
- [ ] 2.2: Add task_context tests
- [ ] 2.3: Create new endpoints: /enrich, /abstract v2, /full, **/interrogate**
- [ ] 2.4: Add tests for all new endpoints (including interrogation)
- [ ] 2.5: Update React API client with interrogateTask()
- [ ] 2.6: Update E2E tests
- [ ] 2.7: Deprecate old endpoints

### Phase 3: UI Refactor
- [ ] 3.1: Create PipelineStepper component
- [ ] 3.2: Create TaskMetadataBadge component
- [ ] 3.3: **Create InterrogationPanel component**
- [ ] 3.4: **Create QAHistoryDisplay component**
- [ ] 3.5: Add pipeline stepper to CaseViewPage
- [ ] 3.6: Add section headers (A, B, C)
- [ ] 3.7: Wire task metadata badges
- [ ] 3.8: **Add InterrogationPanel to enrichment + abstraction sections**
- [ ] 3.9: Update SignalsPanel to use signal_groups
- [ ] 3.10: Add task state badges to EnhancedCaseCard
- [ ] 3.11: Add task state filters
- [ ] 3.12: Add component tests (including InterrogationPanel)

### Phase 4: Config / Task Definition
- [ ] 4.1: Extend agent_config.json with **interrogation support fields**
  - [ ] Add supports_interrogation flag
  - [ ] Add interrogation_modes array
  - [ ] Add interrogation_agents mapping
  - [ ] Add program_type, metric_id, signal_types, criteria_ids
  - [ ] Add mode-specific prompts (batch, interactive, explain, summarize, validate)
- [ ] 4.2: Create TaskRegistry with interrogation support
- [ ] 4.3: Update CAFactory with interrogate_task() method
- [ ] 4.4: Create interrogation.py for prompt building
- [ ] 4.5: Add unit tests for interrogation support

### Phase 5: Testing
- [ ] 5.1: Add all backend unit tests (including interrogation)
- [ ] 5.2: Add all backend integration tests (including interrogate endpoint)
- [ ] 5.3: Add all frontend component tests (including InterrogationPanel)
- [ ] 5.4: Update E2E tests (including interrogation flow)
- [ ] 5.5: **Add task_context correctness tests**
- [ ] 5.6: **Add no-breaking-change tests**
- [ ] 5.7: **Add Q&A path end-to-end tests**

---

## SUMMARY OF CHANGES

| Original Plan Section | What Was Added | Why |
|----------------------|---------------|-----|
| **§1 Mapping** | Explicit mappings for Ask Panel / interrogation tasks, endpoint routing | Ensures clear integration path for interrogation |
| **§2 JSON Migration** | `interrogation_context` in qa_history, interrogation support metadata in task_metadata | Tracks what was interrogated and how |
| **§3 API Changes** | New `/v1/task/{task_id}/interrogate` endpoint, interrogation mode in responses | Dedicated interrogation path with full context |
| **§4 UI Refactor** | InterrogationPanel component in each section, QAHistoryDisplay with context badges | Makes interrogation first-class in UI |
| **§5 Config** | `supports_interrogation`, `interrogation_modes`, `interrogation_agents`, program/metric/signal context | Enables config-driven interrogation routing |
| **§6 Testing** | 15 new tests covering interrogation flow, task_context correctness, no breaking changes | Validates interrogation support end-to-end |

---

*End of Addendum*
