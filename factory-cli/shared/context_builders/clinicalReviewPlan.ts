// Source: factory-cli/PlanningFactory/prompts/clinicalReviewPlan.ts
// Migrated to Shared Library

export function getClinicalReviewPlanVariables(context: any): Record<string, string> {
  const { ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  return {
    metricName,
    clinicalFocus
  };
}