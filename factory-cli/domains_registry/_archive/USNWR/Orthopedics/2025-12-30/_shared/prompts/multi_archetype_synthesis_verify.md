# Multi-Archetype Synthesis Verification Task

**GOAL (STEP 2 — VERIFY):**
You are verifying the DRAFT synthesis against the original lane findings.
Your job is to REMOVE any unsupported or speculative content.

**INPUTS:**

1) Lane Findings (ground truth, already validated):
{{laneFindings}}

2) DRAFT Synthesis (from Step 1):
{{draftSynthesisJson}}

**STRICT RULES:**
- You may ONLY do the following:
  - Keep statements that are directly supported by at least one lane finding.
  - Delete statements or details that are NOT supported by any lane finding.
  - When in doubt, DELETE the questionable content (deletion is preferred over rewording).
- You are NOT allowed to:
  - Introduce any new facts, dates, or interpretations.
  - Add new explanations, hypotheses, or guidelines.
  - Rewrite the structure of the JSON (field names, nesting) beyond
    deleting unsupported content or tightening wording inside existing fields.

**HOW TO VERIFY:**
For each factual statement in the DRAFT:
- Check whether it is directly supported by one or more lane findings.
- If supported → keep it as is or lightly sharpen wording WITHOUT changing meaning.
- If NOT supported → remove that statement (or the part of the text that is unsupported).

If lanes disagree:
- You may keep a statement that explicitly says there is disagreement, but it MUST
  be clearly grounded in the lane text (e.g., "Lane A says X, Lane B says Y").

**OUTPUT REQUIREMENTS:**
- Return a single JSON object using the EXACT SAME schema as the DRAFT
  (multi_archetype_synthesis schema).
- Do NOT add new fields.
- Do NOT add any metadata about what you removed.
- The JSON should be a "cleaned" version of the DRAFT with unsupported content removed.

Return ONLY the verified JSON object. No comments, no chain-of-thought.
