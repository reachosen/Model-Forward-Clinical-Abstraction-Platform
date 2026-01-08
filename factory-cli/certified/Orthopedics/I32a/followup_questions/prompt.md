# Follow-up Questions Task

Your job is to generate 5–10 short, case-specific follow-up questions
to help a clinician quickly review THIS specific case for: Idiopathic scoliosis – 30-day unplanned admission and return to OR.

**SIGNAL-DRIVEN APPROACH (V2):**
No signals were extracted - focus on gathering basic clinical information.



**STRICT RULES:**
- Questions must address GAPS or AMBIGUITIES in the signals above.
- Use ONLY the patient_payload as factual source.
- Focus on what is missing, unclear, conflicting, or delayed.
- Do NOT ask about general policies, protocols, training, or system design.
- Do NOT ask about abstract "best practices" or guidelines.
- Do NOT invent facts, timestamps, or events.
- Each question must be specific to THIS case, not generic.
- Each question must reference a concrete chart element (documented timestamp, order, finding, or note section).
- Prefer questions that point to:
  - missing documentation for extracted signals,
  - unclear timing of clinical events,
  - unclear indications for procedures,
  - unexplained delays between events,
  - conflicting entries in the chart.

**QUESTION THEMES TO CONSIDER:**
Anchor questions on these signal groups: infection_risks, bundle_compliance, outcome_risks, readmission_risks


**METRIC-SPECIFIC HINTS:**
- Consider asking about: Was the full SSI prevention bundle documented for AIS fusion?
- Consider asking about: Is the reason for readmission or return to OR clearly categorized (infection, GI, hardware, pain)?
- Consider asking about: Was this return to OR documented as planned vs unplanned?
- Consider asking about: Were discharge instructions and follow-up appointments clearly documented?


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
- Clearly relevant to Idiopathic scoliosis – 30-day unplanned admission and return to OR.

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
