# 🏗️ CA FACTORY REFERENCE IMPLEMENTATION — TREATMENT PLAN
## From Diagnosis to Conceptual Specification

*Architecture Adjustment + UI Flow Specification (No Code)*

---

## PART 1: ARCHITECTURE ADJUSTMENT PLAN

### 1.1 Task as First-Class Concept

#### **Conceptual Model: Concern → Task → PromptVersion**

```
CONCERN (e.g., CLABSI)
├── System Prompt (worldview, rules, key signals)
├── Tasks
│   ├── ENRICHMENT
│   │   ├── PromptVersion v1.0 (stable)
│   │   ├── PromptVersion v1.1 (experimental)
│   │   └── Default execution mode: BATCH
│   ├── ABSTRACTION
│   │   ├── PromptVersion v1.0 (stable)
│   │   ├── PromptVersion v1.2 (experimental)
│   │   └── Default execution mode: INTERACTIVE
│   └── QA (future)
│       ├── PromptVersion v1.0
│       └── Default execution mode: BATCH
├── Configuration
│   ├── Rules library (NHSN criteria)
│   ├── Signal definitions
│   └── Timeline phase definitions
```

#### **Task Definition Structure**

Each Task should have:

```
TASK ENTITY:
{
  task_id: "clabsi.enrichment"
  task_type: "enrichment" | "abstraction" | "qa"
  concern_id: "clabsi"

  description: "Extract and structure clinical signals from raw context"

  execution_modes: ["batch", "on_demand"]
  default_mode: "batch"

  prompt_versions: [
    {
      version_id: "v1.0"
      status: "stable" | "experimental" | "deprecated"
      system_prompt: "<inherits from concern + task-specific additions>"
      created_at: "2024-01-15"
      changelog: "Initial CLABSI enrichment prompt"
    },
    {
      version_id: "v1.1"
      status: "experimental"
      system_prompt: "..."
      created_at: "2025-01-10"
      changelog: "Added temporal reasoning enhancements"
    }
  ]

  active_version: "v1.0"

  agent_profile: "evidence_retrieval_clabsi_v1"  // Links to existing agents

  expected_inputs: ["patient_context", "clinical_notes", "lab_results"]
  expected_outputs: ["signal_groups", "enrichment_summary", "timeline_phases"]

  quality_thresholds: {
    min_confidence: 0.85
    min_signal_coverage: 0.90
  }
}
```

#### **How Existing Agents Fit Under Tasks**

**Current state:**
- Agents are top-level: `qa_response_clabsi_v1`, `rule_evaluation_clabsi_v1`, `evidence_retrieval_clabsi_v1`

**New conceptual mapping:**

```
TASK: clabsi.enrichment
  └── Uses agents: evidence_retrieval_clabsi_v1, timeline_analysis_clabsi_v1
  └── Prompt version: v1.0
  └── Execution mode: batch

TASK: clabsi.abstraction
  └── Uses agents: qa_response_clabsi_v1, rule_evaluation_clabsi_v1, summary_generation_clabsi_v1
  └── Prompt version: v1.0
  └── Execution mode: interactive

TASK: clabsi.qa (future)
  └── Uses agents: qa_response_clabsi_v1, contradiction_detector
  └── Prompt version: v1.0
  └── Execution mode: batch
```

**Key insight:** Agents become **implementation details** of tasks. Tasks are what users see and interact with.

#### **Task Execution Records Per Case**

Each case should track task executions:

```
CASE OBJECT (conceptual):
{
  case_id: "case-001"
  concern_id: "clabsi"

  task_executions: [
    {
      execution_id: "exec-001"
      task_id: "clabsi.enrichment"
      task_type: "enrichment"
      prompt_version: "v1.0"
      mode: "batch"

      executed_at: "2024-01-20T10:00:00Z"
      executed_by: "system" | "user@example.com"

      status: "completed" | "failed" | "running"

      result_summary: {
        confidence: 0.95
        signals_identified: 12
        signal_groups: ["DEVICE", "LAB", "VITAL", "SYMPTOM"]
        key_findings: ["Central line >2 days", "Positive blood culture", "Fever present"]
      }

      performance_metrics: {
        latency_ms: 1250
        tokens_used: 8500
      }
    },
    {
      execution_id: "exec-002"
      task_id: "clabsi.abstraction"
      task_type: "abstraction"
      prompt_version: "v1.0"
      mode: "interactive"

      executed_at: "2024-01-20T14:30:00Z"
      executed_by: "nurse.jane@hospital.org"

      status: "completed"

      result_summary: {
        determination: "CLABSI_CONFIRMED"
        confidence: 0.92
        criteria_met: 4
        criteria_total: 6
        qa_interactions: 3
      }
    }
  ]
}
```

**Benefits:**
- Clear audit trail: "Which tasks ran when with what versions?"
- Enables re-execution: "Re-run enrichment with v1.1"
- Supports comparison: "How did v1.0 vs v1.1 perform on this case?"
- Makes pipeline visible: "Enrichment completed → Abstraction in progress"

---

### 1.2 Separation: Raw Context vs Computed Outputs

#### **Conceptual Case Object Structure**

```
CASE OBJECT (4 sections):

1. PATIENT (raw-ish context)
   - Demographics
   - Encounter metadata
   - Raw clinical notes
   - Raw lab results
   - Raw vitals
   - Device information
   - Timeline of events (raw chronology)

2. ENRICHMENT (task output + metadata)
   - Task execution metadata (task_id, version, mode, timestamp)
   - Signal groups (structured output)
   - Enrichment summary (AI-generated insights)
   - Timeline phases (computed from raw timeline)
   - Evidence quality assessment
   - Confidence scores

3. ABSTRACTION (task output + metadata)
   - Task execution metadata
   - Clinical narrative (AI-generated)
   - NHSN criteria evaluation
   - Q&A history
   - Clinician interactions
   - Final determination
   - Confidence scores

4. QA (future task output)
   - Task execution metadata
   - Quality checks
   - Coherence validation
   - Recommended reviews
```

#### **Field Mapping: Current → New Structure**

**Current fields from PAT-001-clabsi-positive.json:**

