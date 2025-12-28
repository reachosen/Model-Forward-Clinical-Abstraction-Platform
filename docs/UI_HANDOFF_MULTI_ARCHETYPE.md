# Multi-Archetype UI Handoff Example

## 1. The Scenario
**Metric:** `USNWR_Ortho_I25` (Hip Fracture Time-to-OR)
**Patient:** 85yo Female, arrived with Hip Fracture.
- **Event A (Process):** Surgery occurred at hour 36 (delayed > 24h).
- **Event B (Safety):** Patient developed a Stage 2 Pressure Ulcer during the wait.

**Active Archetypes:**
1.  `Process_Auditor` (Focus: Timeline, Protocol Adherence)
2.  `Safety_Observer` (Focus: Complications, Harm)

---

## 2. The "Control Plane" Pipeline (Internal)
Instead of running parallel lanes, the system runs a **single linear flow** where archetypes act as instructions.

### Step 1: Signal Enrichment (Unified)
*Input:* `archetypes=["Process_Auditor", "Safety_Observer"]`
*Output:* Single list of signals.
```json
[
  { "id": "sig_1", "group": "timeline", "text": "Arrived 10/01 08:00", "source": "ED Triage" },
  { "id": "sig_2", "group": "timeline", "text": "Incision 10/02 20:00", "source": "Op Note" },
  { "id": "sig_3", "group": "complication", "text": "Sacral redness noted... Stage 2", "source": "Nursing Flowsheet" }
]
```

### Step 2: Event Summary (Unified)
*Output:* Single narrative weaving both threads.
> "Patient arrived 10/01. Surgery was delayed 36 hours due to OR capacity (Process Issue). During the pre-op wait, documentation indicates development of a Stage 2 sacral ulcer (Safety Issue)."

---

## 3. The Deliverable (JSON for UI Factory)
This is the **clean output** produced by the final `Clinical_Review_Plan` task. It configures the UI to handle both archetypes without data duplication.

### JSON Payload Structure

```json
{
  "meta": {
    "metric_id": "I25",
    "patient_id": "PT_8892",
    "generated_at": "2025-12-24T10:00:00Z"
  },
  
  // 1. The Verdict (Synthesis)
  "determination": {
    "outcome": "needs_review",
    "confidence": "high",
    "summary": "Case flagged for 36h delay AND acquired pressure ulcer.",
    "flags": [
      { "type": "fail", "label": "Time to OR > 24h" },
      { "type": "warning", "label": "HAC: Pressure Ulcer" }
    ]
  },

  // 2. The Unified Evidence Base (Data Plane)
  // UI draws from this single pool. No "Lane A signals" vs "Lane B signals".
  "evidence_pool": [
    { 
      "id": "sig_1", 
      "fact": "Arrival: 10/01 08:00", 
      "provenance": { "doc_id": "doc_A", "snippet": "..." },
      "tags": ["timeline", "process_critical"] 
    },
    { 
      "id": "sig_3", 
      "fact": "Stage 2 Ulcer", 
      "provenance": { "doc_id": "doc_B", "snippet": "..." },
      "tags": ["safety", "preventability"] 
    }
  ],

  // 3. UI Modules (Control Plane Configuration)
  // This tells the UI *how* to present the data for each archetype.
  "review_modules": [
    {
      "id": "module_process_audit",
      "title": "Protocol Timeline",
      "type": "timeline_audit",
      "config": {
        "target_metric": "Time to OR < 24h",
        "calculated_value": "36.0 hours",
        "relevant_signals": ["sig_1", "sig_2"] // References evidence_pool
      }
    },
    {
      "id": "module_safety_check",
      "title": "Safety Investigation",
      "type": "harm_assessment",
      "config": {
        "concern": "Pressure Injury",
        "relevant_signals": ["sig_3"] // References evidence_pool
      }
    }
  ],

  // 4. Interactive Assistant Context
  "assistant_context": {
    "suggested_questions": [
      "Was the delay due to medical instability?",
      "Was the pressure ulcer present on admission?"
    ]
  }
}
```

## 4. Why This Is Clean
1.  **No Data Duplication:** `evidence_pool` is the single source of truth. UI modules reference signals by ID rather than containing copies of them.
2.  **Decoupled Views:** The `review_modules` array allows the UI to render a "Process View" and a "Safety View" dynamically based on the plan, without the backend needing separate execution lanes.
3.  **Unified Determination:** The `determination` block provides the top-level status that aggregates all risks (Delay + Safety) into a single operational state (`needs_review`).
