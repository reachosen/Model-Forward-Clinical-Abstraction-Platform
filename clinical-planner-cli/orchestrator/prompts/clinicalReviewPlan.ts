// Spec: docs/PromptSpecs/ClinicalReviewer.md
export function getClinicalReviewPlanCoreBody(context: any): string {
  const { ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  return `
Your job is to evaluate THIS SPECIFIC CASE against "${metricName}" and produce a
clear, concise, factual clinical assessment grounded ONLY in the patient_payload.

**METRIC FOCUS:** ${clinicalFocus}

**WHAT YOU MUST DO:**
Using ONLY the patient_payload, produce a clinical reviewer output containing:
1. metric_alignment: 
   - A concise statement of whether the documented events align, appear to violate,
     or are unclear/incompletely documented relative to the metric threshold.
2. key_factors:
   - 3–6 short bullet points identifying the most relevant facts.
   - Facts must come STRICTLY from the patient_payload.
3. concerns_or_flags:
   - Short, specific items that a clinician may need to review (e.g., unclear timing,
     missing documentation, conflicting entries, unverified indications).
4. overall_call:
   - One of: "clear_pass", "clear_fail", "needs_clinical_review".
   - If unclear or conflicting documentation exists → choose "needs_clinical_review".

**STRICT RULES:**
- Use ONLY patient_payload as factual source.
- DO NOT speculate or guess.
- DO NOT introduce guidelines, protocols, best practices, or teaching content.
- DO NOT invent timestamps, dosages, indications, or events.
- Keep the tone clinical, factual, terse.
- All statements must be directly traceable to the payload.
- If the payload does not contain enough information, explicitly mark it as:
  "documentation unclear" or "information missing."

**BAD VS GOOD EXAMPLES:**
BAD EXAMPLE (do NOT write like this):
"The standard of care for fractures requires early intervention, and clinicians
should consider monitoring for compartment syndrome. Guidelines emphasize..."

Why bad:
- Teaching tone
- Guidelines instead of patient facts
- Not tied to this specific case

GOOD EXAMPLE (follow this style):
"OR start time is documented but the reason for delay before transfer is unclear.
Indication for line continuation after day X is not documented."

Why good:
- Factual + case-specific
- Identifies uncertainty
- No policy or teaching language
- Directly tied to metric evaluation

**OUTPUT FORMAT (REQUIRED):**
Return the following JSON structure ONLY:

{
  "clinical_reviewer": {
    "metric_alignment": "...",
    "key_factors": [
      "...",
      "...",
      "..."
    ],
    "concerns_or_flags": [
      "...",
      "..."
    ],
    "overall_call": "clear_pass | clear_fail | needs_clinical_review"
  }
}

Rules:
- No explanations outside the JSON.
- No nested reasoning.
- No chain-of-thought.
- Keep all fields concise and metric-focused.

Analyze the patient_payload and generate ONLY the JSON described above.
`;
}