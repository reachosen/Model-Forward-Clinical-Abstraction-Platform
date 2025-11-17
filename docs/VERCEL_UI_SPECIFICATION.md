# CA Factory UI Specification for Vercel Team
## Interface & Component Inventory (Repo-Aware)

**Document Purpose**: Provide Vercel design & React implementation team with a clear, exhaustive list of interfaces and UI components needed to align the UI with the CA Factory Treatment Plan.

**This is NOT code** - it's a specification document mapping requirements to implementation.

---

## 1. Spec → Current Implementation Mapping

| Spec Interface (from CA_FACTORY_TREATMENT_PLAN.md) | Current Implementation (file/path) | Status | Notes for Vercel |
|-----------------------------------------------------|-------------------------------------|---------|------------------|
| **Home / Concern Selection** | None | **MISSING** | New page needed. Currently app defaults to CLABSI domain. Need concern switcher as entry point showing CLABSI, CAUTI, SSI cards with tasks listed. |
| **Case List** | `pages/CaseListPage.tsx` | **PARTIAL** | Exists but lacks task metadata badges. Shows cases but not enrichment/abstraction status. Need to add: task state badges ("✓ Enriched v1.0"), version tags, task completion indicators. |
| **Case Workbench (Context + Enrichment + Abstraction)** | `pages/CaseViewPage.tsx` | **PARTIAL** | Exists but organized as dashboard view, not pipeline. Need major refactor to add: (1) Pipeline stepper at top (2) Three distinct sections A/B/C (3) Task metadata badges (4) Enrichment summary section (5) Re-run task actions. |
| **Enrichment Section** | `components/SignalsPanel.tsx` (partial) | **PARTIAL** | Signals panel exists but: (1) No task metadata display (2) No enrichment summary (3) Doesn't show "what enrichment found" (4) No version info (5) No "re-run" action. |
| **Abstraction Section** | `components/AskTheCasePanel.tsx`, `components/QAPanel.tsx` (scattered) | **PARTIAL** | Q&A functionality exists but: (1) Not labeled as "Abstraction" (2) No task metadata (3) No clinical narrative display (4) Criteria evaluation split into separate RuleEvaluationPage. |
| **Task History View** | None | **MISSING** | Need new component/drawer showing chronological task execution history with metadata (task_id, version, mode, executed_at, executed_by, status). |
| **Rules / Criteria Detail View** | `pages/RuleEvaluationPage.tsx` | **PARTIAL** | Exists as separate page. Treatment Plan suggests this should be integrated into Abstraction section or available as detail view (not separate page). Shows criteria but lacks task attribution. |
| **Demo Mode Entry + Banner** | None (implicit via mode flag) | **PARTIAL** | Code has demo mode detection but: (1) No dedicated demo landing page (2) No clear demo badge in header (3) No "Try CA Factory Demo" entry point (4) Need explicit demo banner throughout. |
| **Admin / Prompt Management** | None | **MISSING** | Optional feature. Not in current implementation. Would need entire admin section for concern/task/version management. |
| **Pipeline Visualization** | None | **MISSING** | Critical gap. No visual representation of Context → Enrichment → Abstraction → Feedback flow. Need stepper component. |
| **Task Metadata Badge/Display** | None | **MISSING** | Need reusable component to display: "Enriched by clabsi.enrichment v1.0 on Jan 20, 2024 (batch mode, system)". Used throughout UI. |
| **Enrichment Summary Panel** | None | **MISSING** | Need component to display AI-generated enrichment summary: "Identified 12 signals in 4 groups. Key findings: ...". Distinct from signal list. |

---

## 2. Page-Level Interfaces for Vercel

### Page 1: ConcernSelectionPage (HOME)

**Route**: `/`

**Type**: **NEW PAGE**

**Purpose**: Entry point for choosing clinical concern (CLABSI, CAUTI, SSI).

**Treatment Plan Alignment**: Section 2.2.1 - Home / Concern Selection

**What to Show** (3-5 bullets):
- Display 3 concern cards (CLABSI, CAUTI, SSI) with brief descriptions
- Each card shows: concern name, description, available tasks (Enrichment, Abstraction), case count
- Prominent "Demo Mode" entry point: "Try CLABSI Demo Case" button
- Lightweight system prompt preview (tooltip or expandable)
- User can click concern card → navigate to Case List for that concern

**Replaces**: Currently app hard-codes CLABSI via `<DomainConfigProvider initialDomain="CLABSI">` in App.tsx. This page makes concern selection explicit.

**Data Needed**:
- List of concerns with: concern_id, display_name, description, task_list, case_count
- Demo case availability per concern

---

### Page 2: CaseListPage (PER CONCERN)

**Route**: `/concern/:concernId/cases` (or keep `/` if concern selected via context)

**Type**: **REFACTOR OF EXISTING PAGE** (`pages/CaseListPage.tsx`)

**Purpose**: Browse cases for selected concern, showing task completion state.

**Treatment Plan Alignment**: Section 2.2.2 - Case List

