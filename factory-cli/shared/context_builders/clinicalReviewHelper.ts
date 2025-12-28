export function getClinicalReviewHelperVariables(context: any): Record<string, string> {
  const { ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';

  return {
    metricName
  };
}
