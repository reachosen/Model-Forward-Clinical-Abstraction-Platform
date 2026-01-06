// Source: factory-cli/PlanningFactory/prompts/followupQuestions.ts
// Migrated to Shared Library
// V2: Now explicitly depends on signal_enrichment output (not event_summary)

export function getFollowupQuestionsVariables(context: any): Record<string, string> {
  const { ortho_context, keySignals, task_outputs } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';

  // Build signal group list from metric definition
  const signalGroupIds = metric?.signal_groups || [];
  const signalGroupList = signalGroupIds.length > 0
    ? signalGroupIds.join(', ')
    : 'delay_drivers, outcome_risks, safety_signals, documentation_gaps';

  // V2: Extract signals from signal_enrichment task output (preferred)
  let extractedSignalsList: any[] = keySignals || [];

  if (task_outputs) {
    const signalEnrichmentOutput = task_outputs.get?.('signal_enrichment');
    if (signalEnrichmentOutput?.output?.signal_groups) {
      // Flatten signal_groups into a list of signals
      extractedSignalsList = signalEnrichmentOutput.output.signal_groups.flatMap(
        (group: any) => (group.signals || []).map((sig: any) => ({
          signal_id: sig.signal_id,
          description: sig.description,
          provenance: sig.provenance,
          group_id: group.group_id
        }))
      );
    }
  }

  // Format extracted signals for context - focus on what's MISSING or needs clarification
  const extractedSignals = extractedSignalsList.map((s: any) =>
    `- [${s.group_id || 'signal'}] ${s.description || s.name || s.signal_id || s}`
  ).join('\n');

  // Build review question hints from metric
  const reviewQuestionHints = (metric?.review_questions || []).map((rq: string) =>
    `- Consider asking about: ${rq}`
  ).join('\n');

  // V2: Signal-driven guidance for followup questions
  const signalGapsGuidance = extractedSignalsList.length > 0
    ? `Focus questions on GAPS or AMBIGUITIES in the ${extractedSignalsList.length} signals extracted above.`
    : 'No signals were extracted - focus on gathering basic clinical information.';

  return {
    metricName,
    signalGroupList,
    extractedSignals: extractedSignals ? `**EXTRACTED SIGNALS (from signal_enrichment):**\n${extractedSignals}` : '',
    reviewQuestionHints: reviewQuestionHints ? `**METRIC-SPECIFIC HINTS:**\n${reviewQuestionHints}` : '',
    signalGapsGuidance
  };
}