**What to Show**:
- Page header: "[Concern Name] Cases for Review" with back link to concern selection
- Filter sidebar with NEW filters: "Task State" (All / Enriched Only / Needs Abstraction / Abstraction Complete), "Version" (All / v1.0 / v1.1)
- Case cards showing:
  - **NEW**: Task state badges: "✓ Enriched v1.0 (batch, Jan 20)" and "✓ Abstracted v1.0 (interactive, Jan 20)"
  - **NEW**: Task completion indicators: ✓ Done, ⏳ Needs abstraction, ⚠️ Enrichment failed
  - **Existing**: Patient 80/20 summary, risk level, determination (if abstracted)
- Grid layout (current implementation OK, just add badges)

**Currently Missing**:
- Task state badges on case cards (`EnhancedCaseCard.tsx` lacks enrichment/abstraction status)
- Filters for task state
- Version tags

**Data Contract**:
Each case card receives:
```
{
  case_id, concern_id,
  patient_summary_80_20: { demographics, brief_synopsis },
  enrichment_state: { task_id, version, mode, executed_at, status },
  abstraction_state: { task_id, version, mode, executed_at, executed_by, status },
  determination: { result, confidence },
  risk_level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW"
}
```

---

### Page 3: CaseWorkbenchPage (MAIN SCREEN)

**Route**: `/case/:caseId` (or `/concern/:concernId/case/:caseId`)

**Type**: **MAJOR REFACTOR OF EXISTING PAGE** (`pages/CaseViewPage.tsx`)

**Purpose**: Primary workspace for reviewing a case. MUST visualize the pipeline.

**Treatment Plan Alignment**: Section 2.2.3 - Case Workbench

**What to Show**:
1. **NEW: Pipeline Stepper Bar (top)**:
   - Visual horizontal stepper: [1 Context] → [2 Enrichment] → [3 Abstraction] → [4 Feedback]
   - Each stage shows status: ✓ Done, ⏳ In progress, ⚠️ Failed, ⏺️ Not started
   - Version badges on arrows between stages
   - Clickable to navigate sections

2. **Section A: Patient Context** (collapsible):
   - **Existing**: 80/20 summary strip (`CaseSummaryStrip`)
   - **Existing**: Demographics, timeline, raw data panels
   - **Minimal changes**: This section mostly OK as-is, just label as "Section A: Patient Context"

3. **Section B: Enrichment** (collapsible) - **MAJOR NEW SECTION**:
   - **NEW**: Task metadata badge at top: "ℹ️ Enriched by clabsi.enrichment v1.0 on Jan 20, 2024 (batch mode, system)"
   - **NEW**: Enrichment Summary panel: "Identified 12 signals across 4 groups. Key findings: ..."
   - **REFACTOR**: SignalsPanel - keep existing but add group confidence badges
   - **REFACTOR**: TimelinePanel - add phase labels from enrichment
   - **NEW**: Actions: [Re-run with v1.1] [View task details]

4. **Section C: Abstraction & Feedback** (collapsible) - **MAJOR REFACTOR**:
   - **NEW**: Task metadata badge at top: "ℹ️ Abstraction by clabsi.abstraction v1.0 on Jan 20, 2024 (interactive, nurse.jane)"
   - **NEW**: Clinical Narrative display (from abstraction.narrative)
   - **MOVE HERE**: NHSN Criteria evaluation (currently in separate RuleEvaluationPage)
   - **KEEP**: Ask-the-Case panel (`AskTheCasePanel`)
   - **KEEP**: Q&A history (`QAPanel` or `InterrogationPanel`)
   - **KEEP**: Feedback panel (`FeedbackPanel`)
   - **NEW**: [View detailed criteria] [View Q&A history: 3 interactions]

**Currently Organized As**: Dashboard with panels side-by-side. All data shown at once.

**Need to Reorganize As**: Pipeline with 3 sequential sections. Stepper shows progress.

**Components to Reuse**:
- `CaseSummaryStrip` → Section A
- `CaseOverview` → Section A
- `EnhancedTimeline` → Section A/B (add phase labels)
- `SignalsPanel` → Section B (add task metadata, enrichment summary above it)
- `AskTheCasePanel` → Section C
- `QAPanel` or `InterrogationPanel` → Section C
- `FeedbackPanel` → Section C

**Components to Create**:
- `PipelineStepper` (new) → Top of page
- `TaskMetadataBadge` (new) → Used in Sections B and C
- `EnrichmentSummaryPanel` (new) → Section B
- `ClinicalNarrativePanel` (new) → Section C
- `CriteriaEvaluationPanel` (refactor from RuleEvaluationPage) → Section C

---

### Page 4: CriteriaDetailView

**Route**: `/case/:caseId/criteria` OR modal/drawer within CaseWorkbenchPage

**Type**: **REFACTOR OF EXISTING PAGE** (`pages/RuleEvaluationPage.tsx`) → Consider making it a modal/drawer instead

**Purpose**: Deep dive into NHSN criteria evaluation.

**Treatment Plan Alignment**: Section 2.2.4 - Rules / Criteria View

**What to Show**:
- **Keep**: Detailed criteria checklist with evidence per criterion
- **Add**: Task metadata at top: "Evaluated by clabsi.abstraction v1.0 on..."
- **Add**: Clear link back: "This used enrichment output from clabsi.enrichment v1.0"
- **Add**: Determination banner at top
- **Keep**: Evidence sources, NHSN references, evaluation logic per criterion

