# CA FACTORY IMPLEMENTATION PLAN
## Repo-Aware Migration from Current State → Treatment Plan Model

**Source of Truth:** `docs/CA_FACTORY_TREATMENT_PLAN.md`

**Constraints:**
- No big-bang rewrite
- Keep demo mode working throughout migration
- Incremental, testable steps
- Respect existing file layout

---

## 1) CONCEPT → CURRENT CODE MAPPING

| Concept from Treatment Plan | Current Location in Repo | Notes |
|------------------------------|--------------------------|-------|
| **Case "patient" raw context** | `backend/data/mock/cases/PAT-*.json`<br/>Fields: `case_metadata`, `patient_demographics`, `devices`, `lab_results`, `clinical_notes`, `clinical_events` | Currently flat JSON at top level |
| **Enrichment (signals, groups, timeline phases)** | Same JSON files:<br/>`clinical_signals` array<br/>`timeline_phases` array | Mixed with raw data, no task metadata |
| **Enrichment summary** | ❌ Does not exist | Need to add |
| **Abstraction (criteria, narrative)** | Same JSON files:<br/>`nhsn_evaluation` object<br/>`exclusion_criteria_evaluated` | No narrative field, no task metadata |
| **Abstraction Q&A history** | ❌ Does not exist | Currently ephemeral in UI |
| **Task execution metadata** | ❌ Does not exist | No task_id, prompt_version, mode, executed_at |
| **Task definitions** | `backend/configs/projects/clabsi/agent_config.json`<br/>`agent_profiles` array | Agents exist, but not structured as Tasks |
| **Concern → Task → PromptVersion** | ❌ Not structured this way | Agents have versions in IDs (e.g., `qa_response_clabsi_v1`) but not formalized |
| **Demo endpoints** | `backend/api/main.py`<br/>`POST /api/demo/context` (lines 428-530)<br/>`POST /api/demo/abstract` (lines 533-622)<br/>`POST /api/demo/feedback` (lines 625-680) | Single `/abstract` does enrichment + abstraction |
| **Production endpoints** | `backend/api/main.py`<br/>`POST /v1/case/{patient_id}/ask` (lines 169-224)<br/>`GET /v1/case/{patient_id}/rules` (lines 228-287)<br/>`POST /v1/case/{patient_id}/evidence` (lines 291-347) | No task_context in responses |
| **CAFactory core** | `backend/ca_factory/core/factory.py`<br/>Class: `CAFactory` | Has R/D/Q components, invokes agents |
| **Agent execution** | `backend/ca_factory/core/agent_manager.py`<br/>Class: `AgentManager` | Handles agent lifecycle |
| **Case workbench UI** | `reference-implementation/react/src/pages/CaseViewPage.tsx` | 3-column grid, no pipeline stepper |
| **Case list UI** | `reference-implementation/react/src/pages/CaseListPage.tsx` | Uses `EnhancedCaseCard`, no task state badges |
| **Signals panel** | `reference-implementation/react/src/components/SignalsPanel.tsx` | Groups by type, no enrichment metadata |
| **Ask-the-Case panel** | `reference-implementation/react/src/components/AskTheCasePanel.tsx` | Interactive Q&A, no task metadata display |
| **TypeScript types** | `reference-implementation/react/src/types/index.ts` | `CaseView`, `Signal`, `AbstractionSummary`, etc. |
| **API client (demo)** | `reference-implementation/react/src/api/client.ts` | Calls `/api/*` endpoints |
| **API client (prod)** | `reference-implementation/react/src/api/cafactory.ts` | Calls `/v1/*` endpoints |

---

## 2) MIGRATION PLAN: CASE JSON RESTRUCTURE

**Goal:** Transform flat JSON → 4-section model (patient, enrichment, abstraction, qa) without breaking demo.

### Step 1: Introduce Adapter Layer (No File Changes)

**What:** Create a runtime adapter that wraps existing flat JSON into new structure.

**Files to Create:**
- `backend/ca_factory/adapters/__init__.py`
- `backend/ca_factory/adapters/case_adapter.py`

**Adapter Logic:**
```python
# Pseudocode structure
class CaseAdapter:
    @staticmethod
    def to_new_structure(legacy_case: dict) -> dict:
        """
        Transform legacy flat JSON to 4-section model.
        """
        return {
            "case_id": legacy_case["case_metadata"]["case_id"],
            "concern_id": legacy_case["case_metadata"]["infection_type"].lower(),

            "patient": {
                "case_metadata": legacy_case["case_metadata"],
                "demographics": legacy_case["patient_demographics"],
                "devices": legacy_case["devices"],
                "lab_results": legacy_case["lab_results"],
                "clinical_notes": legacy_case["clinical_notes"],
                "clinical_events": legacy_case["clinical_events"]
            },

            "enrichment": {
                "task_metadata": {
                    "task_id": f"{concern_id}.enrichment",
                    "task_type": "enrichment",
                    "prompt_version": "v1.0",  # Default
                    "mode": "batch",
                    "executed_at": legacy_case["case_metadata"]["created_date"],
                    "executed_by": "system",
                    "status": "completed"
                },
                "summary": CaseAdapter._generate_enrichment_summary(legacy_case),
                "signal_groups": CaseAdapter._group_signals(legacy_case["clinical_signals"]),
                "timeline_phases": legacy_case["timeline_phases"],
                "evidence_assessment": {
                    "completeness": 0.90,  # Placeholder
                    "quality": "high"
                }
            },

            "abstraction": {
                "task_metadata": {
                    "task_id": f"{concern_id}.abstraction",
                    "task_type": "abstraction",
                    "prompt_version": "v1.0",
                    "mode": "batch",  # Demo cases are pre-computed
                    "executed_at": legacy_case["case_metadata"]["created_date"],
                    "executed_by": "system",
                    "status": "completed"
                },
                "narrative": CaseAdapter._generate_narrative(legacy_case),
                "criteria_evaluation": legacy_case["nhsn_evaluation"],
                "qa_history": [],  # Empty for pre-computed cases
                "exclusion_analysis": legacy_case["exclusion_criteria_evaluated"]
            },

            "qa": None  # Future
        }

    @staticmethod
    def _group_signals(signals: list) -> list:
        """Group signals by type (DEVICE, LAB, VITAL, etc.)"""
        # Group by signal_type
        # Add group_confidence based on individual confidences

    @staticmethod
    def _generate_enrichment_summary(case: dict) -> dict:
        """Generate enrichment summary from existing data"""
        # Count signals, identify key findings

    @staticmethod
    def _generate_narrative(case: dict) -> str:
        """Generate clinical narrative from existing data"""
        # Template-based narrative generation
```

**Files to Modify:**
- `backend/api/main.py`
  - Import `CaseAdapter`
  - In `/api/demo/context`, `/api/demo/abstract`, wrap loaded case with adapter
  - In `/v1/case/{patient_id}/*` endpoints (if they load cases), use adapter

**Tests to Add:**
- `backend/tests/unit/test_case_adapter.py`
  - `test_adapter_transforms_flat_to_structured()`
  - `test_adapter_preserves_all_patient_data()`
  - `test_adapter_generates_enrichment_summary()`
  - `test_adapter_groups_signals_by_type()`
  - `test_adapter_creates_task_metadata()`

