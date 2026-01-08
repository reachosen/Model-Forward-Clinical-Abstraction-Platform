# Signal Enrichment Task

**TASK:**
Analyze the encounter context below and extract clinical signals relevant to:
1. Look for evidence related to: Incomplete SSI prevention bundle or prolonged operative time without antibiotic re-dosing
2. Look for evidence related to: Inadequate pain control or bowel regimen leading to readmission
3. Look for evidence related to: Technical or hardware issues requiring early revision
4. Look for evidence related to: Insufficient discharge teaching or follow-up planning

**AMBIGUITY HANDLING:**
If you encounter conflicting data (e.g., Physician Note says "Infection", Nursing Note says "No Infection"):
  1. Extract BOTH findings as separate signals.
  2. Preserve the provenance for each.
  3. Do NOT attempt to synthesize or resolve the conflict unless one note explicitly corrects the other (e.g. "Correction: previous note error").
  4. Tag these signals with "Ambiguity_Trigger".

Use ONLY the patient_payload as your factual source.

**TARGET SIGNAL GROUPS (use definitions from metric_context.signal_group_definitions):**
- infection_risks:
  - [wound_drainage_erythema] Presence of wound drainage or erythema is a critical indicator of potential surgical site infection (SSI) and should be monitored closely.
  - [surgical_site_infection] SSIs are a critical outcome measure for surgical quality and must be tracked for preventability analysis.
  - [pre_op_warming_documented] Pre-operative warming is a key measure to prevent hypothermia and associated complications, as recommended by surgical guidelines.
  - [antibiotic_prophylaxis_timing] Timely administration of antibiotic prophylaxis is crucial for SSI prevention, aligning with NHSN and surgical best practices.
  - [unplanned_admission] Unplanned admissions can indicate complications or preventability issues, important for quality assessment.
  - [discharge_instructions_clarity] Clear discharge instructions are essential for patient safety and reducing readmissions, as per quality care standards.
  - [absence_of_perfusion_checks] Regular perfusion checks are essential for monitoring limb viability post-surgery.
  - [loss_of_reduction_requiring_reoperation] Loss of reduction is a significant complication that may necessitate re-operation, impacting patient outcomes.
  - [neurovascular_exam_pre_op_post_op] Complete neurovascular exams pre- and post-operation are crucial for detecting complications early.
  - [inappropriate_antibiotic_selection] Selecting the correct antibiotic is vital for effective infection prevention and treatment.
  - [pre_op_warming_not_documented] Pre-operative warming is a key factor in preventing surgical site infections (SSI) and should be documented as per best practices.
  - [pain_management_plan_documentation] Documenting pain management plans is critical for patient comfort and recovery, and is a standard care practice.
  - [neurovascular_exam_post_op] Post-operative neurovascular exams are critical for detecting complications early, especially in orthopedic surgeries.
  - [increased_back_pain] Increased back pain post-surgery can indicate complications such as infection or hardware issues, which are crucial for assessing preventability.
  - [redness_and_drainage] Redness and drainage are signs of infection or poor wound healing, important for evaluating post-operative complications.
- bundle_compliance:
  - [pre_op_warming_not_documented] Pre-operative warming is a key preventive measure against SSIs and its documentation is essential for quality assurance.
  - [surgical_pause_documented] Documenting the surgical pause is crucial for ensuring all safety checks are completed before surgery, reducing preventable errors.
  - [discharge_instructions_unclear] Clear discharge instructions are essential for patient recovery and preventing readmissions or complications.
  - [antibiotic_prophylaxis_timing] Timely administration of antibiotic prophylaxis is crucial for preventing SSIs, aligning with best practice guidelines.
- outcome_risks:
  - [unplanned_admission] Unplanned admissions post-surgery can indicate complications or preventable issues that need to be addressed.
  - [surgical_site_infection] Identifying SSIs is crucial for assessing surgical outcomes and preventability.
  - [gi_complication] Alias for GI complication ileus/obstruction.
- readmission_risks:
  - [uncontrolled_pain] Uncontrolled pain
  - [surgical_site_infection] Surgical site infection
  - [gi_complication_ileusobstruction] GI complication (ileus/obstruction)
  - [hardware_complication] Hardware complication
  - [pneumoniarespiratory_distress] Pneumonia/respiratory distress
  - [utiurinary_retention] UTI/urinary retention
  - [nutritional_failure] Nutritional failure
  - [socialcaregiver_concern] Social/caregiver concern

**REQUIRED JSON SCHEMA:**
```json
{
  "type": "object",
  "properties": {
    "signal_groups": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "group_id": { "type": "string", "description": "One of: infection_risks, bundle_compliance, outcome_risks, readmission_risks" },
          "signals": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "signal_id": { "type": "string" },
                "description": { "type": "string" },
                "evidence_type": { "type": "string", "enum": ["verbatim_text", "structured_field"] },
                "provenance": { "type": "string", "description": "EXACT copy-paste from chart ONLY" },
                "tags": { "type": "array", "items": { "type": "string" }, "description": "Archetype tags" }
              },
              "required": ["signal_id", "description", "evidence_type", "provenance", "tags"]
            }
          }
        },
        "required": ["group_id", "signals"]
      }
    }
  },
  "required": ["signal_groups"]
}
```

