// Spec: docs/PromptSpecs/EventSummary.md
export function getEventSummaryCoreBody(context: any): string {
  const { domain, archetype, ranking_context, ortho_context } = context;
  const metric = ortho_context?.metric;
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality assessment';

  return `
**Context:**
- Domain: ${domain}
- Archetype: ${archetype}
- Metric: ${metricName}
- Clinical Focus: ${clinicalFocus}
${ranking_context ? `- Institution Rank: #${ranking_context.rank}` : ''}

**GOAL:**
Produce a factual, timeline-focused summary relevant to evaluating ${metricName}.
- Focus on events directly relevant to the metric definition.
- Flag delays, gaps, or safety concerns.
- Structure the narrative chronologically when possible.

**BAD EXAMPLE (Do Not Do This):**
"The patient arrived and standard protocols suggest early intervention. It is important to monitor..." (Too generic, lecturing).

**GOOD EXAMPLE:**
"Patient arrived at 14:00. Key intervention at 15:30 (90 min from arrival). Timeline documented; no unexplained gaps." (Fact-based, metric-focused).

**REQUIRED JSON SCHEMA:**
{
  "event_summary": "Comprehensive narrative summary of events relevant to ${metricName}...",
  "timeline_complete": true | false,
  "key_timestamps": ["timestamp1", "timestamp2", "..."]
}
`;
}