**Success Criteria:**
- ✅ All existing demo endpoints still work
- ✅ Response shape changes, but frontend doesn't break (frontend still uses old client)
- ✅ Unit tests pass
- ✅ Adapter can be toggled on/off via feature flag

**Feature Flag:**
- Add env var: `USE_STRUCTURED_CASES=false` (default off)
- In main.py, conditionally apply adapter

---

### Step 2: Update Demo JSON Fixtures

**What:** Rewrite `PAT-*.json` files to new 4-section structure.

**Files to Modify:**
- `backend/data/mock/cases/PAT-001-clabsi-positive.json`
- `backend/data/mock/cases/PAT-002-clabsi-negative.json`

**New Structure:**
```json
{
  "case_id": "case-001",
  "concern_id": "clabsi",

  "patient": {
    "case_metadata": { ... },
    "demographics": { ... },
    "devices": { ... },
    "lab_results": [ ... ],
    "clinical_notes": [ ... ],
    "clinical_events": [ ... ]
  },

  "enrichment": {
    "task_metadata": {
      "task_id": "clabsi.enrichment",
      "task_type": "enrichment",
      "prompt_version": "v1.0",
      "mode": "batch",
      "executed_at": "2024-01-20T10:00:00Z",
      "executed_by": "system",
      "status": "completed"
    },
    "summary": {
      "signals_identified": 12,
      "signal_groups_count": 4,
      "timeline_phases_identified": 4,
      "key_findings": [
        "Central line present >2 days before event",
        "Positive blood culture with recognized pathogen",
        "Clinical signs present (fever, tachycardia)"
      ],
      "confidence": 0.95
    },
    "signal_groups": [
      {
        "group_type": "DEVICE",
        "signals": [ ... ],
        "group_confidence": 0.98
      },
      { "group_type": "LAB", ... },
      { "group_type": "VITAL", ... },
      { "group_type": "SYMPTOM", ... }
    ],
    "timeline_phases": [ ... ],
    "evidence_assessment": {
      "completeness": 0.92,
      "quality": "high"
    }
  },

  "abstraction": {
    "task_metadata": {
      "task_id": "clabsi.abstraction",
      "task_type": "abstraction",
      "prompt_version": "v1.0",
      "mode": "batch",
      "executed_at": "2024-01-20T14:30:00Z",
      "executed_by": "system",
      "status": "completed"
    },
    "narrative": "Patient is a 68-year-old male with a PICC line...",
    "criteria_evaluation": { ... },
    "qa_history": [],
    "exclusion_analysis": [ ... ]
  },

  "qa": null
}
```

**Process:**
1. Run adapter on existing JSON files to generate new structure
2. Manually review and enhance:
   - Add meaningful `enrichment.summary.key_findings`
   - Add `abstraction.narrative` (not auto-generated)
   - Ensure `signal_groups` have proper confidence scores
3. Save as new files
4. Keep old files as `PAT-*-legacy.json` for rollback

**Files to Update:**
- `backend/api/main.py`
  - Remove adapter logic (no longer needed)
  - Read new structure directly
  - Set `USE_STRUCTURED_CASES=true` by default

**Tests to Update:**
- `backend/tests/integration/test_demo_endpoints.py`
  - Update assertions to expect new structure
  - Verify `patient`, `enrichment`, `abstraction` sections exist
  - Verify task_metadata is present

**Success Criteria:**
- ✅ Demo endpoints return new structure
- ✅ All tests pass
- ✅ No adapter needed

---

### Step 3: Update TypeScript Types

**What:** Update frontend types to match new structure.

**Files to Modify:**
- `reference-implementation/react/src/types/index.ts`

**New Types to Add:**
```typescript
interface TaskMetadata {
  task_id: string;           // e.g., "clabsi.enrichment"
  task_type: 'enrichment' | 'abstraction' | 'qa';
  prompt_version: string;    // e.g., "v1.0"
  mode: 'batch' | 'interactive' | 'on_demand';
  executed_at: string;       // ISO timestamp
  executed_by: string;       // "system" | email
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface EnrichmentSummary {
  signals_identified: number;
  signal_groups_count: number;
  timeline_phases_identified: number;
  key_findings: string[];
  confidence: number;
}

interface SignalGroup {
  group_type: 'DEVICE' | 'LAB' | 'VITAL' | 'MEDICATION' | 'PROCEDURE' | 'SYMPTOM';
  signals: Signal[];
  group_confidence: number;
}

interface EvidenceAssessment {
  completeness: number;
  quality: 'high' | 'medium' | 'low';
  missing_elements?: string[];
}

interface Enrichment {
  task_metadata: TaskMetadata;
  summary: EnrichmentSummary;
  signal_groups: SignalGroup[];
  timeline_phases: TimelinePhase[];
  evidence_assessment: EvidenceAssessment;
}

interface Abstraction {
  task_metadata: TaskMetadata;
  narrative: string;
  criteria_evaluation: CriteriaEvaluation;  // Rename from nhsn_evaluation
  qa_history: QAHistoryEntry[];
  exclusion_analysis: ExclusionCriterion[];
}

interface QAHistoryEntry {
  question: string;
  answer: string;
  citations: EvidenceCitation[];
  timestamp: string;
  confidence: number;
}

interface StructuredCase {
  case_id: string;
  concern_id: string;

  patient: PatientContext;
  enrichment: Enrichment;
  abstraction: Abstraction;
  qa: null;  // Future
}

interface PatientContext {
  case_metadata: CaseMetadata;
  demographics: Demographics;
  devices: Devices;
  lab_results: LabResult[];
  clinical_notes: ClinicalNote[];
  clinical_events: ClinicalEvent[];
}
```

**Backward Compatibility:**
- Keep existing `CaseView` type for now
- Create adapter function in API client to transform `StructuredCase` → `CaseView`

**Tests to Add:**
- `reference-implementation/react/src/types/__tests__/types.test.ts`
  - Type validation tests
  - Ensure task_metadata is required in enrichment/abstraction

**Success Criteria:**
- ✅ TypeScript compiles
- ✅ New types exported from `types/index.ts`
- ✅ API client can transform new structure to old (for compatibility)

---

### Step 4: Remove Legacy Assumptions

**What:** Remove adapter/compatibility layer, update all code to use new structure directly.

**Files to Modify:**
- `backend/api/main.py` - Remove any legacy handling
- `reference-implementation/react/src/api/client.ts` - Remove transformation adapter
- Remove: `backend/ca_factory/adapters/case_adapter.py` (if still exists)

**Files to Delete:**
- `backend/data/mock/cases/PAT-*-legacy.json` (if created)

**Tests to Update:**
- All tests should expect new structure directly

**Success Criteria:**
- ✅ No adapter code remains
- ✅ All code uses new 4-section model
- ✅ Tests pass

---

## 3) API CHANGES WITH MINIMAL BREAKAGE

**Goal:** Add `task_context` to responses, introduce new endpoints, phase out old ones.