```
WHERE THEY BELONG:

PATIENT (raw context):
  ✓ case_metadata
  ✓ patient_demographics
  ✓ devices (raw device info)
  ✓ lab_results (raw labs)
  ✓ clinical_notes (raw notes)
  ✓ clinical_events (raw chronology)

ENRICHMENT (computed by clabsi.enrichment task):
  ✓ clinical_signals → enrichment.signal_groups
  ✓ timeline_phases → enrichment.timeline_phases
  ✓ (NEW) enrichment.summary: "Identified 4 critical signals across 3 temporal phases..."
  ✓ (NEW) enrichment.evidence_assessment
  ✓ (NEW) enrichment.task_metadata

ABSTRACTION (computed by clabsi.abstraction task):
  ✓ nhsn_evaluation → abstraction.criteria_evaluation
  ✓ (NEW) abstraction.narrative: "Patient is a 68M with PICC line..."
  ✓ (NEW) abstraction.qa_history: [{question, answer, citations}, ...]
  ✓ (NEW) abstraction.task_metadata
  ✓ exclusion_criteria_evaluated → abstraction.exclusion_analysis

QA (future):
  ✓ (NEW) qa.coherence_check
  ✓ (NEW) qa.enrichment_abstraction_alignment
```

#### **Example: Restructured Case Object (Conceptual)**

```json
{
  "case_id": "case-001",
  "concern_id": "clabsi",

  "patient": {
    "case_metadata": {...},
    "demographics": {...},
    "devices": {...},
    "lab_results": [...],
    "clinical_notes": [...],
    "clinical_events": [...]
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
        "signals": [
          {
            "signal_name": "central_line_present",
            "value": true,
            "device_days": 5,
            "confidence": 0.98
          }
        ],
        "group_confidence": 0.98
      },
      {
        "group_type": "LAB",
        "signals": [
          {
            "signal_name": "blood_culture_positive",
            "organism": "Staphylococcus aureus",
            "organism_type": "recognized_pathogen",
            "confidence": 0.99
          },
          {
            "signal_name": "leukocytosis",
            "value": 15.2,
            "abnormal": true,
            "confidence": 0.95
          }
        ],
        "group_confidence": 0.97
      },
      {
        "group_type": "VITAL",
        "signals": [...],
        "group_confidence": 0.92
      },
      {
        "group_type": "SYMPTOM",
        "signals": [...],
        "group_confidence": 0.88
      }
    ],

    "timeline_phases": [...],

    "evidence_assessment": {
      "completeness": 0.92,
      "quality": "high",
      "missing_elements": []
    }
  },

  "abstraction": {
    "task_metadata": {
      "task_id": "clabsi.abstraction",
      "task_type": "abstraction",
      "prompt_version": "v1.0",
      "mode": "interactive",
      "executed_at": "2024-01-20T14:30:00Z",
      "executed_by": "nurse.jane@hospital.org",
      "status": "completed"
    },

    "narrative": "Patient is a 68-year-old male with a PICC line in place since hospital day 1. On hospital day 5, the patient developed fever (39.2°C) and positive blood culture for Staphylococcus aureus. Central line was in place for >2 days before the event. No alternate infection source identified. Meets NHSN criteria for CLABSI.",

    "criteria_evaluation": {
      "determination": "CLABSI_CONFIRMED",
      "confidence": 0.92,
      "criteria_met": {
        "central_line_present_gt_2_days": {
          "met": true,
          "evidence": "PICC line inserted Day 1, event Day 5 (4 device days)",
          "confidence": 0.98
        },
        "positive_blood_culture": {
          "met": true,
          "evidence": "Blood culture positive for S. aureus (recognized pathogen)",
          "confidence": 0.99
        }
      },
      "criteria_total": 6,
      "criteria_met_count": 5
    },

    "qa_history": [
      {
        "question": "What evidence supports the CLABSI diagnosis?",
        "answer": "...",
        "citations": [...],
        "timestamp": "2024-01-20T14:35:00Z"
      }
    ],

    "exclusion_analysis": [...]
  },

  "qa": null
}
```

**Key benefits:**
- **Clear separation** of raw data vs AI-generated insights
- **Task attribution** for every computed value
- **Versioning** embedded in task_metadata
- **Educational**: Users see "Enrichment found X, Abstraction concluded Y"

---

### 1.3 Task Semantics Visible in APIs

#### **Response Envelope Standard**

Every API response should include task metadata:

```json
{
  "success": true,

  "data": {
    // Actual response data
  },

  "task_context": {
    "task_id": "clabsi.abstraction",
    "task_type": "abstraction",
    "concern_id": "clabsi",
    "prompt_version": "v1.0",
    "mode": "interactive",
    "executed_at": "2024-01-20T14:30:00Z"
  },

  "metadata": {
    "request_id": "...",
    "timestamp": "...",
    "latency_ms": 450,
    "tokens_used": 1250
  }
}
```

#### **API Naming Convention**

**Option A: Task-scoped endpoints** (ideal, requires more refactor)
```
POST /v1/concern/{concern_id}/task/enrichment/execute
POST /v1/concern/{concern_id}/task/abstraction/ask
GET  /v1/case/{case_id}/task/enrichment/results
GET  /v1/case/{case_id}/task/abstraction/results
GET  /v1/case/{case_id}/task/history
```

**Option B: Keep current endpoints, add task metadata** (minimal change)
```
Current:
POST /v1/case/{patient_id}/ask

Response now includes:
{
  "success": true,
  "data": {
    "answer": "...",
    "citations": [...]
  },
  "task_context": {
    "task_id": "clabsi.abstraction",
    "task_type": "abstraction",
    "prompt_version": "v1.0",
    "mode": "interactive"
  }
}
```

**Recommendation: Start with Option B** (backward compatible), move to Option A later.

#### **Demo Endpoints Restructured**

**Current:**
```
POST /api/demo/context    (vague)
POST /api/demo/abstract   (does everything)
POST /api/demo/feedback
```

**Proposed:**
```
POST /api/demo/enrich
  → Input: domain_id, case_id
  → Output: enrichment object + task_metadata

POST /api/demo/abstract
  → Input: domain_id, case_id, enrichment (from previous step)
  → Output: abstraction object + task_metadata

POST /api/demo/feedback
  → (unchanged)

GET /api/demo/case/{case_id}/full
  → Returns complete case with patient + enrichment + abstraction sections
```

**Response Example:**

```json
POST /api/demo/enrich
Response:
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",

    "enrichment": {
      "summary": {
        "signals_identified": 12,
        "signal_groups_count": 4,
        "key_findings": [...]
      },
      "signal_groups": [...],
      "timeline_phases": [...]
    }
  },
  "task_context": {
    "task_id": "clabsi.enrichment",
    "task_type": "enrichment",
    "prompt_version": "v1.0",
    "mode": "batch",
    "executed_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 1.4 Batch vs Interactive: Enrichment and Abstraction

#### **Enrichment: Primarily Batch, Can Re-Run On-Demand**

**Conceptual model:**

```
ENRICHMENT MODE: BATCH (default)
- Run nightly across all new cases
- GOLD_AI-style: "Enrich 1000 cases overnight"
- Results stored in case.enrichment section
- Task metadata shows: mode="batch", executed_by="system"