**STRICT RULES:**
- DO NOT invent facts, timestamps, symptoms, or documentation.
- DO NOT use guidelines, protocols, best-practice teaching, or general clinical theory.
- **PROVENANCE INTEGRITY:** Provenance MUST be an exact substring copy-paste from the payload. No summarization, paraphrasing, or interpretation.
  - *Negative Example:* Do NOT write "fever of 102" if text says "T 102.1". 
  - *Negative Example:* Do NOT write "Patient has drainage" if text says "Incision leaking serous fluid".
- Every signal MUST have provenance: a verbatim text snippet from patient_payload.
- All extracted signals MUST be directly relevant to evaluating Idiopathic scoliosis – 30-day unplanned admission and return to OR.
- Signal cap per group: OFF (return every relevant signal); if none exist, return an explicit empty array for that group.

**EXTRACTION GUIDANCE:**
- Extract signals that help answer: "Was the full SSI prevention bundle documented for AIS fusion?"
- Extract signals that help answer: "Is the reason for readmission or return to OR clearly categorized (infection, GI, hardware, pain)?"
- Extract signals that help answer: "Was this return to OR documented as planned vs unplanned?"
- Extract signals that help answer: "Were discharge instructions and follow-up appointments clearly documented?"

**SIGNAL TYPE PRIORITIES:**

### CRITICAL: TAGGING RULE (For UI Filtering)
- You MUST populate the "tags" array for EVERY signal you extract.
- The tags MUST be chosen from this exact list: "Preventability_Detective", "Outcome_Tracker".
- If a signal is relevant to Process & Timing, tag it "Process_Auditor".
- If a signal is relevant to Delay Analysis, tag it "Delay_Driver_Profiler".
- If a signal serves both, include BOTH tags in the array: ["Process_Auditor", "Delay_Driver_Profiler"].
- NEVER leave the tags array empty.

### CRITICAL: PROVENANCE & TIMING RULES
1. **NO INVENTED PROVENANCE:** If you cannot find an exact substring copy-paste from the patient_payload, DO NOT include provenance. Omit the signal if no direct evidence exists.
2. **NO SUMMARY SENTENCES:** Provenance must be a raw quote, not a summary like "The patient arrived at...".
3. **TIMING GAPS:** If arrival or incision timestamps are missing, DO NOT create a 'delay_driver' signal describing the delay. Instead, create a 'documentation_gaps' signal stating "Missing arrival/incision timestamp".
4. **STRICT RELEVANCE:** Keep signals ONLY if they directly support adjudication (timing, perfusion, NV status, compartment risk).

PREVENTABILITY SIGNALS (Archetype: Preventability_Detective):
- Bundle compliance and protocol adherence evidence
- Infection prevention measures and gaps
- Root cause indicators for adverse events
- Modifiable risk factors present or addressed

SIGNS VS DIAGNOSIS:
1. **Prefer Signs:** Focus on symptoms and findings. Never output diagnosis signals (e.g., [surgical_site_infection]) unless the source text explicitly states the diagnosis.
2. **Mandatory ID Mapping:** Even if a sign appears benign or non-infectious, you MUST still emit the canonical signal ID if the finding is present.
   - *Exemplar:* If "redness" or "serous drainage" is noted, emit [wound_drainage_erythema] even if the note says "healing well".
3. **Clinical Mapping Rules:**
   - Map ANY mention of "readmitted", "back in ED", "return to hospital", or "presented to ER" to [unplanned_admission].
   - **MANDATORY:** If the narrative describes any return to care (ED, OR, or Admitted), you MUST output the [unplanned_admission] signal.
   - Map ANY mention of "preoperative antibiotics", "Ancef", "Cefazolin", or "Vanco" timing to [antibiotic_prophylaxis_timing].
4. **ZERO-PARAPHRASE RULE:** Provenance must be an EXACT substring copy. If you summarize (e.g., "no signs of infection" instead of quoting "incision clean"), the clinical audit will FAIL.
5. **GRANULARITY RULE:** Every signal entry MUST represent exactly ONE clinical finding. Do NOT combine findings (e.g., "fever and redness") into a single signal entry. Create separate entries for each.
6. **Tie-Breaker:** If both a sign-signal and diagnosis-signal seem applicable, choose the **more specific sign** signal.

SAFETY SIGNALS (All archetypes):
- Complications or near-misses documented
- Red flag symptoms or findings
- Escalation events or code situations

DOCUMENTATION GAPS (All archetypes):
- Missing required assessments or evaluations
- Incomplete procedural documentation
- Ambiguities that prevent metric determination

**QUALITY EXPECTATIONS:**
- Prefer fewer high-yield signals over many low-value ones.
- Keep descriptions short and clinical.
- Ensure every signal helps evaluate Idiopathic scoliosis – 30-day unplanned admission and return to OR.

**REMINDER (METRIC ANCHOR):**
All extracted signals MUST help determine whether THIS case meets:

"Idiopathic scoliosis – 30-day unplanned admission and return to OR"

Clinical Focus: Prevention of early complications and unplanned care after AIS surgery

Do NOT extract unrelated findings.
