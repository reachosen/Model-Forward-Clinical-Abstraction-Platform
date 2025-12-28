# Signal Enrichment Task

**TASK:**
Analyze the encounter context below and extract clinical signals relevant to:
{{riskFactorInstructions}}

Use ONLY the patient_payload as your factual source.

**TARGET SIGNAL GROUPS (use definitions from metric_context.signal_group_definitions):**
- {{signalGroupIds}}

**REQUIRED JSON SCHEMA:**
```json
{
  "signal_groups": [
    {
      "group_id": "string (one of: {{signalGroupIdsComma}})",
      "signals": [
        {
          "signal_id": "<short id>",
          "description": "<short clinical description>",
          "evidence_type": "verbatim_text | structured_field",
          "provenance": "<exact text snippet supporting this signal>"
        }
      ]
    }
  ]
}
```

**STRICT RULES:**
- DO NOT invent facts, timestamps, symptoms, or documentation.
- DO NOT use guidelines, protocols, best-practice teaching, or general clinical theory.
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