**Design Decision for Vercel**: Is this a separate page or a modal/drawer from Case Workbench Section C? Treatment Plan suggests it should feel like a "zoom-in" on abstraction, not a separate destination.

**Recommendation**: Make it a **drawer or expandable panel within Section C** rather than a separate route.

---

### Page 5: TaskHistoryDrawer (NEW)

**Route**: Drawer/tab within CaseWorkbenchPage (not a separate route)

**Type**: **NEW COMPONENT** (drawer or tab)

**Purpose**: Show chronological task execution history for the case.

**Treatment Plan Alignment**: Section 1.4 - Task History View

**What to Show**:
- Timeline of all task executions for this case
- Each entry shows: task_id, task_type, version, mode, executed_at, executed_by, status, summary
- For each execution: expandable to see full output, performance metrics
- Comparison view: "Compare v1.0 vs v1.1" for same task type
- Accessed via: Button in Case Workbench header or tab in pipeline stepper

**Data Structure**:
```
task_executions: [
  {
    execution_id, task_id, task_type, prompt_version, mode,
    executed_at, executed_by, status,
    result_summary: { confidence, key_metrics },
    performance: { latency_ms, tokens_used }
  }
]
```

---

### Page 6: DemoEntry / Landing (NEW)

**Route**: `/demo` or `/` with demo mode query param

**Type**: **NEW PAGE**

**Purpose**: Dedicated entry point for demo mode with clear explanation.

**Treatment Plan Alignment**: Section 2.1 Journey 3 - Demo Mode, Section 2.4 - Demo Mode Behavior

**What to Show**:
- Large banner: "CA Factory Demo - Learn How Clinical Abstraction Works"
- Explanation: "This demo uses sample data (no real PHI) to show how CA Factory processes cases from raw context through enrichment and abstraction."
- Demo case cards: "CLABSI Demo Case (Positive)", "CLABSI Demo Case (Negative)"
- [Start Demo] button → takes user to Case Workbench in demo mode
- Clear visual distinction: Demo badge, different color scheme

**Alternative**: Instead of separate page, add demo entry on Home page (ConcernSelectionPage) as a highlighted section.

---

### Page 7 (OPTIONAL): AdminPage - Prompt Management

**Route**: `/admin/concerns` or `/admin/tasks`

**Type**: **NEW PAGE** (optional, internal use only)

**Purpose**: Manage concerns, tasks, and prompt versions.

**Treatment Plan Alignment**: Section 2.2.5 - Admin / Prompt Management

**What to Show**:
- List of concerns with editable system prompts
- Per concern: List of tasks with version management
- Prompt version control: stable, experimental, deprecated
- Deploy version controls: "Promote v1.1 to stable"
- Performance metrics per version

**Priority**: LOW - Not user-facing initially. Can defer to post-launch.

---

## 3. Component-Level Interfaces (Key Building Blocks)

### Component 1: PipelineStepper

**Purpose**: Visual stepper showing Context → Enrichment → Abstraction → Feedback pipeline.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Top of CaseWorkbenchPage

**What to Preserve**: N/A (new)

**New Behavior**:
- Horizontal stepper with 4 stages
- Each stage shows: number, label, status icon (✓ ⏳ ⚠️ ⏺️)
- Arrows between stages show task version badges ("v1.0", "batch")
- Clickable stages scroll to corresponding section
- Responsive: vertical on mobile

**Props (conceptual)**:
```
{
  stages: [
    { id: 'context', label: 'Context', status: 'complete' },
    { id: 'enrichment', label: 'Enrichment', status: 'complete',
      taskMetadata: { task_id, version, mode } },
    { id: 'abstraction', label: 'Abstraction', status: 'in_progress',
      taskMetadata: { task_id, version, mode } },
    { id: 'feedback', label: 'Feedback', status: 'pending' }
  ],
  currentStage: 'abstraction',
  onStageClick: (stageId) => void
}
```

**Design Notes**:
- Should feel like a progress tracker
- Status colors: green (done), blue (in progress), yellow (failed), gray (pending)
- Compact but informative

---

### Component 2: TaskMetadataBadge

**Purpose**: Small info box showing task execution metadata.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Section B (Enrichment), Section C (Abstraction), Task History entries

**What to Preserve**: N/A (new)

**New Behavior**:
- Display formatted task metadata: "ℹ️ Enriched by clabsi.enrichment v1.0 on Jan 20, 2024 10:00 AM (batch mode, system)"
- Show confidence score if available
- Clickable to expand full task details
- Optional demo badge: "🎭 Demo Mode"

**Props (conceptual)**:
```
{
  taskMetadata: {
    task_id: string,
    task_type: "enrichment" | "abstraction" | "qa",
    prompt_version: string,
    mode: "batch" | "interactive" | "on_demand",
    executed_at: timestamp,
    executed_by: string,
    status: "completed" | "in_progress" | "failed",
    confidence?: number,
    demo_mode?: boolean
  },
  onViewDetails?: () => void
}
```

**Styling**: Info box with icon, subdued colors, clear typography

---

### Component 3: CaseSummaryCard (for Case List)