### Current Endpoints Analysis

| Endpoint | Method | Task Type | Should Include task_context? |
|----------|--------|-----------|-------------------------------|
| `/api/demo/context` | POST | Enrichment (partial) | Yes - returns patient data + context fragments |
| `/api/demo/abstract` | POST | Enrichment + Abstraction (combined) | Yes - but should be split |
| `/api/demo/feedback` | POST | N/A | No |
| `/v1/case/{patient_id}/ask` | POST | Abstraction (Q&A) | Yes - this is abstraction.qa_history |
| `/v1/case/{patient_id}/rules` | GET | Abstraction (criteria eval) | Yes - this is abstraction.criteria_evaluation |
| `/v1/case/{patient_id}/evidence` | POST | Enrichment (retrieval) | Yes - this is enrichment operation |
| `/v1/admin/quality-metrics` | GET | N/A | No |

---

### Phase 1: Add task_context to Existing Responses

**What:** Add `task_context` field to all relevant endpoint responses without changing request shapes.

**Files to Modify:**
- `backend/api/main.py`

**Changes per Endpoint:**

#### `/api/demo/context` (lines 428-530)
**Current Response:**
```json
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",
    "patient": { ... },
    "context_fragments": [ ... ]
  },
  "metadata": { ... }
}
```

**New Response:**
```json
{
  "success": true,
  "data": { ... },
  "task_context": {
    "task_id": "clabsi.enrichment",
    "task_type": "enrichment",
    "concern_id": "clabsi",
    "prompt_version": "v1.0",
    "mode": "batch",
    "executed_at": "<timestamp>"
  },
  "metadata": { ... }
}
```

**Implementation:**
```python
# In /api/demo/context handler
task_context = {
    "task_id": f"{request.domain_id}.enrichment",
    "task_type": "enrichment",
    "concern_id": request.domain_id,
    "prompt_version": "v1.0",  # Could come from config
    "mode": "batch",
    "executed_at": datetime.utcnow().isoformat()
}

return JSONResponse(
    status_code=200,
    content={
        "success": True,
        "data": { ... },
        "task_context": task_context,
        "metadata": { ... }
    }
)
```

#### `/api/demo/abstract` (lines 533-622)
**task_context:**
```json
{
  "task_id": "clabsi.abstraction",
  "task_type": "abstraction",
  "concern_id": "clabsi",
  "prompt_version": "v1.0",
  "mode": "batch",
  "executed_at": "<timestamp>"
}
```

**Note:** This endpoint currently does enrichment + abstraction. In Phase 2, we split it.

#### `/v1/case/{patient_id}/ask` (lines 169-224)
**task_context:**
```json
{
  "task_id": "clabsi.abstraction",
  "task_type": "abstraction",
  "concern_id": "clabsi",  // From case metadata
  "prompt_version": "v1.0",  // From agent_config
  "mode": "interactive",
  "executed_at": "<timestamp>"
}
```

**Implementation:**
```python
# Extract from CAFactory response
result = await factory.ask_question(...)

# Determine concern_id from patient data
concern_id = "clabsi"  # TODO: Extract from case

task_context = {
    "task_id": f"{concern_id}.abstraction",
    "task_type": "abstraction",
    "concern_id": concern_id,
    "prompt_version": "v1.0",  # TODO: Extract from agent metadata
    "mode": "interactive",
    "executed_at": datetime.utcnow().isoformat()
}

return JSONResponse(
    status_code=200,
    content={
        "success": True,
        "data": result,
        "task_context": task_context,
        "metadata": { ... }
    }
)
```

#### `/v1/case/{patient_id}/rules` (lines 228-287)
**task_context:**
```json
{
  "task_id": "clabsi.abstraction",  // Rules are part of abstraction
  "task_type": "abstraction",
  "concern_id": "clabsi",
  "prompt_version": "v1.0",
  "mode": "batch",  // Or "on_demand" if triggered manually
  "executed_at": "<timestamp>"
}
```

#### `/v1/case/{patient_id}/evidence` (lines 291-347)
**task_context:**
```json
{
  "task_id": "clabsi.enrichment",  // Evidence retrieval is enrichment
  "task_type": "enrichment",
  "concern_id": "clabsi",
  "prompt_version": "v1.0",
  "mode": "on_demand",
  "executed_at": "<timestamp>"
}
```

**Files to Update:**
- `backend/api/main.py` - Add task_context to all responses
- `backend/ca_factory/core/factory.py` - Modify methods to return task metadata

**CAFactory Changes:**
```python
# In CAFactory.ask_question()
async def ask_question(...) -> Dict[str, Any]:
    # ... existing logic ...

    return {
        "answer": answer,
        "evidence_citations": citations,
        "confidence": confidence,
        # NEW:
        "_task_metadata": {
            "agent_id": agent_id,
            "prompt_version": agent_version,
            "mode": "interactive",
            "tokens_used": tokens_used,
            "latency_ms": latency_ms
        }
    }
```

**Tests to Add:**
- `backend/tests/integration/test_task_context.py`
  - `test_demo_context_includes_task_context()`
  - `test_demo_abstract_includes_task_context()`
  - `test_ask_includes_task_context()`
  - `test_rules_includes_task_context()`
  - `test_evidence_includes_task_context()`
  - Verify task_context has required fields: task_id, task_type, concern_id, prompt_version, mode

**Success Criteria:**
- ✅ All endpoints return task_context
- ✅ Existing clients don't break (task_context is additive)
- ✅ Tests verify task_context shape

---

### Phase 2: Introduce New Demo Endpoints

**What:** Add `/api/demo/enrich` and `/api/demo/abstract` (new), keep old endpoints for compatibility.

**Files to Modify:**
- `backend/api/main.py`

**New Endpoint: `/api/demo/enrich`**

**Purpose:** Return enrichment section only (patient + enrichment).

**Request:**
```json
{
  "domain_id": "clabsi",
  "case_id": "case-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",
    "patient": { ... },
    "enrichment": {
      "task_metadata": { ... },
      "summary": { ... },
      "signal_groups": [ ... ],
      "timeline_phases": [ ... ],
      "evidence_assessment": { ... }
    }
  },
  "task_context": {
    "task_id": "clabsi.enrichment",
    "task_type": "enrichment",
    "concern_id": "clabsi",
    "prompt_version": "v1.0",
    "mode": "batch",
    "executed_at": "<timestamp>"
  },
  "metadata": { ... }
}
```

**Implementation:**
```python
@app.post("/api/demo/enrich")
async def demo_enrich(request: DemoEnrichRequest):
    """
    DEMO PIPELINE STEP 1: Enrichment
    Returns patient context + enrichment output
    """
    # Load case from JSON
    case_data = load_case(request.case_id)

    # Extract patient + enrichment sections
    response_data = {
        "domain_id": request.domain_id,
        "case_id": request.case_id,
        "patient": case_data["patient"],
        "enrichment": case_data["enrichment"]
    }

    task_context = {
        "task_id": f"{request.domain_id}.enrichment",
        "task_type": "enrichment",
        "concern_id": request.domain_id,
        "prompt_version": case_data["enrichment"]["task_metadata"]["prompt_version"],
        "mode": case_data["enrichment"]["task_metadata"]["mode"],
        "executed_at": datetime.utcnow().isoformat()
    }

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": response_data,
            "task_context": task_context,
            "metadata": { ... }
        }
    )
```

