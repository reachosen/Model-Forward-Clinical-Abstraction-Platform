export function getClinicalReviewHelperVariables(context: any): Record<string, string> {
  const { ortho_context, eventSummary, keySignals, currentDetermination, userQuery, openQuestions } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  // Format signals for the prompt (Handle objects or strings)
  const formattedSignals = (keySignals || []).map((s: any) => 
      `- ${s.description || s.name || s.signal_id || s} (${s.evidence_type || 'extracted'})`
  ).join('\n');

  const formattedQuestions = (openQuestions || []).map((q: any) => `- ${q}`).join('\n');

  return {
    metricName,
    clinicalFocus,
    eventSummary: eventSummary || "No summary available.",
    currentDetermination: currentDetermination || "Pending Review",
    userQuery: userQuery || "Please review the case.",
    keySignals: formattedSignals, 
    openQuestions: formattedQuestions
  };
}