**Purpose**: Case card in Case List showing 80/20 summary + task state badges.

**Similar Component in Repo**: `components/EnhancedCaseCard.tsx` - **REFACTOR THIS**

**Where Used**: CaseListPage grid

**What to Preserve**:
- Current card layout, patient summary, risk level indicator
- Click handler to navigate to case

**What to Add**:
- Task state badges below summary: "✓ Enriched v1.0 (batch, Jan 20)" + "✓ Abstracted v1.0 (interactive, Jan 20)"
- Task status icons: ✓ ⏳ ⚠️
- Version tags (small pills)

**What to Replace**: Nothing - pure addition

**Props (add to existing)**:
```
{
  ...existing props,
  enrichmentState: { task_id, version, mode, executed_at, status },
  abstractionState: { task_id, version, mode, executed_at, executed_by, status }
}
```

---

### Component 4: EnrichmentSummaryPanel

**Purpose**: Display AI-generated summary of what enrichment found.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Section B (Enrichment) of CaseWorkbenchPage, above SignalsPanel

**What to Preserve**: N/A (new)

**New Behavior**:
- Show enrichment summary text: "Identified 12 clinical signals across 4 signal groups. Key findings: ..."
- List key findings as bullets
- Show summary stats: signals count, groups count, confidence
- Distinct visual styling from signal list below

**Props (conceptual)**:
```
{
  enrichmentSummary: {
    signals_identified: number,
    signal_groups_count: number,
    timeline_phases_identified: number,
    key_findings: string[],
    confidence: number
  }
}
```

**Design Notes**: Should answer "What did enrichment do?" before showing the detailed signal list.

---

### Component 5: SignalsPanel (ENHANCED)

**Purpose**: Display clinical signals grouped by type.

**Similar Component in Repo**: `components/SignalsPanel.tsx` - **REFACTOR THIS**

**Where Used**: Section B (Enrichment) of CaseWorkbenchPage

**What to Preserve**:
- Current signal grouping logic (DEVICE, LAB, VITAL, etc.)
- Collapsible groups
- Signal cards with evidence drawers
- Group confidence badges (recently added)

**What to Add**:
- Above the signal list: EnrichmentSummaryPanel (separate component)
- Group-level confidence badges more prominent (already partially done)
- Visual indication this is enrichment output (not raw data)

**What to Replace**: Nothing - enhancements only

**Props (already supports)**:
```
{
  signals?: Signal[], // Legacy format
  signalGroups?: SignalGroup[], // Structured format (already added)
  taskMetadata?: TaskMetadata // NEW: to show this is enrichment output
}
```

**Note**: Component already supports signal_groups from structured cases (see lines 12-14, 66-85). Just need to add task metadata display above it.

---

### Component 6: TimelinePanel (ENHANCED)

**Purpose**: Display timeline with phases from enrichment.

**Similar Component in Repo**: `components/TimelinePanel.tsx` or `components/EnhancedTimeline.tsx` - **REFACTOR THIS**

**Where Used**: Section A/B (border between Context and Enrichment)

**What to Preserve**:
- Current timeline visualization
- Event markers, temporal relationships

**What to Add**:
- **Timeline phases** from enrichment (Device Placement, Infection Window, Symptom Onset, Diagnostic Workup)
- Phase labels and visual separation
- Indication that phases are computed by enrichment task

**Props (add to existing)**:
```
{
  ...existing props,
  timelinePhases?: {
    phase_id: string,
    phase_name: string,
    start_date: string,
    end_date: string,
    events_in_phase: number,
    significance: string
  }[]
}
```

---

### Component 7: ClinicalNarrativePanel

**Purpose**: Display AI-generated clinical narrative from abstraction.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Section C (Abstraction) of CaseWorkbenchPage

**What to Preserve**: N/A (new)

**New Behavior**:
- Display narrative text with clear typography
- Show as distinct section before criteria evaluation
- Optional: Highlight key phrases with evidence links

**Props (conceptual)**:
```
{
  narrative: string,
  confidence?: number,
  taskMetadata: TaskMetadata
}
```

**Design Notes**: Should read like a clinical summary, professional formatting.

---

### Component 8: CriteriaEvaluationPanel

**Purpose**: Display NHSN criteria checklist with evidence.

**Similar Component in Repo**: `pages/RuleEvaluationPage.tsx` - **EXTRACT AND REFACTOR** into component

**Where Used**: Section C (Abstraction) of CaseWorkbenchPage

**What to Preserve**:
- Criteria checklist with met/not met indicators
- Evidence per criterion
- NHSN references

**What to Add**:
- Task metadata at top: "Evaluated by clabsi.abstraction v1.0"
- Compact view by default, expandable for details
- Overall determination banner

**What to Replace**: Convert from full page to embeddable panel component

**Props (conceptual)**:
```
{
  criteriaEvaluation: {
    determination: string,
    confidence: number,
    criteria_met: {
      [criterion_id]: {
        met: boolean,
        evidence: string,
        confidence: number
      }
    },
    criteria_total: number,
    criteria_met_count: number
  },
  taskMetadata: TaskMetadata,
  onViewDetailed?: () => void // Opens modal/drawer with full details
}
```

---