**New Endpoint: `/api/demo/abstract` (revised)**

**Purpose:** Return abstraction section, consuming enrichment from previous step.

**Request:**
```json
{
  "domain_id": "clabsi",
  "case_id": "case-001",
  "enrichment": { ... }  // Optional: enrichment from /enrich, or will load from case
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",
    "abstraction": {
      "task_metadata": { ... },
      "narrative": "...",
      "criteria_evaluation": { ... },
      "qa_history": [],
      "exclusion_analysis": [ ... ]
    }
  },
  "task_context": {
    "task_id": "clabsi.abstraction",
    "task_type": "abstraction",
    "concern_id": "clabsi",
    "prompt_version": "v1.0",
    "mode": "batch",
    "executed_at": "<timestamp>"
  },
  "metadata": { ... }
}
```

**Implementation:**
```python
@app.post("/api/demo/abstract")
async def demo_abstract_v2(request: DemoAbstractRequest):
    """
    DEMO PIPELINE STEP 2: Abstraction
    Returns abstraction output
    """
    # Load case
    case_data = load_case(request.case_id)

    # Could optionally use request.enrichment if provided
    # For demo, just return pre-computed abstraction

    response_data = {
        "domain_id": request.domain_id,
        "case_id": request.case_id,
        "abstraction": case_data["abstraction"]
    }

    task_context = {
        "task_id": f"{request.domain_id}.abstraction",
        "task_type": "abstraction",
        "concern_id": request.domain_id,
        "prompt_version": case_data["abstraction"]["task_metadata"]["prompt_version"],
        "mode": case_data["abstraction"]["task_metadata"]["mode"],
        "executed_at": datetime.utcnow().isoformat()
    }

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": response_data,
            "task_context": task_context,
            "metadata": { ... }
        }
    )
```

**New Endpoint: `/api/demo/case/{case_id}/full`**

**Purpose:** Return complete structured case (patient + enrichment + abstraction).

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "case-001",
    "concern_id": "clabsi",
    "patient": { ... },
    "enrichment": { ... },
    "abstraction": { ... },
    "qa": null
  },
  "metadata": { ... }
}
```

**Deprecation Plan for Old Endpoints:**
- Keep `/api/demo/context` for now, mark as deprecated in docs
- Keep old `/api/demo/abstract` for now, mark as deprecated in docs
- Add deprecation warnings in response headers: `X-Deprecated: true`

**Tests to Add:**
- `backend/tests/integration/test_demo_pipeline.py`
  - `test_demo_enrich_returns_patient_and_enrichment()`
  - `test_demo_abstract_returns_abstraction()`
  - `test_demo_full_case_returns_all_sections()`
  - `test_pipeline_flow_enrich_then_abstract()`

**Success Criteria:**
- ✅ New endpoints work
- ✅ Old endpoints still work
- ✅ Tests pass for both old and new

---

### Phase 3: Migrate Frontend to New Endpoints

**What:** Update React API client to use new endpoints, deprecate old ones.

**Files to Modify:**
- `reference-implementation/react/src/api/client.ts`

**New Methods to Add:**
```typescript
// client.ts

async enrich(domainId: string, caseId: string) {
  const response = await fetch(`${API_BASE_URL}/demo/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_id: domainId, case_id: caseId })
  });

  if (!response.ok) throw new Error('Enrich failed');

  const result = await response.json();
  return result;
}

async abstract(domainId: string, caseId: string, enrichment?: any) {
  const response = await fetch(`${API_BASE_URL}/demo/abstract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain_id: domainId,
      case_id: caseId,
      enrichment: enrichment
    })
  });

  if (!response.ok) throw new Error('Abstract failed');

  const result = await response.json();
  return result;
}

async getFullCase(caseId: string) {
  const response = await fetch(`${API_BASE_URL}/demo/case/${caseId}/full`);
  if (!response.ok) throw new Error('Get case failed');
  return response.json();
}
```

**Files to Update:**
- `reference-implementation/react/src/pages/CaseViewPage.tsx`
  - Replace `api.getCase()` with `api.getFullCase()`
  - Display task_context metadata

**Backward Compatibility:**
- Keep old methods but mark as deprecated
- Add eslint-disable comments

**Tests to Update:**
- `reference-implementation/react/src/api/__tests__/client.test.ts`
  - Add tests for new methods
  - Verify task_context is returned

**E2E Tests to Update:**
- `tests/e2e/demo.spec.ts`
  - Update to call new endpoints
  - Verify pipeline flow: enrich → abstract

**Success Criteria:**
- ✅ Frontend uses new endpoints
- ✅ Task metadata displayed in UI
- ✅ E2E tests pass

---

### Phase 4: Remove Old Demo Endpoints

**What:** Delete deprecated `/api/demo/context` (old version).

**Files to Modify:**
- `backend/api/main.py` - Remove old endpoint handlers
- `reference-implementation/react/src/api/client.ts` - Remove old methods

**Success Criteria:**
- ✅ Only new endpoints remain
- ✅ All tests use new endpoints

---

## 4) UI REFACTOR PLAN (WIRING ONLY)

**Goal:** Reorganize UI to show pipeline (Context → Enrichment → Abstraction) with task metadata.

### Current UI Component Mapping

| UI Concept from Treatment Plan | Current Component | File Path | Notes |
|--------------------------------|-------------------|-----------|-------|
| **Home / Concern Selection** | Not implemented | N/A | Need to create |
| **Case List** | `CaseListPage` | `pages/CaseListPage.tsx` | Exists, needs task state badges |
| **Case Workbench** | `CaseViewPage` | `pages/CaseViewPage.tsx` | 3-column layout, no pipeline stepper |
| **Context Section** | `CaseOverview` | `components/CaseOverview.tsx` | Shows patient summary |
| **Enrichment Section** | `SignalsPanel` + `EnhancedTimeline` | `components/SignalsPanel.tsx`<br/>`components/EnhancedTimeline.tsx` | Shows signals and timeline, no task metadata |
| **Abstraction Section** | `AskTheCasePanel` + criteria display | `components/AskTheCasePanel.tsx`<br/>`CaseViewPage.tsx` (inline) | Q&A + criteria, no task metadata |
| **Pipeline Stepper** | Not implemented | N/A | Need to create |
| **Task Metadata Badges** | Not implemented | N/A | Need to create |
| **Task State Badges (case cards)** | Not implemented | N/A | Need to add to `EnhancedCaseCard` |

---

### Stage A: Add Pipeline Stepper + Section Headers (No Structural Changes)

**What:** Add visual pipeline stepper at top of case workbench, add section headers for Context/Enrichment/Abstraction.

**Files to Create:**
- `reference-implementation/react/src/components/PipelineStepper.tsx`
- `reference-implementation/react/src/components/TaskMetadataBadge.tsx`

**PipelineStepper Component:**
```typescript
// Pseudocode structure
interface PipelineStepperProps {
  currentStage: 'context' | 'enrichment' | 'abstraction' | 'feedback';
  enrichmentStatus: 'pending' | 'running' | 'completed' | 'failed';
  abstractionStatus: 'pending' | 'running' | 'completed' | 'failed';
  enrichmentVersion?: string;
  abstractionVersion?: string;
  onStageClick?: (stage: string) => void;
}

