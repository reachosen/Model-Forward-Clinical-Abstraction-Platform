// Source: factory-cli/PlanningFactory/prompts/eventSummary.ts
// Migrated to Shared Library

export function getEventSummaryVariables(context: any): Record<string, string> {
  const { domain, archetype, ranking_context, ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  return {
    domain,
    archetype,
    metricName,
    clinicalFocus,
    rankingContextLine: ranking_context ? `- Institution Rank: #${ranking_context.rank}` : ''
  };
}