### Component 9: AskTheCasePanel (ENHANCED)

**Purpose**: Interactive Q&A interface.

**Similar Component in Repo**: `components/AskTheCasePanel.tsx` - **REFACTOR THIS**

**Where Used**: Section C (Abstraction) of CaseWorkbenchPage

**What to Preserve**:
- Question input box
- Suggested questions
- Answer display with citations

**What to Add**:
- Task context in responses: "Answered by clabsi.abstraction v1.0"
- Q&A history count indicator
- Link to full history view

**Props (add to existing)**:
```
{
  ...existing props,
  taskMetadata?: TaskMetadata, // Show which task is answering
  qaHistoryCount?: number // "3 previous questions"
}
```

---

### Component 10: InterrogationPanel (QA History)

**Purpose**: Display QA history with mode indicators.

**Similar Component in Repo**: `components/InterrogationPanel.tsx` - **ALREADY EXISTS** - use this!

**Where Used**: Section C (Abstraction) or Task History drawer

**What to Preserve**: Component already supports QA history display with mode icons, confidence badges, citations (see reference-implementation/react/src/components/InterrogationPanel.tsx)

**What to Add**:
- Integrate into Case Workbench Section C
- Show task metadata for each Q&A entry

**Status**: Component is already built and aligned with Treatment Plan! Just needs to be integrated into CaseWorkbenchPage.

---

### Component 11: FeedbackPanel

**Purpose**: Clinician feedback collection.

**Similar Component in Repo**: `components/FeedbackPanel.tsx` - **KEEP AS-IS**

**Where Used**: Section C (Abstraction) or Section D (Feedback) of CaseWorkbenchPage

**What to Preserve**: All current functionality (confirm/dispute, comments)

**What to Add**: Minimal changes - just ensure it's labeled as part of Feedback stage

---

### Component 12: TaskHistoryTimeline

**Purpose**: Chronological list of task executions.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Task History drawer/tab in CaseWorkbenchPage

**What to Preserve**: N/A (new)

**New Behavior**:
- Vertical timeline of task executions
- Each entry: task icon, metadata, summary, status
- Expandable entries show full output
- Comparison mode: side-by-side view of two versions

**Props (conceptual)**:
```
{
  taskExecutions: Array<{
    execution_id: string,
    task_id: string,
    task_type: string,
    prompt_version: string,
    mode: string,
    executed_at: timestamp,
    executed_by: string,
    status: string,
    result_summary: object,
    performance: { latency_ms, tokens_used }
  }>,
  onCompareVersions?: (exec1, exec2) => void
}
```

---

### Component 13: DemoBanner

**Purpose**: Persistent demo mode indicator.

**Similar Component in Repo**: NONE - **NEW COMPONENT**

**Where Used**: Header of all pages when in demo mode

**What to Preserve**: N/A (new)

**New Behavior**:
- Top banner: "🎭 DEMO MODE - Using sample data (No real PHI)"
- Dismissible or persistent (recommend persistent)
- Different styling from production header

**Props (conceptual)**:
```
{
  demoCase?: string, // "CLABSI Positive Example"
  onExitDemo?: () => void
}
```

---

### Component 14: ConcernCard

**Purpose**: Concern selection card on home page.

**Similar Component in Repo**: NONE - **NEW COMPONENT** (DomainSwitcher exists but different purpose)

**Where Used**: ConcernSelectionPage (home)

**What to Preserve**: N/A (new)

**New Behavior**:
- Card showing concern name, description, tasks, case count
- Click to navigate to case list for that concern
- Demo case button per concern

**Props (conceptual)**:
```
{
  concern: {
    concern_id: string,
    display_name: string,
    description: string,
    tasks: string[], // ["Enrichment", "Abstraction"]
    case_count: number,
    demo_available: boolean
  },
  onClick: () => void,
  onDemoClick: () => void
}
```

---

## 4. Data Contracts Vercel Can Rely On

### 4.1 Structured Case Object (4 Sections)

Backend returns case data in this structure (already implemented):

