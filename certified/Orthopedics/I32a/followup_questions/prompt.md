# Follow-up Questions Task

Your job is to generate 5–10 short, case-specific follow-up questions
to help a clinician quickly review THIS specific case for: {{metricName}}.

**STRICT RULES:**
- Use ONLY the patient_payload as factual source.
- Focus on what is missing, unclear, conflicting, or delayed.
- Do NOT ask about general policies, protocols, training, or system design.
- Do NOT ask about abstract "best practices" or guidelines.
- Do NOT invent facts, timestamps, or events.
- Each question must be specific to THIS case, not generic.
- Each question must reference a concrete chart element (documented timestamp, order, finding, or note section).
- Prefer questions that point to:
  - missing documentation,
  - unclear timing,
  - unclear indications,
  - unexplained delays,
  - conflicting entries.

**QUESTION THEMES TO CONSIDER:**
Anchor questions on these signal groups: {{signalGroupList}}

{{#if reviewQuestionHints}}
{{reviewQuestionHints}}
{{/if}}

**BAD VS GOOD EXAMPLES:**

BAD EXAMPLE (do NOT ask questions like this):
- "Are our hospital's protocols up to date?"
- "What general steps should be taken to prevent delays?"

Why bad:
- About hospital policies / systems, not this patient.
- Not grounded in the patient_payload.
- Too generic.

GOOD EXAMPLE (this is the style you MUST follow):
- "Is there documentation explaining the delay between ED arrival and procedure start time?"
- "Can we clarify why the intervention timeline differs from what was expected?"

Why good:
- Tied to specific timing / indication that should be in the chart.
- Focused on missing or unclear documentation for THIS case.
- Clearly relevant to {{metricName}}.

**REQUIRED JSON SCHEMA:**
```json
{
  "type": "object",
  "properties": {
    "followup_questions": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 5,
      "maxItems": 10
    }
  },
  "required": ["followup_questions"]
}
```

Requirements:
- 5 to 10 questions total.
- Each question must be a single, concise sentence.
- No numbering, no bullets, no extra commentary.
- No explanation outside the JSON structure.

Analyze the patient_payload and generate the JSON object described above.
