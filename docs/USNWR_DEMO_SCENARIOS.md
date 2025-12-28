# USNWR Orthopedics Demo: Scenarios & End-to-End Flow

**Goal**: Demonstrate a fully autonomous, clinically safe, and self-correcting abstraction platform for the USNWR Orthopedics domain.

---

## 1. The High-Level Scenarios (The "Must-Haves")

These 5 scenarios represent the core capabilities we must demonstrate during the 10-day sprint.

| ID | Scenario Name | Description | Key Capability Proven |
| :--- | :--- | :--- | :--- |
| **S1** | **The "Golden Path"** | **Metric**: `I27 (Forearm Fx)`<br>System ingests definition, generates cases, and passes certification on the first attempt without human intervention. | **Efficiency**<br>Standard cases work out-of-the-box. |
| **S2** | **The "Nuanced Exception"** | **Metric**: `I25 (Supracondylar)`<br>Patient misses the 18h target due to a valid clinical reason (e.g., "Transfer from outside hospital" or "Pneumonia"). Logic must correctly identify this as an **Exception (Pass)**, not a Failure. | **Clinical Reasoning**<br>Understanding context vs. keywords. |
| **S3** | **The "Safety Violation"** | **Metric**: `I25 (Supracondylar)`<br>Patient meets the time target (<18h), BUT has a "White/Cool Hand" (Ischemia) and waited 4 hours. Logic must flag this as a **Safety Failure** despite meeting the metric numbers. | **Safety First**<br>Patient safety overrides metric logic. |
| **S4** | **The "Self-Healing" Loop** | **Metric**: `I26 (Femoral Shaft)`<br>Initial prompt fails to distinguish "traction" from "fixation". System detects the low score, auto-refines the prompt instructions, re-tests, and passes. | **Autonomy**<br>The system fixes its own bugs. |
| **S5** | **The "Campaign Batch"** | **Metric**: `All` (I25, I26, I27, I32)<br>Running the entire packet as a single "Campaign", showing parallel execution and a unified dashboard. | **Scalability**<br>Handling volume and complexity. |

---

## 2. The End-to-End Scenario: "The Life of Metric I25"

This script details exactly what the system does for the **Supracondylar Fracture (I25)** metric during the demo.

### Phase 1: Inception (Input)
*   **User Action**: Launches `mission launch campaigns/ortho_2025.json`.
*   **System Input**: Reads `metrics.json` for **I25**.
    *   *Goal*: Time from Admission to OR < 18 hours.
    *   *Signals*: `delay_drivers`, `outcome_risks`, `safety_signals`.

### Phase 2: Strategy Derivation (The Brain)
*   **System Action**: The Strategy Engine analyzes the `risk_factors` and `signal_groups` to create a **Battle Plan**.
*   **Generated Scenarios**:
    1.  **Scenario A (Baseline)**: Simple case, OR at 6 hrs. *(Control)*
    2.  **Scenario B (Contextual)**: OR at 22 hrs, caused by "Transfer Delay". *(Exception Test)*
    3.  **Scenario C (Adversarial)**: OR at 22 hrs, caused by "Surgeon Unavailable". *(Failure Test)*
    4.  **Scenario D (Safety)**: OR at 5 hrs, but documentation shows "Cool/Pulseless hand" on arrival. *(Safety Test)*

### Phase 3: Simulation (The Generator)
*   **System Action**: `eval:generate` creates 4 synthetic clinical notes.
    *   *Note D*: "8yo male... arrived 10:00... hand pale and cool... NPO status unclear... Surgery start 15:00."

### Phase 4: Battle Test (The Eval)
*   **System Action**: Runs the **Draft Prompt** against the 4 notes.
    *   *Result A*: PASS.
    *   *Result B*: PASS (Correctly identified transfer).
    *   *Result C*: FAIL (Correctly identified preventable delay).
    *   *Result D*: **PASS (FALSE POSITIVE)**.
        *   *Error*: The prompt saw "5 hours" (which is < 18) and passed it. It missed the "Ischemia" urgency rule which dictates *immediate* surgery.
*   **Status**: ❌ **Metric Failed Safety Check**.

### Phase 5: Refinery (The Fix)
*   **System Action**: The **Refinery Agent** analyzes the failure report.
*   **Diagnosis**: "Prompt failed to prioritize Ischemia signal over the 18h threshold."
*   **Refinement**: Adds rule: *"CRITICAL: If 'white/cool hand' or 'pulseless' is present, target is 0 hours. Any delay > 1h is a failure."*
*   **Re-Test**:
    *   *Result D (v2)*: **FAIL (True Positive)**.
*   **Status**: ✅ **Metric Passed**.

### Phase 6: Certification (The Output)
*   **System Action**:
    1.  Locks `prompts.json` (Version 2).
    2.  Saves `test_cases.json` (The 4 golden cases).
    3.  Generates `schema.json` for the UI.
*   **Artifacts Ready**: `certified/orthopedics/I25/`.

---

## 3. Demo Data Requirements

To support this, we need to ensure our `signals.json` contains:
1.  **Delay Drivers**: "Surgeon unavailable", "NPO violation", "Transfer from outside hospital".
2.  **Safety Signals**: "White hand", "Cool hand", "Pulseless", "Compartment syndrome".
3.  **Clinical Concepts**: "Closed reduction", "Open reduction", "Percutaneous pinning".

*(Note: These are already confirmed present in `factory-cli/data/orthopedics/signals.json`)*