ENRICHMENT MODE: ON-DEMAND (user-triggered)
- User clicks "Re-run enrichment with v1.1"
- Runs synchronously or async
- Creates new task execution record
- UI shows: "Enrichment v1.0 (batch, 2024-01-20) → v1.1 (on-demand, 2024-01-21)"
```

**Case metadata should show:**
```json
{
  "enrichment": {
    "task_metadata": {
      "mode": "batch" | "on_demand",
      "executed_at": "...",
      "executed_by": "system" | "user@example.com"
    }
  }
}
```

**UI implications:**
- Case list shows: "✓ Enriched (batch, 2024-01-20)"
- Case workbench shows: "Enriched by clabsi.enrichment v1.0 on 2024-01-20 in batch mode"
- Button: "Re-run enrichment" (triggers on-demand mode)

#### **Abstraction: Primarily Interactive, Can Pre-Generate**

**Conceptual model:**

```
ABSTRACTION MODE: INTERACTIVE (default)
- User opens case → asks questions → criteria evaluated
- Each Q&A interaction appends to abstraction.qa_history
- Final determination made through interaction
- Task metadata shows: mode="interactive", executed_by="user@example.com"

ABSTRACTION MODE: BATCH (optional pre-generation)
- System pre-generates narrative and criteria evaluation
- User can review and refine through Q&A
- Useful for: "Generate preliminary abstraction for 100 cases overnight"
- Task metadata shows: mode="batch", executed_by="system"
```

**Case metadata should show:**
```json
{
  "abstraction": {
    "task_metadata": {
      "mode": "interactive" | "batch",
      "executed_at": "...",
      "executed_by": "user@example.com" | "system"
    },
    "qa_history": [
      // Records all interactive questions
    ]
  }
}
```

**UI implications:**
- Case list shows: "✓ Abstracted (interactive, 2024-01-20)" vs "Needs abstraction"
- Case workbench shows: "Abstraction in progress..." or "Abstracted by nurse.jane on 2024-01-20"
- If batch pre-generated: "Pre-generated abstraction available. Review and refine below."

#### **Task History View**

Users should be able to see:

```
CASE-001 Task History:

Jan 20, 2024 10:00 AM
  ✓ clabsi.enrichment v1.0 (batch, system)
  → 12 signals identified across 4 groups
  → Confidence: 95%

Jan 20, 2024 2:30 PM
  ✓ clabsi.abstraction v1.0 (interactive, nurse.jane)
  → CLABSI_CONFIRMED (92% confidence)
  → 3 Q&A interactions

Jan 21, 2024 9:15 AM
  ✓ clabsi.enrichment v1.1 (on-demand, dr.smith)
  → Re-run with updated prompts
  → 14 signals identified (2 new)
  → Confidence: 97%
```

---

## PART 2: UI FLOW SPECIFICATION

### 2.1 User Journeys

#### **Journey 1: Review a CA Factory Case**

**Goal:** User wants to review a case and understand how AI processed it.

**Flow:**
```
1. HOME: Choose Concern
   → User sees: CLABSI, CAUTI, SSI cards
   → Each card shows: description, system prompt summary, available tasks
   → User clicks "CLABSI"

2. CASE LIST: See cases for CLABSI
   → Grid of case cards
   → Each card shows:
      - Case ID, patient summary (80/20)
      - Task state badges: "✓ Enriched v1.0" "✓ Abstracted v1.0"
      - Risk level, determination
   → User clicks "CASE-001"

3. CASE WORKBENCH: See pipeline
   → Pipeline bar at top: Context → Enrichment → Abstraction → Feedback
   → Three sections visible:
      A. Patient Context (collapsible, 80/20 summary)
      B. Enrichment (signals, groups, enrichment summary + task metadata)
      C. Abstraction (Ask-the-Case, criteria, narrative + task metadata)

4. ENRICHMENT SECTION:
   → Shows: "Enriched by clabsi.enrichment v1.0 on Jan 20, 2024 (batch mode)"
   → Signal groups displayed with confidence
   → Enrichment summary: "Identified 12 signals in 4 groups. Key findings: ..."
   → Button: "Re-run enrichment with v1.1" (optional)

5. ABSTRACTION SECTION:
   → Shows: "Abstraction by clabsi.abstraction v1.0 on Jan 20, 2024 (interactive)"
   → Narrative displayed
   → Criteria evaluation (6 criteria, 5 met, determination: CLABSI_CONFIRMED)
   → Ask-the-Case panel for Q&A
   → User asks question → AI responds with citations

6. FEEDBACK:
   → User confirms or disputes determination
   → Feedback recorded with metadata
```

**Key learning:** User sees Concern → Task → PromptVersion at every step.

---

#### **Journey 2: Understand How This Case Was Processed**

**Goal:** Clinical reviewer wants to audit AI decisions.

**Flow:**
```
1. Open case (from Journey 1)

2. Click "Task History" tab in case workbench

3. See chronological task execution log:
   ┌─────────────────────────────────────────────────┐
   │ TASK EXECUTION HISTORY                           │
   ├─────────────────────────────────────────────────┤
   │ ✓ Jan 20, 2024 10:00 AM                         │
   │   clabsi.enrichment v1.0 (batch, system)        │
   │   Signals: 12 identified, 4 groups              │
   │   Confidence: 95%                               │
   │   [View enrichment output]                      │
   │                                                  │
   │ ✓ Jan 20, 2024 2:30 PM                          │
   │   clabsi.abstraction v1.0 (interactive, jane)   │
   │   Determination: CLABSI_CONFIRMED (92%)         │
   │   Q&A interactions: 3                           │
   │   [View abstraction output]                     │
   │                                                  │
   │ ✓ Jan 21, 2024 9:15 AM                          │
   │   clabsi.enrichment v1.1 (on-demand, dr.smith)  │
   │   Signals: 14 identified, 4 groups              │
   │   Confidence: 97%                               │
   │   [Compare v1.0 vs v1.1]                        │
   └─────────────────────────────────────────────────┘

4. Click "[Compare v1.0 vs v1.1]"
   → Side-by-side view:
      - v1.0: 12 signals identified
      - v1.1: 14 signals identified (2 new: "hypotension onset", "antibiotic timing")
      - Confidence improved from 95% → 97%

