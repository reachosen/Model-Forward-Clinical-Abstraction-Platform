# Exclusion Check Task

**GOAL:**
Determine whether this case should be EXCLUDED from the denominator for metric: {{metricName}}

**EXCLUSION CRITERIA:**
{{#each exclusionCriteria}}
- **{{this.exclusion_id}}**: {{this.description}}
{{/each}}

**EXCEPTION CRITERIA:**
{{#each exceptionCriteria}}
- **{{this.exception_id}}**: {{this.description}} (Adjustment: {{this.adjustment}})
{{/each}}

**WHAT YOU MUST DO:**
Using ONLY the patient_payload, check each exclusion and exception criterion:

1. For each exclusion:
   - Determine if the criterion is MET, NOT MET, or UNCLEAR
   - Provide verbatim evidence from the chart supporting your determination
   - If UNCLEAR, specify what documentation is missing

2. For each exception:
   - Determine if the exception applies
   - Note any threshold adjustments that should be applied

**STRICT RULES:**
- Use ONLY patient_payload as factual source.
- DO NOT assume exclusions without explicit documentation.
- If documentation is ambiguous, mark as UNCLEAR.
- Evidence must be verbatim text from the chart.

**REQUIRED JSON SCHEMA:**
```json
{
  "exclusion_check": {
    "overall_status": "excluded | not_excluded | needs_review",
    "exclusions_evaluated": [
      {
        "exclusion_id": "...",
        "status": "met | not_met | unclear",
        "evidence": "verbatim text or null",
        "notes": "optional clarification"
      }
    ],
    "exceptions_evaluated": [
      {
        "exception_id": "...",
        "applies": true | false | "unclear",
        "adjustment_applied": "description of adjustment or null",
        "evidence": "verbatim text or null"
      }
    ],
    "final_exclusion_reason": "string or null if not excluded"
  }
}
```

Return ONLY the JSON object. No explanations, no chain-of-thought.
