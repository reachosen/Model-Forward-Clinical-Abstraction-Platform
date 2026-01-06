// Source: factory-cli/PlanningFactory/prompts/eventSummary.ts
// Migrated to Shared Library

export function getEventSummaryVariables(context: any): Record<string, string> {
  const { domain, archetype, ranking_context, ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';
  const signalGroupIds = metric?.signal_groups || ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'];
  let metricInstructions = '';

  // I32a Specific Guidance
  if (metricName.includes('I32a') || metricName.includes('scoliosis')) {
      metricInstructions = 'CRITICAL: You MUST explicitly state the Post-Op Day (POD) of any readmission, return to OR, or ED visit. Quote the exact procedure name (e.g. I&D).';
  }

  return {
    domain,
    archetype,
    metricName,
    clinicalFocus,
    signalGroupIds: signalGroupIds.join(', '),
    metricInstructions,
    rankingContextLine: ranking_context ? `- Institution Rank: #${ranking_context.rank}` : ''
  };
}
