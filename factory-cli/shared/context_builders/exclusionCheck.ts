/**
 * Context Builder for Exclusion Check Task
 */
export function getExclusionCheckVariables(context: any): Record<string, string> {
  const { ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';

  const exclusionCriteria = (metric?.exclusion_criteria || []).map((ec: any) => 
    `- **${ec.exclusion_id}**: ${ec.description}`
  ).join('\n');

  const exceptionCriteria = (metric?.exception_criteria || []).map((ec: any) => 
    `- **${ec.exception_id}**: ${ec.description} (Adjustment: ${ec.adjustment || 'None'})`
  ).join('\n');

  return {
    metricName,
    exclusionCriteria: exclusionCriteria || 'No exclusion criteria defined.',
    exceptionCriteria: exceptionCriteria || 'No exception criteria defined.'
  };
}