```
StructuredCase: {
  case_id: string,
  concern_id: string,

  patient: {
    case_metadata: { ... },
    demographics: { ... },
    devices: [ ... ],
    lab_results: [ ... ],
    clinical_notes: [ ... ],
    clinical_events: [ ... ]
  },

  enrichment: {
    task_metadata: {
      task_id: string,              // e.g., "clabsi.enrichment"
      task_type: "enrichment",
      prompt_version: string,        // e.g., "v1.0"
      mode: "batch" | "on_demand",
      executed_at: timestamp,
      executed_by: string,           // "system" or user email
      status: "completed" | "in_progress" | "failed",
      duration_ms?: number,
      token_count?: number,
      demo_mode?: boolean
    },

    summary: {
      signals_identified: number,
      signal_groups_count: number,
      timeline_phases_identified: number,
      key_findings: string[],
      confidence: number
    },

    signal_groups: [
      {
        signal_type: string,         // "device", "lab", "vital_sign", etc.
        group_confidence: number,
        signals: [
          {
            signal_id: string,
            signal_name: string,
            value: any,
            timestamp: string,
            confidence: number
          }
        ]
      }
    ],

    timeline_phases: [
      {
        phase_id: string,
        phase_name: string,
        start_date: string,
        end_date: string,
        events_in_phase: number,
        significance: string
      }
    ]
  },

  abstraction: {
    task_metadata: {
      task_id: string,              // e.g., "clabsi.abstraction"
      task_type: "abstraction",
      prompt_version: string,
      mode: "interactive" | "batch",
      executed_at: timestamp,
      executed_by: string,
      status: "completed" | "in_progress" | "failed",
      demo_mode?: boolean
    },

    narrative: string,               // AI-generated clinical summary

    criteria_evaluation: {
      determination: string,          // e.g., "CLABSI_CONFIRMED"
      confidence: number,
      criteria_met: {
        [criterion_id]: {
          met: boolean,
          evidence: string,
          confidence: number
        }
      },
      criteria_total: number,
      criteria_met_count: number
    },

    qa_history: [
      {
        qa_id: string,
        question: string,
        answer: string,
        interrogation_context: {
          mode: "explain" | "summarize" | "validate",
          target_type: "criterion" | "signal" | "event" | "overall",
          target_id: string
        },
        citations: [ ... ],
        confidence: number,
        timestamp: string
      }
    ],

    exclusion_analysis: [ ... ]
  },

  qa: null                          // Future: QA task output
}
```

**Required Fields**: case_id, concern_id, patient, enrichment (if enriched), abstraction (if abstracted)

**Optional Fields**: qa, task performance metrics, demo_mode flags

**Note**: InterrogationPanel component already expects this qa_history structure (see components/InterrogationPanel.tsx).

---

### 4.2 Task Execution Metadata (Used Throughout UI)

Every AI-generated output includes task metadata:

```
TaskMetadata: {
  task_id: string,                  // REQUIRED: e.g., "clabsi.enrichment", "clabsi.abstraction"
  task_type: "enrichment" | "abstraction" | "interrogation" | "qa",  // REQUIRED
  prompt_version: string,            // REQUIRED: e.g., "v1.0", "v1.1"
  mode: "batch" | "interactive" | "on_demand",  // REQUIRED
  executed_at: timestamp,            // REQUIRED: ISO 8601
  executed_by: string,              // REQUIRED: "system" | user email
  status: "completed" | "in_progress" | "failed",  // REQUIRED
  confidence?: number,              // OPTIONAL: 0.0-1.0
  duration_ms?: number,             // OPTIONAL: performance metric
  token_count?: number,             // OPTIONAL: performance metric
  demo_mode?: boolean               // OPTIONAL: true if demo data
}
```

**Where Used**: Displayed in task metadata badges, task history, API responses.

---

### 4.3 Case List Item

Case list endpoint returns array of case summaries:

```
CaseListItem: {
  case_id: string,                  // REQUIRED
  concern_id: string,               // REQUIRED

  patient_summary: {                 // REQUIRED: 80/20 summary
    demographics: {
      age: number,
      gender: string
    },
    brief_synopsis: string          // e.g., "68M with PICC Day 5, S. aureus BSI"
  },

  enrichment_state: {                // REQUIRED if enriched, else null
    task_id: string,
    prompt_version: string,
    mode: "batch" | "on_demand",
    executed_at: timestamp,
    status: "completed" | "failed" | "in_progress"
  },

  abstraction_state: {               // REQUIRED if abstracted, else null
    task_id: string,
    prompt_version: string,
    mode: "interactive" | "batch",
    executed_at: timestamp,
    executed_by: string,
    status: "completed" | "failed" | "in_progress"
  },

  determination: {                   // OPTIONAL: null if not abstracted
    result: string,                  // e.g., "CLABSI_CONFIRMED"
    confidence: number
  },

  risk_level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW"  // REQUIRED
}
```

---

### 4.4 API Response Envelope

All API responses follow this envelope format (already implemented):

```
APIResponse: {
  success: boolean,

  data: {
    // Actual response data (varies by endpoint)
  },

  task_context?: {                   // OPTIONAL: included for task-related responses
    task_id: string,
    task_type: string,
    concern_id: string,
    prompt_version: string,
    mode: string,
    executed_at: timestamp
  },

  metadata?: {                       // OPTIONAL: performance metrics
    request_id: string,
    timestamp: string,
    latency_ms: number,
    tokens_used: number
  },

  error?: {                          // OPTIONAL: only present if success=false
    code: string,
    message: string,
    details: object
  }
}
```

---

### 4.5 Concern Configuration

Concern selection page expects:

```
ConcernConfig: {
  concern_id: string,                // e.g., "clabsi"
  display_name: string,              // e.g., "CLABSI"
  full_name: string,                 // e.g., "Central Line-Associated Bloodstream Infection"
  description: string,
  system_prompt_summary: string,     // Brief description of worldview

  tasks: [
    {
      task_id: string,
      task_type: string,
      display_name: string,
      description: string,
      default_mode: "batch" | "interactive"
    }
  ],

  case_count: number,                // Total cases for this concern
  demo_available: boolean
}
```

---

## 5. Clear To-Do List for Vercel

### A. PAGES TO (RE)DESIGN