export function PipelineStepper(props: PipelineStepperProps) {
  // Render horizontal stepper bar
  // Stage 1: Context (always available)
  // Stage 2: Enrichment (with status badge + version)
  // Stage 3: Abstraction (with status badge + version)
  // Stage 4: Feedback (pending/submitted)

  // Visual: circles with arrows between them
  // Completed stages: green checkmark
  // Current stage: highlighted
  // Click to scroll to section
}
```

**TaskMetadataBadge Component:**
```typescript
interface TaskMetadataBadgeProps {
  taskId: string;        // "clabsi.enrichment"
  promptVersion: string; // "v1.0"
  mode: string;          // "batch" | "interactive"
  executedAt: string;    // timestamp
  executedBy: string;    // "system" | email
  confidence?: number;
}

export function TaskMetadataBadge(props: TaskMetadataBadgeProps) {
  // Render info badge showing:
  // ℹ️ Enriched by clabsi.enrichment v1.0
  //   on Jan 20, 2024 10:00 AM (batch mode, system)
  //   Confidence: 95%
  //   [Re-run with v1.1] [View task details]
}
```

**Files to Modify:**
- `reference-implementation/react/src/pages/CaseViewPage.tsx`

**Changes:**
```typescript
// Add pipeline stepper at top
<div className="case-view-page">
  <div className="page-header">...</div>

  {/* NEW: Pipeline Stepper */}
  <PipelineStepper
    currentStage="abstraction"
    enrichmentStatus="completed"
    abstractionStatus="completed"
    enrichmentVersion="v1.0"
    abstractionVersion="v1.0"
    onStageClick={(stage) => {
      // Scroll to section
      document.getElementById(stage)?.scrollIntoView({ behavior: 'smooth' });
    }}
  />

  {/* Add section headers */}
  <div className="case-grid">
    {/* SECTION A: PATIENT CONTEXT */}
    <div id="context" className="section section-context">
      <h2>Section A: Patient Context</h2>
      <CaseOverview ... />
    </div>

    {/* SECTION B: ENRICHMENT */}
    <div id="enrichment" className="section section-enrichment">
      <h2>Section B: Enrichment</h2>
      {/* Will add TaskMetadataBadge in Stage B */}
      <SignalsPanel ... />
      <EnhancedTimeline ... />
    </div>

    {/* SECTION C: ABSTRACTION & FEEDBACK */}
    <div id="abstraction" className="section section-abstraction">
      <h2>Section C: Abstraction & Feedback</h2>
      {/* Will add TaskMetadataBadge in Stage B */}
      <AskTheCasePanel ... />
      <FeedbackPanel ... />
    </div>
  </div>
</div>
```

**CSS Updates:**
- Add styles for `.section`, `.section-context`, `.section-enrichment`, `.section-abstraction`
- Make sections collapsible (optional)

**Tests to Add:**
- `reference-implementation/react/src/components/__tests__/PipelineStepper.test.tsx`
  - `test_renders_all_stages()`
  - `test_highlights_current_stage()`
  - `test_shows_version_badges()`
  - `test_click_scrolls_to_section()`

**Success Criteria:**
- ✅ Pipeline stepper visible at top
- ✅ Section headers clearly labeled
- ✅ No functional changes, just visual organization

---

### Stage B: Wire Task Metadata from Backend

**What:** Display task metadata badges in enrichment and abstraction sections using data from API.

**Files to Modify:**
- `reference-implementation/react/src/pages/CaseViewPage.tsx`
- `reference-implementation/react/src/components/SignalsPanel.tsx` (optional: accept task metadata as prop)

**Changes to CaseViewPage:**
```typescript
// After loading case data
const caseData = await api.getFullCase(caseId);

// Extract task metadata
const enrichmentMetadata = caseData.data.enrichment.task_metadata;
const abstractionMetadata = caseData.data.abstraction.task_metadata;

// Render
<div id="enrichment" className="section section-enrichment">
  <h2>Section B: Enrichment</h2>

  {/* NEW: Task Metadata Badge */}
  <TaskMetadataBadge
    taskId={enrichmentMetadata.task_id}
    promptVersion={enrichmentMetadata.prompt_version}
    mode={enrichmentMetadata.mode}
    executedAt={enrichmentMetadata.executed_at}
    executedBy={enrichmentMetadata.executed_by}
    confidence={caseData.data.enrichment.summary.confidence}
  />

  {/* Enrichment Summary */}
  <div className="enrichment-summary">
    <h3>Enrichment Summary</h3>
    <p>{caseData.data.enrichment.summary.key_findings.join(', ')}</p>
    <p>Identified {caseData.data.enrichment.summary.signals_identified} signals
       across {caseData.data.enrichment.summary.signal_groups_count} groups.</p>
  </div>

  {/* Signal Groups (updated to use signal_groups instead of signals) */}
  <SignalsPanel signalGroups={caseData.data.enrichment.signal_groups} />

  <EnhancedTimeline phases={caseData.data.enrichment.timeline_phases} />
</div>
```

**Changes to SignalsPanel:**
- Update prop from `signals: Signal[]` to `signalGroups: SignalGroup[]`
- Render groups with group headers and confidence

**Files to Modify:**
- `reference-implementation/react/src/components/SignalsPanel.tsx`

**Tests to Update:**
- Update SignalsPanel tests to use signal_groups structure

**Success Criteria:**
- ✅ Task metadata badges displayed
- ✅ Enrichment summary shown
- ✅ Signal groups rendered with group confidence
- ✅ Backend data flows through to UI

---

### Stage C: Add Task State Badges to Case Cards

**What:** Show enrichment/abstraction state on case list cards.

**Files to Modify:**
- `reference-implementation/react/src/components/EnhancedCaseCard.tsx`

**New Props:**
```typescript
interface EnhancedCaseCardProps {
  // ... existing props ...
  enrichmentStatus: 'completed' | 'pending' | 'failed';
  enrichmentVersion?: string;
  enrichmentMode?: string;
  enrichmentDate?: string;

  abstractionStatus: 'completed' | 'pending' | 'failed';
  abstractionVersion?: string;
  abstractionMode?: string;
  abstractionDate?: string;
}
```

**Rendering:**
```typescript
<div className="case-card">
  <div className="case-header">...</div>

  {/* NEW: Task State Badges */}
  <div className="task-states">
    {enrichmentStatus === 'completed' && (
      <div className="task-badge task-badge-enrichment">
        ✓ Enriched {enrichmentVersion} ({enrichmentMode}, {formatDate(enrichmentDate)})
      </div>
    )}
    {enrichmentStatus === 'pending' && (
      <div className="task-badge task-badge-pending">
        ⏳ Needs enrichment
      </div>
    )}
    {enrichmentStatus === 'failed' && (
      <div className="task-badge task-badge-failed">
        ⚠️ Enrichment failed
      </div>
    )}

    {abstractionStatus === 'completed' && (
      <div className="task-badge task-badge-abstraction">
        ✓ Abstracted {abstractionVersion} ({abstractionMode}, {formatDate(abstractionDate)})
      </div>
    )}
    {abstractionStatus === 'pending' && (
      <div className="task-badge task-badge-pending">
        ⏳ Needs abstraction
      </div>
    )}
  </div>

  <div className="case-body">...</div>
