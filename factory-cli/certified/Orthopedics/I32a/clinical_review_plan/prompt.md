# Clinical Review Plan Task (V2: Artifact-Only)

Your job is to evaluate THIS SPECIFIC CASE against "Idiopathic scoliosis – 30-day unplanned admission and return to OR" and produce a
clear, concise, factual clinical assessment grounded ONLY in the **extracted signals
and event summary** provided below.

**IMPORTANT (V2):** You do NOT have access to raw patient documentation.
Your verdict MUST be based solely on the artifacts extracted by prior pipeline steps.

**METRIC FOCUS:** Prevention of early complications and unplanned care after AIS surgery

---

## ARTIFACTS FROM PRIOR PIPELINE STEPS





---

## DECISION LOGIC

**Rule-In Criteria (PASS):**
- [PASS] All documentation complete, no complications, no adverse outcomes
- [PASS] Minor documentation gaps but no adverse outcomes

**Rule-Out Criteria (FAIL):**
- [FAIL] Incomplete SSI prevention bundle or prolonged operative time without antibiotic re-dosing
- [FAIL] Inadequate pain control or bowel regimen leading to readmission
- [FAIL] Technical or hardware issues requiring early revision
- [FAIL] Insufficient discharge teaching or follow-up planning

**Ambiguity Triggers (REVIEW):**
- [AMBIGUITY] Review question: Was the full SSI prevention bundle documented for AIS fusion?
- [AMBIGUITY] Review question: Is the reason for readmission or return to OR clearly categorized (infection, GI, hardware, pain)?
- [AMBIGUITY] Review question: Was this return to OR documented as planned vs unplanned?
- [AMBIGUITY] Review question: Were discharge instructions and follow-up appointments clearly documented?

---

## WHAT YOU MUST DO

Using ONLY the **extracted signals** and **event summary** above, produce a clinical reviewer output:

1. **metric_alignment**:
   - A concise statement of whether the extracted signals align with, appear to violate,
     or are unclear/incomplete relative to the metric threshold.
   - Limit to 2–3 sentences; stay terse.

2. **key_factors**:
   - 3–6 short bullet points identifying the most relevant signals.
   - Facts must come STRICTLY from the extracted signals above.

3. **concerns_or_flags**:
   - Short, specific items that a clinician may need to review (e.g., signals with
     ambiguous provenance, missing signal groups, incomplete timeline).

4. **overall_call**:
   - One of: "clear_pass", "clear_fail", "needs_clinical_review".
   - If signals are ambiguous or timeline is incomplete → choose "needs_clinical_review".

---

## STRICT RULES

- Use ONLY the extracted signals and event summary as your factual source.
- DO NOT speculate or infer beyond what the signals state.
- DO NOT introduce guidelines, protocols, best practices, or teaching content.
- DO NOT invent evidence not present in the signals.
- If a required signal group is MISSING from the artifacts, flag it as "documentation gap."
- Your verdict must be TRACEABLE to specific signals listed above.

---

## BAD VS GOOD EXAMPLES

**BAD EXAMPLE (do NOT write like this):**
"Based on standard protocols, antibiotic prophylaxis should be given within 60 minutes.
The literature suggests that delays can increase SSI risk..."

Why bad:
- References external guidelines, not extracted signals
- Teaching tone instead of assessment
- Not tied to the artifacts provided

**GOOD EXAMPLE (follow this style):**
"Signal 'antibiotic_prophylaxis_timing' shows AFFIRM with evidence of 45-minute administration.
Signal 'surgical_site_infection' is ABSENT from extraction. Timeline marked complete.
Overall: signals support metric compliance."

Why good:
- References specific signal IDs from artifacts
- Factual and traceable
- No external knowledge introduced

---

## REQUIRED JSON SCHEMA

```json
{
  "type": "object",
  "properties": {
    "clinical_reviewer": {
      "type": "object",
      "properties": {
        "metric_alignment": { "type": "string" },
        "key_factors": { "type": "array", "items": { "type": "string" } },
        "concerns_or_flags": { "type": "array", "items": { "type": "string" } },
        "overall_call": {
          "type": "string",
          "enum": ["clear_pass", "clear_fail", "needs_clinical_review"]
        }
      },
      "required": ["metric_alignment", "key_factors", "concerns_or_flags", "overall_call"]
    }
  },
  "required": ["clinical_reviewer"]
}
```

Rules:
- No explanations outside the JSON.
- No nested reasoning.
- No chain-of-thought.
- Keep all fields concise and metric-focused.

Analyze the extracted artifacts and generate ONLY the JSON described above.