#### New Pages
- [ ] **ConcernSelectionPage** (Home) - Concern cards with tasks listed, demo entry point
- [ ] **DemoLandingPage** (optional) - Dedicated demo entry with explanation, or integrate into home
- [ ] **AdminPage** (OPTIONAL, low priority) - Concern/task/version management for internal use

#### Pages to Refactor
- [ ] **CaseListPage** - Add task state badges, version tags, task completion filters
- [ ] **CaseWorkbenchPage** - MAJOR refactor: add pipeline stepper, reorganize into 3 sections A/B/C, add task metadata badges
- [ ] **RuleEvaluationPage** - Convert to component/drawer, integrate into CaseWorkbenchPage Section C

---

### B. COMPONENTS TO (RE)DESIGN

#### New Components (Create from Scratch)
- [ ] **PipelineStepper** - Horizontal stepper showing 4 stages with status
- [ ] **TaskMetadataBadge** - Info box displaying task execution metadata
- [ ] **EnrichmentSummaryPanel** - Display "what enrichment found" summary
- [ ] **ClinicalNarrativePanel** - Display AI-generated narrative
- [ ] **CriteriaEvaluationPanel** - Extract from RuleEvaluationPage, make embeddable
- [ ] **TaskHistoryTimeline** - Chronological task execution history
- [ ] **DemoBanner** - Persistent demo mode indicator
- [ ] **ConcernCard** - Concern selection card for home page

#### Components to Enhance (Keep and Refactor)
- [ ] **EnhancedCaseCard** (CaseSummaryCard) - Add task state badges, version tags
- [ ] **SignalsPanel** - Add enrichment summary above signal list, task metadata
- [ ] **TimelinePanel / EnhancedTimeline** - Add timeline phases from enrichment
- [ ] **AskTheCasePanel** - Add task metadata, Q&A history count

#### Components to Integrate (Already Built, Just Wire Up)
- [ ] **InterrogationPanel** - Already exists, integrate into CaseWorkbenchPage Section C
- [ ] **FeedbackPanel** - Keep as-is, ensure labeled as Feedback stage
- [ ] **StructuredCaseViewer** - Already exists, may replace parts of CaseViewPage

---

### C. STATES TO COVER

#### Pipeline States
- [ ] **Enrichment Not Started** - ⏺️ Not enriched yet
- [ ] **Enrichment In Progress** - ⏳ Enriching... (batch mode)
- [ ] **Enrichment Complete** - ✓ Enriched v1.0 (batch, timestamp)
- [ ] **Enrichment Failed** - ⚠️ Enrichment failed (needs review)
- [ ] **Abstraction Not Started** - ⏳ Needs abstraction
- [ ] **Abstraction In Progress** - User is interacting (interactive mode)
- [ ] **Abstraction Complete** - ✓ Abstracted v1.0 (interactive, user, timestamp)
- [ ] **Abstraction Failed** - ⚠️ Abstraction failed
- [ ] **Feedback Pending** - ⏳ Pending clinician feedback
- [ ] **Feedback Submitted** - ✓ Feedback submitted

#### Demo vs Production States
- [ ] **Demo Mode Active** - 🎭 Banner visible, pre-computed data, demo badge on task metadata
- [ ] **Production Mode** - Normal operation, real data, no demo indicators

#### Task Mode States
- [ ] **Batch Enrichment** - Enrichment run by system overnight
- [ ] **On-Demand Enrichment** - User-triggered re-run with new version
- [ ] **Interactive Abstraction** - User asking questions, criteria evaluated through interaction
- [ ] **Batch Abstraction** - Pre-generated abstraction (review mode)

#### Version States
- [ ] **Single Version (v1.0)** - Only one version executed
- [ ] **Multiple Versions (v1.0, v1.1)** - Show comparison option
- [ ] **Version Upgrade Available** - [Re-run with v1.1] action visible

#### Error States
- [ ] **Task Failed** - Display error message, retry action
- [ ] **Partial Data** - Some tasks complete, others pending/failed
- [ ] **No Data** - Case exists but no enrichment/abstraction yet

---

### D. ROUTING TO IMPLEMENT

**Proposed route structure** (for discussion with Vercel):

```
/                                    → ConcernSelectionPage (Home)
/concern/:concernId/cases            → CaseListPage
/concern/:concernId/case/:caseId     → CaseWorkbenchPage
/demo                                → DemoLandingPage (or query param ?demo=true)
/admin/concerns                      → AdminPage (optional)
```

**Alternative (simpler)**: Keep current structure, add concern selection at root:

```
/                                    → ConcernSelectionPage OR CaseListPage with concern context
/case/:caseId                        → CaseWorkbenchPage
/case/:caseId?demo=true              → CaseWorkbenchPage in demo mode
```

**Decision for Vercel**: Which routing approach aligns better with your deployment strategy?

---

### E. DATA FETCHING TO IMPLEMENT

**API Endpoints UI Will Call**:

1. **GET /concerns** - List of concerns with metadata
2. **GET /concern/:concernId/cases** - Case list for concern
3. **GET /case/:caseId/full** OR **POST /api/demo/context** - Full structured case
4. **POST /v1/task/{task_id}/interrogate** - Ask questions (already implemented)
5. **GET /v1/case/{case_id}/tasks** - Task execution history (already implemented)
6. **GET /v1/task/{task_id}** - Task details (already implemented)
7. **POST /api/demo/feedback** - Submit feedback (already implemented)