5. Click any task execution to see:
   - Full prompt version details
   - Input data used
   - Output generated
   - Performance metrics (latency, tokens)
```

**Key learning:** Full audit trail of which tasks ran when with what versions.

---

#### **Journey 3: Demo Mode**

**Goal:** New user wants to see how CA Factory works.

**Flow:**
```
1. HOME: Landing page
   → Big banner: "Try CA Factory Demo"
   → Button: "Open CLABSI Demo Case"

2. Click button → taken directly to CASE-001 workbench

3. Pipeline visualization appears at top with animated progression:

   Step 1: Context
   ┌─────────────────────────────────────────────────┐
   │ PATIENT CONTEXT                                  │
   │ 68M with PICC line, Day 5 fever, blood culture  │
   │ [Collapse for 80/20 summary]                    │
   └─────────────────────────────────────────────────┘

   ↓ (arrow with badge: "clabsi.enrichment v1.0")

   Step 2: Enrichment
   ┌─────────────────────────────────────────────────┐
   │ ENRICHMENT                                       │
   │ Enriched on Jan 20, 2024 (batch mode)           │
   │                                                  │
   │ Enrichment Summary:                             │
   │ "Identified 12 clinical signals across 4 groups │
   │  Key findings: Central line >2d, positive       │
   │  culture, clinical signs present"               │
   │                                                  │
   │ Signal Groups:                                  │
   │ [DEVICE] 1 signal (98% confidence)              │
   │ [LAB] 2 signals (97% confidence)                │
   │ [VITAL] 3 signals (92% confidence)              │
   │ [SYMPTOM] 1 signal (88% confidence)             │
   │                                                  │
   │ Timeline Phases: 4 identified                   │
   └─────────────────────────────────────────────────┘

   ↓ (arrow with badge: "clabsi.abstraction v1.0")

   Step 3: Abstraction
   ┌─────────────────────────────────────────────────┐
   │ ABSTRACTION                                      │
   │ Interactive mode available                      │
   │                                                  │
   │ Narrative:                                      │
   │ "Patient is a 68M with PICC line since Day 1... │
   │                                                  │
   │ NHSN Criteria Evaluation:                       │
   │ ✓ Central line >2 days (98% confidence)         │
   │ ✓ Positive blood culture (99% confidence)       │
   │ ✓ Clinical signs present (92% confidence)       │
   │ ...                                             │
   │                                                  │
   │ Determination: CLABSI_CONFIRMED (92%)           │
   │                                                  │
   │ Ask the Case:                                   │
   │ [Question input box]                            │
   │ Suggested: "What evidence supports this?"       │
   └─────────────────────────────────────────────────┘

   ↓

   Step 4: Feedback
   ┌─────────────────────────────────────────────────┐
   │ CLINICIAN FEEDBACK                               │
   │ Do you agree with this determination?           │
   │ [Confirm CLABSI] [Dispute] [Needs more info]   │
   └─────────────────────────────────────────────────┘

4. User can:
   - Ask questions in Ask-the-Case panel
   - See real-time responses with citations
   - Provide feedback

5. Demo badge visible throughout: "DEMO MODE - Using sample data"
```

**Key learning:** Pipeline is crystal clear. Each stage has task metadata. User understands: Context → Enrich → Abstract → Feedback.

---

### 2.2 Screens and Sections

#### **2.2.1 Home / Concern Selection**

**Purpose:** Entry point. User chooses which concern (CLABSI, CAUTI, SSI) to work with.

**Layout:**

```
┌───────────────────────────────────────────────────────────────┐
│ CA FACTORY                                    [Demo Mode: ON] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  Choose a Clinical Concern to Begin                           │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ CLABSI           │  │ CAUTI            │  │ SSI         │ │
│  │                  │  │                  │  │             │ │
│  │ Central Line-    │  │ Catheter-        │  │ Surgical    │ │
│  │ Associated       │  │ Associated       │  │ Site        │ │
│  │ Bloodstream      │  │ Urinary Tract    │  │ Infection   │ │
│  │ Infection        │  │ Infection        │  │             │ │
│  │                  │  │                  │  │             │ │
│  │ Tasks:           │  │ Tasks:           │  │ Tasks:      │ │
│  │ • Enrichment     │  │ • Enrichment     │  │ • Enrich... │ │
│  │ • Abstraction    │  │ • Abstraction    │  │ • Abstra... │ │
│  │                  │  │                  │  │             │ │
│  │ [View Cases]     │  │ [View Cases]     │  │ [View...]   │ │
│  │ [Demo Case]      │  │ [Demo Case]      │  │ [Demo...]   │ │
│  └──────────────────┘  └──────────────────┘  └─────────────┘ │
│                                                                │
│  💡 New to CA Factory? [Start with CLABSI Demo]               │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Concern cards** with brief description
- **Tasks listed** per concern (hints at task-centric model)
- **Demo entry point** prominently displayed
- **Lightweight mention** of system prompt (e.g., tooltip: "View CLABSI system prompt")

**Data Shown:**
- Concern ID, display name, description
- Task list (enrichment, abstraction)
- Case count (e.g., "42 cases enriched, 38 abstracted")

---

#### **2.2.2 Case List (per Concern)**

**Purpose:** Browse and filter cases for a specific concern. Show task completion state.

**Layout:**

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Concerns    CLABSI CASES                  [Filters] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ Filters:                                                       │
│ Task State: [All] [Enriched Only] [Needs Abstraction]        │
│ Risk Level: [All] [Critical] [High] [Moderate] [Low]         │
│ Version: [All] [v1.0] [v1.1]                                  │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ CASE-001                          🔴 CRITICAL           │   │
│ │ 68M • PICC Day 5 • S. aureus BSI                       │   │
│ │                                                         │   │
│ │ ✓ Enriched v1.0 (batch, Jan 20)                        │   │
│ │ ✓ Abstracted v1.0 (interactive, Jan 20)                │   │
│ │                                                         │   │
│ │ Determination: CLABSI_CONFIRMED (92%)                  │   │
│ │                                                         │   │
│ │ [Open Case]                                            │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ CASE-002                          🟡 MODERATE           │   │
│ │ 45F • Foley Day 3 • No growth                          │   │
│ │                                                         │   │
│ │ ✓ Enriched v1.0 (batch, Jan 19)                        │   │
│ │ ⏳ Needs abstraction                                    │   │
│ │                                                         │   │
│ │ [Open Case]                                            │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ CASE-003                          🟢 LOW                │   │
│ │ 52M • Central line Day 2 • Pending culture             │   │
│ │                                                         │   │
│ │ ⚠️  Enrichment failed (needs review)                    │   │
│ │ ⏳ Not abstracted                                       │   │
│ │                                                         │   │
│ │ [Open Case]                                            │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Case cards** with 80/20 summary
- **Task state badges:**
  - ✓ Enriched v1.0 (batch, Jan 20)
  - ✓ Abstracted v1.0 (interactive, Jan 20)
  - ⏳ Needs abstraction
  - ⚠️ Enrichment failed
