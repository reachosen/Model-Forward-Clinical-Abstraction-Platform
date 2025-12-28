# 20/80 Field Display Identification Task

Your job is to identify the "20/80 Field Set" — the minimal set of
clinically meaningful, factual display fields that provide 80% of the
orientation needed to evaluate: {{metricName}}.

This task identifies fields for UI display.
It does NOT generate a narrative, summary, or interpretation.

## STRICT RULES
- Use ONLY the patient_payload as the factual source.
- No guessing, no clinical advice, no guidelines.
- No commentary on quality of care, workflows, or protocols.
- No abstract teaching statements.
- No invented timestamps, conditions, or events.
- Everything must map directly to real patient_payload elements.
- If a field is not explicitly documented or derivable, omit it.
- Do NOT emit signals, signal groups, or follow-up questions.
- Do NOT restate or summarize notes.

## BAD EXAMPLE (Do NOT do this)
"Patient had surgery and later developed complications requiring readmission."

Why bad:
- Narrative
- Interpretive
- Not UI-atomic

## GOOD EXAMPLE (Correct style)
"Patient: Emily Carter (14F)
Index Surgery: Posterior spinal fusion (T4–L1)
Discharge → Readmit: 11/22 → 12/08"

Why good:
- Field-based
- Factual
- UI-ready

## GOAL
Produce an ordered list of essential display fields suitable for a compact
left-corner UI panel that orients the reviewer.

FIELDS SHOULD:
- Answer quickly: who, what episode, when, why this metric applies.
- Be atomic (single-line values, no prose).
- Be non-duplicative of right-panel content (signals, chat, follow-ups).
- Use the minimum number of fields needed (≤8).

{{#if rankingContextLine}}
{{rankingContextLine}}
{{/if}}

## REQUIRED JSON SCHEMA
```json
{
  "display_fields": [
    {
      "order": 1,
      "label": "Field name",
      "value": "Field value"
    }
  ]
}
```

## GUIDANCE (NOT OUTPUT)
- Prefer dates over explanations.
- Prefer combined timeline fields where possible (e.g., “Discharge → Readmit”).
- Include a simple timeline completeness indicator if determinable.
