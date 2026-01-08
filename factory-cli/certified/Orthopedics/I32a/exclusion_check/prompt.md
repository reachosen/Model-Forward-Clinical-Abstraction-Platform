# Exclusion Check Task

**GOAL:**
Determine whether this case should be EXCLUDED from the denominator for metric: Idiopathic scoliosis – 30-day unplanned admission and return to OR

**EXCLUSION CRITERIA:**
- **age_limit**: Patient age > 18 years at time of surgery

**EXCEPTION CRITERIA:**
No exception criteria defined.

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
  "type": "object",
  "properties": {
    "exclusion_check": {
      "type": "object",
      "properties": {
        "overall_status": {
          "type": "string",
          "enum": ["excluded", "not_excluded", "needs_review"]
        },
        "exclusions_evaluated": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "exclusion_id": { "type": "string" },
              "status": {
                "type": "string",
                "enum": ["met", "not_met", "unclear"]
              },
              "evidence": { "type": ["string", "null"] },
              "notes": { "type": "string" }
            },
            "required": ["exclusion_id", "status", "evidence"]
          }
        },
        "exceptions_evaluated": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "exception_id": { "type": "string" },
              "applies": { "type": "string", "description": "true | false | unclear" },
              "adjustment_applied": { "type": ["string", "null"] },
              "evidence": { "type": ["string", "null"] }
            },
            "required": ["exception_id", "applies", "evidence"]
          }
        },
        "final_exclusion_reason": { "type": ["string", "null"] }
      },
      "required": ["overall_status", "exclusions_evaluated", "exceptions_evaluated", "final_exclusion_reason"]
    }
  },
  "required": ["exclusion_check"]
}
```

Return ONLY the JSON object. No explanations, no chain-of-thought.