</div>
```

**Files to Modify:**
- `reference-implementation/react/src/pages/CaseListPage.tsx` - pass task metadata to cards

**Tests to Add:**
- `reference-implementation/react/src/components/__tests__/EnhancedCaseCard.test.tsx`
  - `test_shows_enrichment_completed_badge()`
  - `test_shows_abstraction_pending_badge()`
  - `test_shows_failed_state()`

**Success Criteria:**
- ✅ Case cards show task states
- ✅ Version and mode visible
- ✅ Tests pass

---

### Stage D: Add Filters by Task State

**What:** Allow filtering case list by enrichment/abstraction state.

**Files to Modify:**
- `reference-implementation/react/src/components/SearchFilterPanel.tsx`

**New Filters to Add:**
```typescript
interface FilterState {
  // ... existing filters ...
  taskState: 'all' | 'enriched_only' | 'needs_enrichment' | 'needs_abstraction' | 'fully_processed';
}

// In SearchFilterPanel
<select value={filters.taskState} onChange={...}>
  <option value="all">All</option>
  <option value="enriched_only">Enriched Only</option>
  <option value="needs_enrichment">Needs Enrichment</option>
  <option value="needs_abstraction">Needs Abstraction</option>
  <option value="fully_processed">Fully Processed</option>
</select>
```

**Files to Modify:**
- `reference-implementation/react/src/pages/CaseListPage.tsx` - apply task state filter

**Success Criteria:**
- ✅ Filters work
- ✅ Can filter by task completion state

---

## 5) CONFIG / TASK DEFINITION

**Goal:** Formalize Task entity in configuration, map tasks to agents.

### Option: Extend agent_config.json with Tasks Section

**Recommendation:** Extend existing `agent_config.json` rather than creating new `tasks.json`.

**Reasoning:**
- Tasks and agents are closely related
- Avoids managing two config files
- Easier migration (extend existing structure)

**Files to Modify:**
- `backend/configs/projects/clabsi/agent_config.json`

**New Structure:**
```json
{
  "concern_id": "clabsi",
  "concern_name": "Central Line-Associated Bloodstream Infection",

  "system_prompt": "You are a clinical abstraction AI specializing in healthcare-associated infections. Your worldview: NHSN definitions are authoritative, evidence-based reasoning required, key signals: device days, organism type, clinical signs...",

  "tasks": [
    {
      "task_id": "clabsi.enrichment",
      "task_type": "enrichment",
      "description": "Extract and structure clinical signals from raw context",

      "execution_modes": ["batch", "on_demand"],
      "default_mode": "batch",

      "prompt_versions": [
        {
          "version_id": "v1.0",
          "status": "stable",
          "created_at": "2024-01-15",
          "changelog": "Initial CLABSI enrichment prompt",
          "base_prompt": "{{ concern_system_prompt }}\n\nTask: Extract clinical signals...",
          "task_specific_additions": "Focus on: device presence, temporal phases, lab results, vital signs..."
        },
        {
          "version_id": "v1.1",
          "status": "experimental",
          "created_at": "2025-01-10",
          "changelog": "Added temporal reasoning enhancements",
          "base_prompt": "...",
          "task_specific_additions": "..."
        }
      ],

      "active_version": "v1.0",

      "agent_profiles": ["evidence_retrieval_clabsi_v1", "timeline_analysis_clabsi_v1"],

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

      "execution_modes": ["interactive", "batch"],
      "default_mode": "interactive",

      "prompt_versions": [
        {
          "version_id": "v1.0",
          "status": "stable",
          "created_at": "2024-01-15",
          "changelog": "Initial CLABSI abstraction prompt",
          "base_prompt": "{{ concern_system_prompt }}\n\nTask: Evaluate NHSN criteria...",
          "task_specific_additions": "Use enrichment output: signal_groups, timeline_phases. Evaluate criteria: central line >2 days, positive culture, clinical signs..."
        }
      ],

      "active_version": "v1.0",

      "agent_profiles": [
        "qa_response_clabsi_v1",
        "rule_evaluation_clabsi_v1",
        "summary_generation_clabsi_v1"
      ],

      "expected_inputs": ["enrichment_output", "user_questions"],
      "expected_outputs": ["narrative", "criteria_evaluation", "qa_history"],

      "quality_thresholds": {
        "min_confidence": 0.80,
        "min_criteria_accuracy": 0.95
      }
    }
  ],

  "core_memory_max_tokens": 8000,
  "pruning_policy": { ... },
  "priming_config": { ... },
  "delegated_task_list": [ ... ],
  "delegation_thresholds": { ... },
  "quality_gates": { ... },
  "eval_config": { ... },

  "agent_profiles": [
    {
      "agent_id": "evidence_retrieval_clabsi_v1",
      "agent_type": "retrieval",
      "base_prompt": "...",
      "domain_specific_prompt": "...",
      ...
    },
    ...
  ],

  "vector_store_config": { ... },
  "memory_store_config": { ... },
  "logging_config": { ... }
}
```

**Key Changes:**
- Add `concern_id`, `concern_name`, `system_prompt` at top level
- Add `tasks` array with Task entities
- Each task has `task_id`, `task_type`, `prompt_versions`, `agent_profiles` (links to existing agents)
- Keep existing `agent_profiles` array (agents become implementation details of tasks)

---

### Hooking into CAFactory Core

**Files to Modify:**
- `backend/ca_factory/config/loader.py` (if exists, or create)
- `backend/ca_factory/core/factory.py`

**Config Loader:**
```python
# config/loader.py (new file or extend existing)

class TaskRegistry:
    """Registry for task definitions."""

    def __init__(self, config: dict):
        self.tasks = {}
        self._load_tasks(config.get("tasks", []))

    def _load_tasks(self, tasks_config: list):
        for task_def in tasks_config:
            task_id = task_def["task_id"]
            self.tasks[task_id] = Task(task_def)

    def get_task(self, task_id: str) -> "Task":
        return self.tasks.get(task_id)

class Task:
    """Represents a task (enrichment, abstraction, qa)."""

    def __init__(self, config: dict):
        self.task_id = config["task_id"]
        self.task_type = config["task_type"]
        self.description = config["description"]
        self.execution_modes = config["execution_modes"]
        self.default_mode = config["default_mode"]
        self.prompt_versions = config["prompt_versions"]
        self.active_version = config["active_version"]
        self.agent_profiles = config["agent_profiles"]
        self.expected_inputs = config["expected_inputs"]
        self.expected_outputs = config["expected_outputs"]
        self.quality_thresholds = config["quality_thresholds"]

    def get_active_prompt(self) -> dict:
        """Get active prompt version."""
        for pv in self.prompt_versions:
            if pv["version_id"] == self.active_version:
                return pv
        return None

    def get_agents(self) -> list:
        """Get agent IDs for this task."""
        return self.agent_profiles
