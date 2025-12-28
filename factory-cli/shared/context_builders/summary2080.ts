// Source: factory-cli/PlanningFactory/prompts/summary2080.ts
// Migrated to Shared Library

export function getSummary2080Variables(context: any): Record<string, string> {
  const { ranking_context, ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const signalGroupIds = metric?.signal_groups || ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'];

  return {
    metricName,
    signalGroupIds: signalGroupIds.join(', '),
    rankingContextLine: ranking_context ? `**Rank:** #${ranking_context.rank}` : ''
  };
}