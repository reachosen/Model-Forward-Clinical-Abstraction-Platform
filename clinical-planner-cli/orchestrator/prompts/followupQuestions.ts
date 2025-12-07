// Spec: docs/PromptSpecs/FollowupQuestions.md
export function getFollowupQuestionsCoreBody(context: any): string {
  const { ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';

  // Build signal group list from metric definition
  const signalGroupIds = metric?.signal_groups || [];
  const signalGroupList = signalGroupIds.length > 0
    ? signalGroupIds.join(', ')
    : 'delay_drivers, outcome_risks, safety_signals, documentation_gaps';

  // Build review question hints from metric
  const reviewQuestionHints = (metric?.review_questions || []).map((rq: string) =>
    `- Consider asking about: ${rq}`
  ).join('\n');

  return `
Your job is to generate 5–10 short, case-specific follow-up questions
to help a clinician quickly review THIS specific case for: ${metricName}.

**STRICT RULES:**
- Use ONLY the patient_payload as factual source.
- Focus on what is missing, unclear, conflicting, or delayed.
- Do NOT ask about general policies, protocols, training, or system design.
- Do NOT ask about abstract "best practices" or guidelines.
- Do NOT invent facts, timestamps, or events.
- Each question must be specific to THIS case, not generic.
- Prefer questions that point to:
  - missing documentation,
  - unclear timing,
  - unclear indications,
  - unexplained delays,
  - conflicting entries.

**QUESTION THEMES TO CONSIDER:**
Anchor questions on these signal groups: ${signalGroupList}

${reviewQuestionHints ? `**METRIC-SPECIFIC HINTS:**\n${reviewQuestionHints}` : ''}

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
- Clearly relevant to ${metricName}.

**OUTPUT FORMAT:**
Return a JSON object with 5–10 questions:

{
  "followup_questions": [
    "Question 1?",
    "Question 2?",
    "...",
    "Question N?"
  ]
}

Requirements:
- 5 to 10 questions total.
- Each question must be a single, concise sentence.
- No numbering, no bullets, no extra commentary.
- No explanation outside the JSON structure.

Analyze the patient_payload and generate the JSON object described above.
`;
}