// Source: factory-cli/PlanningFactory/prompts/multiArchetypeSynthesis.ts
// Migrated to Shared Library

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
${parts.join('
')}
`;
}

export function getMultiArchetypeSynthesisDraftVariables(context: any): Record<string, string> {
  const { domain, archetype, laneFindings, ranking_context } = context;

  // Build optional ranking context section
  const rankingSection = buildRankingContextSection(ranking_context);

  return {
    domain,
    archetype,
    laneFindings,
    rankingContextLine: rankingSection ? `- Consider ranking benchmarks when assessing quality gaps (see below).` : '',
    rankingContextSection: rankingSection
  };
}

export function getMultiArchetypeSynthesisDraftCoreBody(context: any): string {
  const vars = getMultiArchetypeSynthesisDraftVariables(context);
  return `
GOAL (STEP 1 – DRAFT)
- Lane Findings: ${vars.laneFindings}
${vars.rankingContextSection}
`;
}

export function getMultiArchetypeSynthesisVerifyVariables(context: any): Record<string, string> {
  const { laneFindings, draftSynthesisJson } = context;

  return {
    laneFindings,
    draftSynthesisJson
  };
}