- **Risk level indicator** (color-coded)
- **Determination summary** (if abstracted)
- **Version tags** (small, non-intrusive)
- **Filters by task state**

**Data Shown Per Card:**
- case_id
- 80/20 patient summary
- Enrichment state: task_id, version, mode, date
- Abstraction state: task_id, version, mode, date
- Risk level
- Determination (if abstracted)

---

#### **2.2.3 Case Workbench (Main Screen)**

**Purpose:** The primary workspace for reviewing a case. MUST make the pipeline visible.

**Layout Overview:**

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Cases    CASE-001: CLABSI               [Demo Mode] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ PIPELINE: [1 Context] → [2 Enrichment] → [3 Abstraction] →   │
│           [4 Feedback]                                        │
│           (Visual stepper bar, current stage highlighted)     │
│                                                                │
├───────────────────────────────────────────────────────────────┤
│ SECTION A: PATIENT CONTEXT                        [Collapse] │
├───────────────────────────────────────────────────────────────┤
│ 80/20 Summary:                                                │
│ 68M with PICC line inserted Day 1. Day 5: fever 39.2°C,      │
│ positive blood culture for S. aureus, tachycardia, BP drop.  │
│                                                                │
│ [Expand for full context: notes, labs, timeline...]          │
│                                                                │
├───────────────────────────────────────────────────────────────┤
│ SECTION B: ENRICHMENT                            [Collapse]  │
├───────────────────────────────────────────────────────────────┤
│ ℹ️ Enriched by clabsi.enrichment v1.0                         │
│   on Jan 20, 2024 10:00 AM (batch mode, system)              │
│   Confidence: 95%                                            │
│   [Re-run with v1.1] [View task details]                     │
│                                                                │
│ Enrichment Summary:                                           │
│ Identified 12 clinical signals across 4 signal groups.       │
│ Key findings:                                                 │
│ • Central line present >2 days before event                  │
│ • Positive blood culture with recognized pathogen            │
│ • Clinical signs present (fever, tachycardia, hypotension)   │
│ • 4 temporal phases identified in infection window           │
│                                                                │
│ Signal Groups:                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ DEVICE (1 signal, 98% confidence)                    │     │
│ │ • Central line present: Yes, PICC, Day 5            │     │
│ │   Device days: 5 (>2 day threshold met)             │     │
│ └──────────────────────────────────────────────────────┘     │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ LAB (2 signals, 97% confidence)                      │     │
│ │ • Blood culture positive: S. aureus (recognized)    │     │
│ │ • Leukocytosis: WBC 15.2 (elevated)                 │     │
│ └──────────────────────────────────────────────────────┘     │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ VITAL (3 signals, 92% confidence)                    │     │
│ │ • Fever: 39.2°C                                      │     │
│ │ • Tachycardia: 112 bpm                              │     │
│ │ • Hypotension: 92/58 mmHg                           │     │
│ └──────────────────────────────────────────────────────┘     │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ SYMPTOM (1 signal, 88% confidence)                   │     │
│ │ • Chills: Present, moderate severity                │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ Timeline Phases:                                              │
│ [Visual timeline with 4 phases: Device Placement, Infection  │
│  Window, Symptom Onset, Diagnostic Workup]                   │
│                                                                │
├───────────────────────────────────────────────────────────────┤
│ SECTION C: ABSTRACTION & FEEDBACK                [Collapse]  │
├───────────────────────────────────────────────────────────────┤
│ ℹ️ Abstraction by clabsi.abstraction v1.0                     │
│   on Jan 20, 2024 2:30 PM (interactive mode, nurse.jane)    │
│   Confidence: 92%                                            │
│   [View task details] [View Q&A history: 3 interactions]    │
│                                                                │
│ Clinical Narrative:                                           │
│ "Patient is a 68-year-old male with a PICC line in place    │
│  since hospital day 1. On hospital day 5, the patient       │
│  developed fever (39.2°C) and positive blood culture for    │
│  Staphylococcus aureus. Central line was in place for >2    │
│  days before the event. No alternate infection source       │
│  identified. Meets NHSN criteria for CLABSI."               │
│                                                                │
│ NHSN Criteria Evaluation:                                    │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ ✓ Central line >2 calendar days (98%)                │     │
│ │   Evidence: PICC inserted Day 1, event Day 5        │     │
│ │                                                       │     │
│ │ ✓ Positive blood culture (99%)                       │     │
│ │   Evidence: S. aureus (recognized pathogen)         │     │
│ │                                                       │     │
│ │ ✓ Clinical signs present (92%)                       │     │
│ │   Evidence: Fever 39.2°C, tachycardia, hypotension  │     │
│ │                                                       │     │
│ │ ✓ No alternate infection source (85%)                │     │
│ │   Evidence: No other sites identified               │     │
│ │                                                       │     │
│ │ ✓ Temporal relationship confirmed (95%)              │     │
│ │   Evidence: Event on Day 5 within infection window  │     │
│ │                                                       │     │
│ │ ✗ Exclusion criteria: None met                       │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ Determination: CLABSI_CONFIRMED (92% confidence)             │
│ Criteria met: 5 of 6 required                                │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ ASK THE CASE                                          │     │
│ │                                                       │     │
│ │ [Question input box: "Ask a question..."]            │     │
│ │                                                       │     │
│ │ Suggested questions:                                 │     │
│ │ • What evidence supports the CLABSI diagnosis?       │     │
│ │ • Are there any exclusion criteria present?          │     │
│ │ • When was the central line inserted?                │     │
│ │                                                       │     │
│ │ Previous Q&A (3 interactions):                       │     │
│ │ Q: "What organism was identified?"                   │     │
│ │ A: "Staphylococcus aureus (recognized pathogen)..."  │     │
│ │    Citations: [LAB-001] [NOTE-003]                   │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ CLINICIAN FEEDBACK                                    │     │
│ │                                                       │     │
│ │ Do you agree with this determination?                │     │
│ │ [✓ Confirm CLABSI] [Dispute] [Needs more info]      │     │
│ │                                                       │     │
│ │ Comments (optional):                                 │     │
│ │ [Text area]                                          │     │
│ │                                                       │     │
│ │ [Submit Feedback]                                    │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Key Components:**

