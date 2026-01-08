# Event Summary Task

**Context:**
- Domain: Orthopedics
- Archetype: Preventability_Detective
- Metric: Idiopathic scoliosis – 30-day unplanned admission and return to OR
- Signal Groups: infection_risks, bundle_compliance, outcome_risks, readmission_risks
- Clinical Focus: Prevention of early complications and unplanned care after AIS surgery




**GOAL:**
Produce a factual, timeline-focused summary relevant to evaluating Idiopathic scoliosis – 30-day unplanned admission and return to OR.
- Focus on events directly relevant to the metric definition.
- Flag delays, gaps, or safety concerns.
- Structure the narrative chronologically when possible.

CRITICAL: You MUST explicitly state the Post-Op Day (POD) of any readmission, return to OR, or ED visit. Quote the exact procedure name (e.g. I&D).

**BAD EXAMPLE (Do Not Do This):**
"The patient arrived and standard protocols suggest early intervention. It is important to monitor..." (Too generic, lecturing).

**GOOD EXAMPLE:**
"Patient arrived at 14:00. Key intervention at 15:30 (90 min from arrival). Timeline documented; no unexplained gaps." (Fact-based, metric-focused).

**REQUIRED FIELDS (20/80 Display):**
You must ALSO extract the following specific fields for the summary card:

1. **display_fields**: An array of key-value pairs (exactly 8 items).
   - **Order 1: Patient** (e.g., "Emily Carter (14F)")
   - **Order 2: Metric** (e.g., "Idiopathic scoliosis – 30-day unplanned admission and return to OR")
   - **Order 3: Index Surgery** (e.g., "Posterior spinal fusion (T4-L1)")
   - **Order 4: Surgery Date** (e.g., "11/18/2025")
   - **Order 5: Discharge -> Readmit** (e.g., "11/22 -> 12/08")
   - **Order 6: Days Post-Discharge** (e.g., "16 days")
   - **Order 7: Readmission Reason** (e.g., "Fever, pain, wound drainage")
   - **Order 8: Timeline Status** (e.g., "Timeline complete")

**STRICT RULES:**
- Use ONLY the patient_payload.
- If a field is missing, use "Not Documented".
- Keep values short and punchy (for UI display).

**REQUIRED JSON SCHEMA:**
```json
{
  "type": "object",
  "properties": {
    "event_summary": { "type": "string", "description": "Comprehensive narrative summary" },
    "timeline_complete": { "type": "boolean" },
    "key_timestamps": { "type": "array", "items": { "type": "string" } },
    "display_fields": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "order": { "type": "number" },
          "label": { "type": "string" },
          "value": { "type": "string" }
        },
        "required": ["order", "label", "value"]
      },
      "minItems": 8,
      "maxItems": 8
    }
  },
  "required": ["event_summary", "timeline_complete", "key_timestamps", "display_fields"]
}
```

**TIMESTAMP RULE:**
- Use ISO-8601 if explicitly documented; otherwise copy the exact textual timestamp strings from the chart (no invented times).

DO NOT:
- Assess preventability
- Attribute blame or root cause
- Introduce recommendations