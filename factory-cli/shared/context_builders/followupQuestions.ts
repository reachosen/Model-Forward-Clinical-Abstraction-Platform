// Source: factory-cli/PlanningFactory/prompts/followupQuestions.ts
// Migrated to Shared Library

export function getFollowupQuestionsVariables(context: any): Record<string, string> {
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

  return {
    metricName,
    signalGroupList,
    reviewQuestionHints: reviewQuestionHints ? `**METRIC-SPECIFIC HINTS:**\n${reviewQuestionHints}` : ''
  };
}