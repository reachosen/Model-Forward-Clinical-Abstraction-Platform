# Signal Enrichment Task

**TASK:**
Analyze the encounter context below and extract clinical signals relevant to:
1. Look for evidence related to: Incomplete SSI prevention bundle or prolonged operative time without antibiotic re-dosing
2. Look for evidence related to: Inadequate pain control or bowel regimen leading to readmission
3. Look for evidence related to: Technical or hardware issues requiring early revision
4. Look for evidence related to: Insufficient discharge teaching or follow-up planning

Use ONLY the patient_payload as your factual source.

**TARGET SIGNAL GROUPS (use definitions from metric_context.signal_group_definitions):**
- infection_risks
- bundle_compliance
- outcome_risks
- readmission_risks

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
                "provenance": { "type": "string" }
              },
              "required": ["signal_id", "description", "evidence_type", "provenance"]
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