**Pipeline Visualization (top):**
- Visual stepper: Context → Enrichment → Abstraction → Feedback
- Current stage highlighted
- Task versions shown on arrows between stages

**Section A: Patient Context**
- 80/20 summary (expanded view collapsed by default)
- Demographics, timeline, raw data available on expand
- Minimal metadata (this is input data)

**Section B: Enrichment**
- **Task metadata badge:** "Enriched by clabsi.enrichment v1.0 on Jan 20, 2024 (batch mode, system)"
- **Enrichment summary:** AI-generated summary of what was found
- **Signal groups:** Structured output with group type, signals, confidence
- **Timeline phases:** Computed temporal structure
- **Actions:** "Re-run with v1.1", "View task details"

**Section C: Abstraction & Feedback**
- **Task metadata badge:** "Abstraction by clabsi.abstraction v1.0 on Jan 20, 2024 (interactive, nurse.jane)"
- **Clinical narrative:** AI-generated explanation
- **NHSN criteria evaluation:** Checklist with evidence and confidence
- **Determination:** Final answer with confidence
- **Ask-the-Case panel:** Interactive Q&A
- **Q&A history:** Previous interactions visible
- **Feedback panel:** Clinician verdict

**Visual Cues:**
- Section headers clearly labeled: A, B, C or 1, 2, 3
- Task metadata in info boxes with distinctive styling
- Confidence scores next to all AI outputs
- Collapsible sections to reduce cognitive load

---

#### **2.2.4 Rules / Criteria View**

**Purpose:** Deep dive into NHSN criteria evaluation. Should feel like a zoom-in on abstraction output, not a separate thing.

**Access:**
- From Case Workbench Section C: Click "View detailed criteria"
- Or: Dedicated tab "Criteria" in case workbench

**Layout:**

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Case    CASE-001: NHSN CRITERIA EVALUATION         │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ ℹ️ Evaluated by clabsi.abstraction v1.0                        │
│   on Jan 20, 2024 2:30 PM                                    │
│   Determination: CLABSI_CONFIRMED (92% confidence)           │
│                                                                │
│ CRITERIA CHECKLIST (5 of 6 met):                             │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ 1. Central line present >2 calendar days    ✓ MET    │     │
│ │    Confidence: 98%                                    │     │
│ │                                                       │     │
│ │    NHSN Reference: Section 1.1                       │     │
│ │    Evaluation Logic: device_days = event_date -      │     │
│ │                      insertion_date + 1               │     │
│ │    Condition: device_days > 2                        │     │
│ │                                                       │     │
│ │    Evidence:                                         │     │
│ │    • PICC line inserted: Jan 15, 2024               │     │
│ │      Source: [EVT-001] Device insertion event       │     │
│ │    • Event date: Jan 19, 2024                       │     │
│ │      Source: [EVT-002] Fever onset                  │     │
│ │    • Device days calculated: 5 days                 │     │
│ │      (Threshold: >2 days ✓)                         │     │
│ │                                                       │     │
│ │    [View source data]                               │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ 2. Positive blood culture                    ✓ MET    │     │
│ │    Confidence: 99%                                    │     │
│ │                                                       │     │
│ │    NHSN Reference: Section 2.1                       │     │
│ │    Condition: Recognized pathogen OR common          │     │
│ │               commensal with specific criteria       │     │
│ │                                                       │     │
│ │    Evidence:                                         │     │
│ │    • Organism: Staphylococcus aureus                │     │
│ │      Classification: Recognized pathogen            │     │
│ │      Source: [LAB-001] Blood culture result         │     │
│ │    • Growth: Positive at 18 hours (peripheral)      │     │
│ │    • Confirmation: Positive at 16 hours (central)   │     │
│ │                                                       │     │
│ │    [View source data]                               │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ [... additional criteria ...]                                │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ 6. Exclusion criteria evaluated          ✓ NONE MET │     │
│ │    Confidence: 90%                                    │     │
│ │                                                       │     │
│ │    Checked for:                                      │     │
│ │    • Organism related to other infection: NOT FOUND │     │
│ │    • Infant with NEC: NOT APPLICABLE (adult)        │     │
│ │    • etc.                                            │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ OVERALL DETERMINATION:                                        │
│ ✓ CLABSI_CONFIRMED (92% confidence)                          │
│                                                                │
│ This evaluation used:                                         │
│ • Enrichment output from clabsi.enrichment v1.0              │
│ • NHSN criteria library v2024.1                              │
│ • Abstraction task clabsi.abstraction v1.0                   │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Task metadata at top:** Makes clear this is output from abstraction task
- **Each criterion expanded:** NHSN reference, logic, evidence, sources
- **Confidence per criterion**
- **Clear link back:** "This used enrichment output from clabsi.enrichment v1.0"
- **Not a separate page conceptually:** Feels like a detailed view of Section C

**This avoids fragmentation:** Rules aren't separate—they're part of abstraction output.

---

#### **2.2.5 Optional: Admin / Prompt Management (Conceptual Sketch)**

**Purpose:** Internal view for managing concerns, tasks, and prompt versions. Not user-facing initially.

**Layout (conceptual):**

