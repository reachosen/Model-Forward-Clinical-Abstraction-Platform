# 20/80 Display Fields Task

**Context:**
- Domain: {{domain}}
- Metric: {{metricName}}
- Signal Groups: {{signalGroupIds}}

**GOAL:**
Extract key clinical fields for the 20/80 Display UI.
This UI shows the essential 20% of fields that give 80% of the clinical context.

**REQUIRED FIELDS:**
You must extract the following specific fields from the patient_payload:

1. **display_fields**: An array of key-value pairs to be displayed in the top-left summary card.
   - **Order 1: Patient** (e.g., "Emily Carter (14F)")
   - **Order 2: Metric** (e.g., "{{metricName}}")
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
- Do not generate long narratives here (that is for Event Summary).

**REQUIRED JSON SCHEMA:**
```json
{
  "type": "object",
  "properties": {
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
  "required": ["display_fields"]
}
```