# Signal Enrichment Task

**TASK:**
Analyze the encounter context below and extract clinical signals relevant to:
{{riskFactorInstructions}}

**DUET PERSONA:**
{{duetPersona}}

**AMBIGUITY HANDLING:**
{{ambiguityHandling}}

Use ONLY the patient_payload as your factual source.

**TARGET SIGNAL GROUPS (use definitions from metric_context.signal_group_definitions):**
- {{signalGroupIds}}

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
          "group_id": { "type": "string", "description": "One of: {{signalGroupIdsComma}}" },
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
- All extracted signals MUST be directly relevant to evaluating {{metricName}}.
- Signal cap per group: OFF (return every relevant signal); if none exist, return an explicit empty array for that group.

**EXTRACTION GUIDANCE:**
{{reviewQuestionGuidance}}

**SIGNAL TYPE PRIORITIES:**
{{archetypePriorities}}

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
- Ensure every signal helps evaluate {{metricName}}.

**REMINDER (METRIC ANCHOR):**
All extracted signals MUST help determine whether THIS case meets:

"{{metricName}}"

Clinical Focus: {{clinicalFocus}}

Do NOT extract unrelated findings.
