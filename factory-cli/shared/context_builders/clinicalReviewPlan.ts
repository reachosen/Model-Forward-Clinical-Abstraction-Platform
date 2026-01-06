// Source: factory-cli/PlanningFactory/prompts/clinicalReviewPlan.ts
// Migrated to Shared Library
// V2: Artifact-only - reads from signal_enrichment + event_summary outputs (no raw patient_payload)

export function getClinicalReviewPlanVariables(context: any): Record<string, string> {
  const { ortho_context, task_outputs } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  const formatRules = (rules: any[]) => (rules || []).map((r: any) =>
    `- [${r.outcome?.toUpperCase() || 'RULE'}] ${r.description}`
  ).join('\n');

  const formatTriggers = (triggers: any[]) => (triggers || []).map((t: any) =>
    `- [AMBIGUITY] ${t.description}`
  ).join('\n');

  // V2: Extract artifacts from prior task outputs
  let extractedSignalsSummary = '';
  let eventSummaryText = '';

  if (task_outputs) {
    // Get signal_enrichment output
    const signalOutput = task_outputs.get?.('signal_enrichment');
    if (signalOutput?.output?.signal_groups) {
      const signalCount = signalOutput.output.signal_groups.reduce(
        (acc: number, g: any) => acc + (g.signals?.length || 0), 0
      );
      const signalList = signalOutput.output.signal_groups.flatMap(
        (group: any) => (group.signals || []).map((sig: any) =>
          `- [${group.group_id}] ${sig.signal_id}: ${sig.description || ''} (Evidence: "${sig.provenance?.substring(0, 100) || 'N/A'}...")`
        )
      ).join('\n');
      extractedSignalsSummary = `**EXTRACTED SIGNALS (${signalCount} total):**\n${signalList}`;
    }

    // Get event_summary output
    const summaryOutput = task_outputs.get?.('event_summary');
    if (summaryOutput?.output?.event_summary) {
      eventSummaryText = `**EVENT SUMMARY:**\n${summaryOutput.output.event_summary}`;
      if (summaryOutput.output.timeline_complete === false) {
        eventSummaryText += '\n⚠️ Note: Timeline marked as INCOMPLETE.';
      }
    }
  }

  return {
    metricName,
    clinicalFocus,
    ruleInCriteria: formatRules(metric?.rule_in_criteria),
    ruleOutCriteria: formatRules(metric?.rule_out_criteria),
    ambiguityTriggers: formatTriggers(metric?.ambiguity_triggers),
    extractedSignalsSummary,  // V2: Signals from signal_enrichment
    eventSummaryText          // V2: Summary from event_summary
  };
}