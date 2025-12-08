// Spec: docs/PromptSpecs/MultiArchetypeSynthesis.md

/**
 * Build ranking context section for synthesis prompts
 * Wires RankingContext.summary, top_performer_benchmarks, and quality_differentiators
 */
function buildRankingContextSection(rankingContext: any): string {
  if (!rankingContext) return '';

  const parts: string[] = [];

  if (rankingContext.summary) {
    parts.push(`- **Ranking Summary:** ${rankingContext.summary}`);
  }

  if (rankingContext.top_performer_benchmarks) {
    parts.push(`- **Top Performer Benchmarks:** ${rankingContext.top_performer_benchmarks}`);
  }

  if (rankingContext.quality_differentiators?.length > 0) {
    parts.push(`- **Quality Differentiators:**`);
    rankingContext.quality_differentiators.forEach((d: string) => {
      parts.push(`  - ${d}`);
    });
  }

  if (parts.length === 0) return '';

  return `
**RANKING & BENCHMARK CONTEXT (Reference Only):**
${parts.join('\n')}
`;
}

export function getMultiArchetypeSynthesisDraftCoreBody(context: any): string {
  const { domain, archetype, laneFindings, ranking_context } = context;

  // Build optional ranking context section
  const rankingSection = buildRankingContextSection(ranking_context);

  return `
**GOAL (STEP 1 – DRAFT):**
You are synthesizing findings from multiple specialist lanes into ONE coherent,
metric-focused synthesis for THIS specific case.

You must:
- Combine all relevant facts from the lane findings.
- Highlight areas of agreement and disagreement between lanes.
- Keep your focus strictly on the metric and this encounter.
${rankingSection ? `- Consider ranking benchmarks when assessing quality gaps (see below).` : ''}

**INPUTS:**
- Domain: ${domain}
- Primary Archetype: ${archetype}
- Lane Findings JSON (each lane is already metric-focused and schema-validated):
${laneFindings}
${rankingSection}

**STRICT RULES:**
- Use ONLY the lane findings as your factual source.
- Do NOT invent new facts, dates, or events that are not present in the lanes.
- Do NOT introduce guidelines, policies, or general teaching content.
- Do NOT speculate on causes not mentioned in any lane.
- If lanes conflict or disagree, clearly mark it as "lane disagreement" instead of
  resolving it yourself.

**WHAT TO PRODUCE:**
- A single JSON object using the EXISTING multi_archetype_synthesis schema
  (do NOT change field names or structure).
- Populate:
  - The overall synthesis / summary field(s).
  - Any fields describing agreement/disagreement between lanes.
  - Any fields describing key factors or flags for review.

**CRITICAL CONSTRAINTS:**
- Every factual statement in your synthesis MUST be traceable to at least one
  lane finding.
- If a conclusion cannot be directly supported by lane text, you MUST either:
  - omit it, OR
  - phrase it explicitly as "uncertain – requires clinical review".

**REQUIRED JSON SCHEMA:**
{
  "final_determination": "string (Summary of final status)",
  "synthesis_rationale": "string (Why this determination was reached)",
  "merged_signal_groups": [
    {
      "group_id": "...",
      "signals": [
        {
          "id": "...",
          "description": "Full text description",
          "evidence_type": "L1",
          "provenance": { "source_text": "...", "timestamps": "..." },
          "feasibility": { "cpt_codes": [], "icd_codes": [] }
        }
      ]
    }
  ],
  "unified_clinical_tools": []
}

Return ONLY the JSON object. No explanations, no chain-of-thought.
`;
}

export function getMultiArchetypeSynthesisVerifyCoreBody(context: any): string {
  const { laneFindings, draftSynthesisJson } = context;

  return `
**GOAL (STEP 2 – VERIFY):**
You are verifying the DRAFT synthesis against the original lane findings.
Your job is to REMOVE any unsupported or speculative content.

**INPUTS:**
1) Lane Findings (ground truth, already validated):
${laneFindings}

2) DRAFT Synthesis (from Step 1):
${draftSynthesisJson}

**STRICT RULES:**
- You may ONLY do the following:
  - Keep statements that are directly supported by at least one lane finding.
  - Delete statements or details that are NOT supported by any lane finding.
  - When in doubt, DELETE the questionable content.
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
`;
}