```

**CAFactory Changes:**
```python
# ca_factory/core/factory.py

class CAFactory:
    def __init__(self, config: Dict[str, Any]):
        # ... existing initialization ...

        # NEW: Task registry
        self.task_registry = TaskRegistry(config)

    async def execute_task(
        self,
        task_id: str,
        mode: str = None,
        inputs: dict = None
    ) -> dict:
        """
        Execute a task by task_id.

        Args:
            task_id: e.g., "clabsi.enrichment"
            mode: "batch", "interactive", "on_demand" (overrides default)
            inputs: Task inputs

        Returns:
            Task output + task_metadata
        """
        task = self.task_registry.get_task(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        # Determine mode
        execution_mode = mode or task.default_mode

        # Get agents for this task
        agents = task.get_agents()

        # Execute task using appropriate agents
        # (delegate to existing agent execution logic)

        # Build task metadata
        task_metadata = {
            "task_id": task_id,
            "task_type": task.task_type,
            "prompt_version": task.active_version,
            "mode": execution_mode,
            "executed_at": datetime.utcnow().isoformat(),
            "status": "completed"
        }

        return {
            "output": result,
            "task_metadata": task_metadata
        }
```

**Store Task Metadata in Case Structure:**

When enrichment or abstraction is executed, store task metadata:

```python
# After executing enrichment task
enrichment_result = await factory.execute_task("clabsi.enrichment", inputs=patient_data)

# Save to case structure
case["enrichment"] = {
    "task_metadata": enrichment_result["task_metadata"],
    "summary": enrichment_result["output"]["summary"],
    "signal_groups": enrichment_result["output"]["signal_groups"],
    ...
}
```

**Files to Create:**
- `backend/ca_factory/config/__init__.py`
- `backend/ca_factory/config/loader.py`

**Files to Modify:**
- `backend/ca_factory/core/factory.py` - Add task registry, execute_task method
- `backend/api/main.py` - Use factory.execute_task instead of ask_question/evaluate_rules

**Tests to Add:**
- `backend/tests/unit/test_task_registry.py`
  - `test_load_tasks_from_config()`
  - `test_get_task_by_id()`
  - `test_get_active_prompt_version()`
  - `test_get_agents_for_task()`
- `backend/tests/unit/test_factory_execute_task.py`
  - `test_execute_enrichment_task()`
  - `test_execute_abstraction_task()`
  - `test_task_metadata_included()`

**Success Criteria:**
- ✅ Tasks defined in config
- ✅ CAFactory can execute tasks by task_id
- ✅ Task metadata captured
- ✅ Tests pass

---

## 6) TESTING PLAN

### Backend Tests

#### Test File: `backend/tests/integration/test_task_context_responses.py`

**Purpose:** Verify all endpoints return task_context.

**Tests:**
1. `test_demo_context_includes_task_context()`
   - POST /api/demo/context
   - Assert: response has task_context
   - Assert: task_context.task_type == "enrichment"
   - Assert: task_context.concern_id == "clabsi"

2. `test_demo_abstract_includes_task_context()`
   - POST /api/demo/abstract
   - Assert: response has task_context
   - Assert: task_context.task_type == "abstraction"

3. `test_v1_ask_includes_task_context()`
   - POST /v1/case/{patient_id}/ask
   - Assert: task_context.task_type == "abstraction"
   - Assert: task_context.mode == "interactive"

4. `test_v1_rules_includes_task_context()`
   - GET /v1/case/{patient_id}/rules
   - Assert: task_context.task_type == "abstraction"

5. `test_v1_evidence_includes_task_context()`
   - POST /v1/case/{patient_id}/evidence
   - Assert: task_context.task_type == "enrichment"

**Assertions for all:**
- `task_context` object exists
- Required fields: task_id, task_type, concern_id, prompt_version, mode, executed_at
- Field types are correct

---

#### Test File: `backend/tests/integration/test_demo_pipeline.py`

**Purpose:** Verify new demo pipeline endpoints work correctly.

**Tests:**
1. `test_demo_enrich_returns_patient_and_enrichment()`
   - POST /api/demo/enrich with case-001
   - Assert: response.data has "patient" and "enrichment" sections
   - Assert: enrichment.task_metadata exists
   - Assert: enrichment.summary.key_findings is not empty

2. `test_demo_abstract_returns_abstraction()`
   - POST /api/demo/abstract with case-001
   - Assert: response.data has "abstraction" section
   - Assert: abstraction.task_metadata exists
   - Assert: abstraction.narrative is not empty

3. `test_demo_full_case_returns_all_sections()`
   - GET /api/demo/case/case-001/full
   - Assert: response has patient, enrichment, abstraction, qa sections

4. `test_pipeline_flow_enrich_then_abstract()`
   - POST /api/demo/enrich → get enrichment
   - POST /api/demo/abstract with enrichment → get abstraction
   - Assert: both have task_context with proper task_ids

---

#### Test File: `backend/tests/unit/test_case_structure.py`

**Purpose:** Verify case JSON structure.

**Tests:**
1. `test_demo_case_has_four_sections()`
   - Load PAT-001-clabsi-positive.json
   - Assert: has keys: case_id, concern_id, patient, enrichment, abstraction, qa

2. `test_enrichment_section_has_task_metadata()`
   - Load case
   - Assert: enrichment.task_metadata has required fields

3. `test_enrichment_has_signal_groups()`
   - Load case
   - Assert: enrichment.signal_groups is array
   - Assert: each group has group_type, signals, group_confidence

4. `test_abstraction_section_has_task_metadata()`
   - Load case
   - Assert: abstraction.task_metadata has required fields

5. `test_abstraction_has_narrative()`
   - Load case
   - Assert: abstraction.narrative is string

---

### Frontend Tests

#### Test File: `reference-implementation/react/src/components/__tests__/PipelineStepper.test.tsx`

**Purpose:** Verify pipeline stepper component.

**Tests:**
1. `test_renders_all_stages()`
   - Render PipelineStepper
   - Assert: shows Context, Enrichment, Abstraction, Feedback stages

2. `test_highlights_current_stage()`
   - Render with currentStage="enrichment"
   - Assert: enrichment stage is highlighted

3. `test_shows_version_badges()`
   - Render with enrichmentVersion="v1.0"
   - Assert: "v1.0" badge visible

4. `test_click_scrolls_to_section()`
   - Mock scrollIntoView
   - Click enrichment stage
   - Assert: scrollIntoView called with "enrichment"

---

#### Test File: `reference-implementation/react/src/components/__tests__/TaskMetadataBadge.test.tsx`

**Purpose:** Verify task metadata badge component.

**Tests:**
1. `test_displays_task_id()`
   - Render TaskMetadataBadge with taskId="clabsi.enrichment"
   - Assert: "clabsi.enrichment" visible

2. `test_displays_version_and_mode()`
   - Render with promptVersion="v1.0", mode="batch"
   - Assert: "v1.0" and "batch" visible

3. `test_displays_timestamp()`
   - Render with executedAt="2024-01-20T10:00:00Z"
   - Assert: formatted date visible

4. `test_displays_confidence()`
   - Render with confidence=0.95
   - Assert: "95%" visible

---

#### Test File: `reference-implementation/react/src/pages/__tests__/CaseViewPage.test.tsx`

**Purpose:** Verify case workbench shows pipeline sections.

**Tests:**
1. `test_shows_pipeline_stepper()`
   - Render CaseViewPage with mock case
   - Assert: PipelineStepper component rendered

2. `test_shows_three_sections()`
   - Render CaseViewPage
   - Assert: "Section A: Patient Context" header exists
   - Assert: "Section B: Enrichment" header exists
   - Assert: "Section C: Abstraction" header exists

3. `test_enrichment_section_shows_task_metadata()`
   - Render with case that has enrichment.task_metadata
   - Assert: TaskMetadataBadge rendered in enrichment section
   - Assert: task_id, prompt_version visible

4. `test_abstraction_section_shows_task_metadata()`
   - Render with case that has abstraction.task_metadata
   - Assert: TaskMetadataBadge rendered in abstraction section

---

#### Test File: `reference-implementation/react/src/components/__tests__/EnhancedCaseCard.test.tsx`

**Purpose:** Verify case cards show task states.

**Tests:**
1. `test_shows_enrichment_completed_badge()`
   - Render with enrichmentStatus="completed"
   - Assert: "✓ Enriched" badge visible

2. `test_shows_enrichment_pending_badge()`
   - Render with enrichmentStatus="pending"
   - Assert: "⏳ Needs enrichment" badge visible

3. `test_shows_abstraction_completed_badge()`
   - Render with abstractionStatus="completed"
   - Assert: "✓ Abstracted" badge visible

4. `test_shows_version_in_badge()`
   - Render with enrichmentVersion="v1.0"
   - Assert: "v1.0" visible in badge

---

### E2E Tests (Playwright)

#### Test File: `tests/e2e/test_demo_pipeline.spec.ts`

**Purpose:** Verify demo mode pipeline flow end-to-end.

**Tests:**
1. `test_demo_case_shows_pipeline_stepper()`
   - Navigate to CLABSI demo case
   - Assert: Pipeline stepper visible
   - Assert: 4 stages shown

2. `test_enrichment_section_shows_metadata()`
   - Navigate to demo case
   - Scroll to enrichment section
   - Assert: "Enriched by clabsi.enrichment v1.0" visible
   - Assert: Enrichment summary visible
   - Assert: Signal groups visible

3. `test_abstraction_section_shows_metadata()`
   - Navigate to demo case
   - Scroll to abstraction section
   - Assert: "Abstraction by clabsi.abstraction v1.0" visible
   - Assert: Clinical narrative visible
   - Assert: Criteria evaluation visible

4. `test_case_list_shows_task_state_badges()`
   - Navigate to case list
   - Assert: "✓ Enriched v1.0" badge visible on case card
   - Assert: "✓ Abstracted v1.0" badge visible on case card

5. `test_ask_question_updates_qa_history()`
   - Navigate to demo case
   - Ask a question in Ask-the-Case panel
   - Assert: Response received
   - Assert: Q&A added to abstraction.qa_history (check via dev tools or state)

---

### Test Execution Order

**Phase 1:** Unit tests
- test_case_adapter.py
- test_task_registry.py
- test_case_structure.py

**Phase 2:** Integration tests
- test_task_context_responses.py
- test_demo_pipeline.py

**Phase 3:** Frontend unit tests
- PipelineStepper.test.tsx
- TaskMetadataBadge.test.tsx
- EnhancedCaseCard.test.tsx
- CaseViewPage.test.tsx

**Phase 4:** E2E tests
- test_demo_pipeline.spec.ts

---

## SUMMARY: IMPLEMENTATION CHECKLIST

### Phase 1: Case JSON Restructure
- [ ] 1.1: Create CaseAdapter in `backend/ca_factory/adapters/case_adapter.py`
- [ ] 1.2: Add unit tests for adapter
- [ ] 1.3: Wire adapter into demo endpoints with feature flag
- [ ] 1.4: Rewrite PAT-*.json to new 4-section structure
- [ ] 1.5: Remove adapter, use new structure directly
- [ ] 1.6: Update TypeScript types in `types/index.ts`
- [ ] 1.7: Update integration tests

### Phase 2: API Changes
- [ ] 2.1: Add task_context to all existing endpoints
- [ ] 2.2: Add task_context tests
- [ ] 2.3: Create new endpoints: /api/demo/enrich, /api/demo/abstract (v2), /api/demo/case/{id}/full
- [ ] 2.4: Add tests for new endpoints
- [ ] 2.5: Update React API client to use new endpoints
- [ ] 2.6: Update E2E tests
- [ ] 2.7: Deprecate old endpoints

### Phase 3: UI Refactor
- [ ] 3.1: Create PipelineStepper component
- [ ] 3.2: Create TaskMetadataBadge component
- [ ] 3.3: Add pipeline stepper to CaseViewPage
- [ ] 3.4: Add section headers (A, B, C)
- [ ] 3.5: Wire task metadata badges into enrichment/abstraction sections
- [ ] 3.6: Update SignalsPanel to use signal_groups
- [ ] 3.7: Add task state badges to EnhancedCaseCard
- [ ] 3.8: Add task state filters to SearchFilterPanel
- [ ] 3.9: Add component tests

### Phase 4: Config / Task Definition
- [ ] 4.1: Extend agent_config.json with tasks section
- [ ] 4.2: Create TaskRegistry in `backend/ca_factory/config/loader.py`
- [ ] 4.3: Update CAFactory to use TaskRegistry
- [ ] 4.4: Add execute_task method to CAFactory
- [ ] 4.5: Add unit tests for task registry and execution

### Phase 5: Testing
- [ ] 5.1: Add all backend unit tests
- [ ] 5.2: Add all backend integration tests
- [ ] 5.3: Add all frontend component tests
- [ ] 5.4: Update E2E tests
- [ ] 5.5: Ensure all tests pass

---

## MIGRATION RISKS & MITIGATIONS

**Risk 1: Breaking demo mode during migration**
- **Mitigation:** Use feature flags, run both old and new code paths in parallel, extensive testing at each step

**Risk 2: Type mismatches between backend and frontend**
- **Mitigation:** Update types first, add validation tests, use TypeScript strict mode

**Risk 3: Missing task metadata in responses**
- **Mitigation:** Add validation tests that fail if task_context is missing, make it a required field

**Risk 4: Confusion about which endpoints to use**
- **Mitigation:** Clear deprecation warnings, update all documentation, provide migration guide

**Risk 5: Tests becoming stale**
- **Mitigation:** Update tests incrementally with each change, run full test suite at each phase boundary

---

*End of Implementation Plan*