```
┌───────────────────────────────────────────────────────────────┐
│ CA FACTORY ADMIN                                    [Internal] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ CONCERNS                                                       │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ CLABSI                                               │     │
│ │                                                       │     │
│ │ System Prompt:                                       │     │
│ │ "You are a clinical abstraction AI specializing in  │     │
│ │  healthcare-associated infections. Your worldview:  │     │
│ │  - NHSN definitions are authoritative               │     │
│ │  - Evidence-based reasoning required                │     │
│ │  - Key signals: device days, organism type, ..."    │     │
│ │                                                       │     │
│ │ [Edit system prompt]                                │     │
│ │                                                       │     │
│ │ TASKS:                                               │     │
│ │                                                       │     │
│ │ ┌────────────────────────────────────────────┐      │     │
│ │ │ clabsi.enrichment                          │      │     │
│ │ │ Type: enrichment                           │      │     │
│ │ │ Default mode: batch                        │      │     │
│ │ │                                             │      │     │
│ │ │ Prompt Versions:                           │      │     │
│ │ │ • v1.0 (stable, active) - 245 cases run    │      │     │
│ │ │ • v1.1 (experimental) - 12 test cases      │      │     │
│ │ │ • v0.9 (deprecated)                        │      │     │
│ │ │                                             │      │     │
│ │ │ [Manage versions] [Deploy v1.1 to stable]  │      │     │
│ │ └────────────────────────────────────────────┘      │     │
│ │                                                       │     │
│ │ ┌────────────────────────────────────────────┐      │     │
│ │ │ clabsi.abstraction                         │      │     │
│ │ │ Type: abstraction                          │      │     │
│ │ │ Default mode: interactive                  │      │     │
│ │ │                                             │      │     │
│ │ │ Prompt Versions:                           │      │     │
│ │ │ • v1.0 (stable, active) - 230 cases run    │      │     │
│ │ │ • v1.2 (experimental) - 8 test cases       │      │     │
│ │ │                                             │      │     │
│ │ │ [Manage versions]                          │      │     │
│ │ └────────────────────────────────────────────┘      │     │
│ │                                                       │     │
│ │ [Add new task]                                      │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                                │
│ [Add new concern]                                             │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Purpose:**
- Manage system prompts per concern
- Manage tasks per concern
- Version control for prompts
- Deploy experimental → stable
- View performance metrics per version

**This is optional** but shows how the Concern → Task → PromptVersion model extends to management UI.

---

### 2.3 Pipeline Visualization

**Goal:** Make the pipeline **visible and understandable** at every stage.

**Approach:** Horizontal stepper bar at top of Case Workbench.

**Visual Design (implementation-agnostic):**

```
┌───────────────────────────────────────────────────────────────┐
│                                                                │
│  ①──────→  ②──────→  ③──────→  ④                             │
│  Context  Enrich   Abstract  Feedback                         │
│                                                                │
│  ✓ Done   ✓ Done   In prog.  Pending                         │
│                                                                │
│           v1.0      v1.0                                      │
│           batch     interact.                                 │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**States:**
- **Context:** Always available
- **Enrichment:**
  - ✓ Done (green checkmark + version badge)
  - ⏳ In progress (spinner)
  - ⚠️ Failed (warning icon)
  - ⏺️ Not started (gray circle)
- **Abstraction:** Same states
- **Feedback:** Pending / Submitted

**Interaction:**
- Click any stage → scroll to that section
- Hover on stage → tooltip with task metadata
- Visual arrow between stages shows task version

**On mobile/small screen:**
- Vertical layout
- Collapsible sections match pipeline stages

**Alternative (tabbed view):**
```
┌───────────────────────────────────────────────────────────────┐
│  [Context] [Enrichment ✓ v1.0] [Abstraction ✓ v1.0] [Feedback]│
└───────────────────────────────────────────────────────────────┘
│ Content of selected tab displayed below...                   │
```

**Recommendation:** Stepper at top + sections on same page (not tabs). Tabs hide the pipeline; sections with scroll keep it visible.

---

### 2.4 Demo Mode Behavior

**Goal:** Clearly signal demo mode while still teaching the CA Factory model.

**Visual Indicators:**

**1. Demo badge (persistent):**
```
┌───────────────────────────────────────────────────────────────┐
│ CA FACTORY                               🎭 DEMO MODE - Sample│
│                                             Data (No Real PHI) │
└───────────────────────────────────────────────────────────────┘
```

**2. Demo entry point on home:**
```
┌──────────────────────────────────────────────────────────┐
│  💡 NEW TO CA FACTORY?                                   │
│                                                           │
│  Try our interactive demo with a sample CLABSI case.    │
│  Learn how CA Factory processes cases from raw context  │
│  through enrichment and abstraction.                    │
│                                                           │
│  [Open CLABSI Demo Case →]                              │
└──────────────────────────────────────────────────────────┘
```

**3. Task metadata shows demo data:**
```
ℹ️ Enriched by clabsi.enrichment v1.0
  on Jan 20, 2024 10:00 AM (batch mode, system)
  🎭 Demo Mode: Using pre-computed results
  [In production, this would run against live data]
```

**4. Enrichment and abstraction are pre-computed but still treated as tasks:**

Even in demo mode, the JSON structure should be:

```json
{
  "case_id": "demo-case-001",
  "concern_id": "clabsi",

  "patient": { /* raw demo data */ },

  "enrichment": {
    "task_metadata": {
      "task_id": "clabsi.enrichment",
      "prompt_version": "v1.0",
      "mode": "batch",
      "executed_at": "2024-01-20T10:00:00Z",
      "demo_mode": true
    },
    "summary": { /* pre-computed for demo */ },
    "signal_groups": [ /* pre-computed */ ]
  },

  "abstraction": {
    "task_metadata": {
      "task_id": "clabsi.abstraction",
      "prompt_version": "v1.0",
      "mode": "interactive",
      "executed_at": "2024-01-20T14:30:00Z",
      "demo_mode": true
    },
    "narrative": "...",
    "criteria_evaluation": { /* pre-computed */ }
  }
}
```

**Why:** Even though it's demo, the structure teaches the model.

**5. Interactive Q&A still works:**
- User can ask questions
- Mock LLM adapter responds
- Responses include task context:
  ```json
  {
    "answer": "...",
    "task_context": {
      "task_id": "clabsi.abstraction",
      "prompt_version": "v1.0",
      "demo_mode": true
    }
  }
  ```

**6. Demo flow respects pipeline:**

Instead of:
```
POST /api/demo/context → returns everything
```

Use:
```
POST /api/demo/enrich → returns enrichment section
POST /api/demo/abstract → returns abstraction section
```

Even if pre-computed, the API flow teaches the pipeline.

---

## PART 3: MAPPING CRITIQUE → SOLUTION

### Divergence 1: **Missing Task as First-Class Concept**

**Critique Finding:**
- Implementation has agents, not tasks
- No task registry or task library
- Tasks are not addressable, versionable, executable

**Architecture Fix:**
- ✅ **1.1** Introduces Task entity with task_id, task_type, prompt_versions
- ✅ **1.1** Shows how agents fit under tasks as implementation details
- ✅ **1.1** Task execution records per case with metadata

**UI Fix:**
- ✅ **2.2.1** Home screen lists Tasks per Concern
- ✅ **2.2.2** Case list shows task completion state
- ✅ **2.2.3** Case workbench displays task metadata prominently
- ✅ **2.3** Pipeline visualization shows task flow

**Result:** Tasks are now visible, addressable, and understandable to users.

---

### Divergence 2: **Enrichment is Invisible**

**Critique Finding:**
- Enrichment has no representation in system
- Signals appear pre-existing, not computed
- No enrichment stage indicator
- No enrichment summary