**Note**: Endpoints 4-7 already exist. Endpoints 1-3 may need backend implementation or can use existing `/cases` and `/api/demo/context` with concern filtering.

---

### F. DESIGN SYSTEM ELEMENTS

**Visual Design Needs**:

- [ ] **Pipeline Stage Colors** - Green (complete), Blue (in progress), Yellow/Red (failed), Gray (pending)
- [ ] **Task Metadata Badge Styling** - Info box with icon, subdued colors, clear hierarchy
- [ ] **Version Pill Styling** - Small badge showing "v1.0", "v1.1" with color coding (stable, experimental)
- [ ] **Demo Mode Styling** - Distinct color scheme, demo badge icon (🎭), banner treatment
- [ ] **Task State Icons** - ✓ ⏳ ⚠️ ⏺️ with consistent usage across UI
- [ ] **Section Headers** - Clear visual separation for Sections A/B/C in Case Workbench
- [ ] **Confidence Indicators** - Progress bars or percentage badges for confidence scores
- [ ] **Stepper Component Design** - Horizontal vs vertical, responsive behavior, active state treatment

---

### G. TESTING SCENARIOS

**UI Test Cases**:

1. **Pipeline Progression**: Load case with enrichment but no abstraction → verify stepper shows enrichment complete, abstraction pending
2. **Task Metadata Display**: Verify task metadata badges show correct version, mode, timestamp, executed_by
3. **Demo Mode**: Enter demo mode → verify banner appears, demo badges on task metadata, demo disclaimer visible
4. **Version Comparison**: Load case with v1.0 enrichment, re-run with v1.1 → verify both versions visible in task history, comparison option available
5. **Error States**: Simulate enrichment failure → verify ⚠️ icon, error message, retry action
6. **Responsive Design**: Test pipeline stepper on mobile → verify vertical layout
7. **Section Collapsing**: Verify Sections A/B/C can collapse/expand independently
8. **Task History**: Open task history drawer → verify chronological list, expandable entries, comparison mode

---

## 6. FINAL NOTES FOR VERCEL TEAM

### What to Focus On First (Priority Order)

**Phase 1: Foundation** (Week 1-2)
1. CaseWorkbenchPage refactor - add pipeline stepper, reorganize sections
2. TaskMetadataBadge component - used everywhere
3. EnrichmentSummaryPanel - critical missing piece
4. PipelineStepper component - visual anchor for pipeline

**Phase 2: Case List & Concerns** (Week 2-3)
5. ConcernSelectionPage - home entry point
6. CaseListPage enhancements - task state badges
7. DemoBanner and demo mode treatment

**Phase 3: Details & History** (Week 3-4)
8. TaskHistoryTimeline - audit trail
9. CriteriaEvaluationPanel - integrate into Section C
10. InterrogationPanel integration - already built, just wire up

**Phase 4: Polish & Admin** (Week 4+)
11. Responsive design, mobile optimization
12. AdminPage (optional, defer if needed)

### Key Architectural Decisions for Vercel

1. **Is RuleEvaluationPage a separate route or a modal/drawer?** Recommendation: Drawer within CaseWorkbenchPage Section C
2. **Is TaskHistory a tab or a drawer?** Recommendation: Drawer/expandable panel, not a separate tab
3. **Route structure**: Concern in URL or in app context? Recommendation: Keep simple, use concern context
4. **Demo mode**: Separate landing page or integrated into home? Recommendation: Integrated with clear entry point
5. **Stepper interaction**: Click to navigate sections or just visual indicator? Recommendation: Clickable for better UX

### Questions Vercel Should Ask Backend Team

1. **Is GET /concerns endpoint available?** If not, how to get list of concerns?
2. **Is enrichment.summary field populated?** Critical for EnrichmentSummaryPanel
3. **Is abstraction.narrative field populated?** Critical for ClinicalNarrativePanel
4. **Are task_metadata fields consistent across all responses?** Need reliable contract
5. **How to trigger re-run enrichment with new version?** New API endpoint needed?

### Existing Components to Leverage (Already Good)

- **InterrogationPanel** - Already aligned with Treatment Plan, just integrate
- **StructuredCaseViewer** - May replace parts of CaseViewPage
- **SignalsPanel** - Already supports signal_groups, just add enrichment summary above
- **FeedbackPanel** - Keep as-is
- **CaseSummaryStrip** - Good for Section A 80/20 summary

### Biggest Gaps to Fill

1. **No pipeline visualization** - Most critical gap
2. **No task metadata display** - Used throughout, needs component
3. **No enrichment summary** - Enrichment is invisible
4. **No concern selection** - Entry point missing
5. **No task history view** - Audit trail missing

---

**Document Status**: Ready for Vercel team review and implementation planning.

**Next Steps**:
1. Vercel reviews this spec
2. Answers architectural decisions
3. Confirms data contracts with backend team
4. Creates design mocks for new components
5. Implements in phases per priority order above

**Contact**: For questions or clarifications on backend data contracts, refer to IMPLEMENTATION_SUMMARY.md and backend/docs/API_REFERENCE.md.