**Architecture Fix:**
- ✅ **1.2** Case object has explicit `enrichment` section with task metadata
- ✅ **1.2** clinical_signals → enrichment.signal_groups (structured output)
- ✅ **1.2** timeline_phases → enrichment.timeline_phases
- ✅ **1.2** New: enrichment.summary explaining what was found

**UI Fix:**
- ✅ **2.2.3 Section B** Entire section dedicated to Enrichment
- ✅ **2.2.3 Section B** Shows: task metadata, enrichment summary, signal groups with confidence
- ✅ **2.2.3 Section B** Action: "Re-run enrichment with v1.1"
- ✅ **2.3** Pipeline visualization shows Enrichment as Stage 2

**Result:** Enrichment is now a first-class, visible stage with clear value.

---

### Divergence 3: **JSON Structure Mixes Raw and Enriched Data**

**Critique Finding:**
- Flat JSON obscures pipeline
- clinical_signals look like raw input
- No task attribution

**Architecture Fix:**
- ✅ **1.2** Explicit 4-section structure: patient, enrichment, abstraction, qa
- ✅ **1.2** Field mapping showing where current fields belong
- ✅ **1.2** Example restructured JSON with task metadata

**UI Fix:**
- ✅ **2.2.3** UI mirrors data structure: Section A (patient), Section B (enrichment), Section C (abstraction)
- ✅ **2.2.3** Each section shows corresponding data from JSON

**Result:** Data structure reflects pipeline; UI makes it obvious.

---

### Divergence 4: **API Endpoints Don't Encode Task Semantics**

**Critique Finding:**
- Endpoints are generic (ask, rules, evidence)
- No task metadata in responses

**Architecture Fix:**
- ✅ **1.3** Response envelope standard with task_context
- ✅ **1.3** Option B: Keep endpoints, add task metadata to responses
- ✅ **1.3** Demo endpoints split: /demo/enrich + /demo/abstract

**UI Fix:**
- ✅ **2.2.3** UI displays task metadata from API responses
- ✅ **2.1 Journey 3** Demo flow uses separate enrich/abstract calls

**Result:** API responses teach the model even if endpoint names stay generic.

---

### Divergence 5: **Prompt Versioning Exists But Isn't Exposed**

**Critique Finding:**
- Versions in config but not visible to users
- Can't see which version answered question

**Architecture Fix:**
- ✅ **1.1** Task entity has prompt_versions array with version_id, status, changelog
- ✅ **1.3** API responses include prompt_version in task_context

**UI Fix:**
- ✅ **2.2.2** Case list shows version badges: "✓ Enriched v1.0"
- ✅ **2.2.3** Task metadata displays: "by clabsi.enrichment v1.0"
- ✅ **2.2.5** Admin UI (optional) manages versions

**Result:** Versions are surfaced everywhere—users know which version did what.

---

### Divergence 6: **Demo Flow Obscures the Pipeline**

**Critique Finding:**
- /demo/abstract does everything at once
- "Context" ≠ "Enrichment"
- Teaches wrong pattern

**Architecture Fix:**
- ✅ **1.3** Demo endpoints split: /enrich, /abstract
- ✅ **2.4** Demo mode respects pipeline even with pre-computed data

**UI Fix:**
- ✅ **2.1 Journey 3** Demo explicitly walks through Context → Enrich → Abstract
- ✅ **2.2.3** Demo case displays enrichment and abstraction as separate stages
- ✅ **2.4** Demo badge + metadata show it's pre-computed but structured correctly

**Result:** Demo teaches the pipeline, not a magic black box.

---

### Divergence 7: **UI Doesn't Teach the Pipeline**

**Critique Finding:**
- Dashboard view (all data at once)
- No stage progression
- Feels like magic

**Architecture Fix:**
- N/A (this is pure UI)

**UI Fix:**
- ✅ **2.2.3** Case workbench has 3 clearly labeled sections matching pipeline
- ✅ **2.3** Pipeline visualization at top (stepper bar)
- ✅ **2.1 Journey 1** User flow explicitly moves through stages
- ✅ **2.1 Journey 3** Demo animates progression

**Result:** UI is now workflow-driven, not dashboard-driven.

---

### Divergence 8: **Batch vs Interactive Not Visible**

**Critique Finding:**
- All interactions feel synchronous
- No batch enrichment concept

**Architecture Fix:**
- ✅ **1.4** Enrichment default mode: batch, can re-run on-demand
- ✅ **1.4** Abstraction default mode: interactive, can pre-generate
- ✅ **1.1** task_metadata includes mode field

**UI Fix:**
- ✅ **2.2.2** Case list shows: "Enriched (batch, Jan 20)"
- ✅ **2.2.3** Task metadata shows: "batch mode, system" vs "interactive, nurse.jane"
- ✅ **2.2.3** Action: "Re-run enrichment" (on-demand mode)

**Result:** Users understand batch enrichment and interactive abstraction.

---

## SUMMARY: FROM DIAGNOSIS TO TREATMENT

### What We Changed (Conceptually):

**Architecture:**
1. Introduced **Task** as organizing principle (not agents)
2. Structured case data into **4 sections** (patient, enrichment, abstraction, qa)
3. Added **task execution metadata** everywhere
4. Made **enrichment** explicit with summary + signal_groups
5. Embedded **prompt versioning** in task metadata
6. Split **demo endpoints** to teach pipeline
7. Defined **batch vs interactive** modes clearly

**UI:**
1. **Pipeline visualization** (stepper bar)
2. **Three-section workbench** (Context → Enrichment → Abstraction)
3. **Task metadata badges** on every AI output
4. **Version tags** on case list and workbench
5. **Enrichment summary panel** showing value add
6. **Demo mode** that respects pipeline structure
7. **User journeys** that teach the model

### What Users Now Learn:

✅ "CA Factory is organized around **Concerns** (CLABSI, CAUTI)"
✅ "Each Concern has **Tasks** (Enrichment, Abstraction)"
✅ "Each Task has **versioned prompts** (v1.0, v1.1)"
✅ "The pipeline is: **Raw Context → Enrichment → Abstraction → Feedback**"
✅ "**Enrichment** extracts signals and creates structure from raw data"
✅ "Enrichment runs in **batch** by default, abstraction is **interactive**"
✅ "I can see **which version** handled each task"
✅ "I can **re-run tasks** with different versions"

### Result:

The reference implementation now **teaches the CA Factory model** instead of obscuring it.

---

*End of Treatment Plan — Ready for handoff to designers and engineers*
