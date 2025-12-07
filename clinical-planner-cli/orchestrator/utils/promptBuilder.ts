import { getEventSummaryCoreBody } from '../prompts/eventSummary';
import { getFollowupQuestionsCoreBody } from '../prompts/followupQuestions';
import { getSignalEnrichmentCoreBody } from '../prompts/signalEnrichment';
import { getSummary2080CoreBody } from '../prompts/summary2080';
import { getClinicalReviewPlanCoreBody } from '../prompts/clinicalReviewPlan';
import { TaskType, ArchetypeType } from '../types';

export interface MetricPromptOptions {
  roleName: string;
  coreBody: string;
  metricContext?: string;
}

/**
 * Build a dynamic role name based on task type, domain, and metric context
 * This replaces hardcoded role names like "Pediatric Clinical Signal Extractor — Supracondylar Humerus Fracture (I25)"
 */
export function buildDynamicRoleName(
  taskType: TaskType | string,
  domain: string,
  metricName?: string,
  archetype?: ArchetypeType
): string {
  // Base role names by task type (metric-agnostic)
  const baseRoles: Record<string, string> = {
    signal_enrichment: 'Clinical Signal Extractor',
    event_summary: 'Clinical Event Summary Assistant',
    summary_20_80: 'Patient and Provider Summary Generator',
    followup_questions: 'Clinical Investigator',
    clinical_review_plan: 'Clinical Review Planner',
    multi_archetype_synthesis: 'Lead Clinical Investigator',
    multi_archetype_synthesis_draft: 'Lead Clinical Investigator – Draft Synthesis',
    multi_archetype_synthesis_verify: 'Lead Clinical Investigator – Verification',
  };

  const baseRole = baseRoles[taskType] || 'Clinical Analyst';

  // Build full role name with context
  const parts: string[] = [];

  // Add domain context (e.g., "Pediatric Orthopedics")
  if (domain && domain !== 'HAC') {
    parts.push(`Pediatric ${domain}`);
  } else if (domain === 'HAC') {
    parts.push('Infection Prevention');
  }

  parts.push(baseRole);

  // Add metric name if available (e.g., "for Supracondylar fracture to OR <18 hours")
  if (metricName) {
    parts.push(`for ${metricName}`);
  }

  // Add archetype context if relevant
  if (archetype && taskType === 'signal_enrichment') {
    const archetypeFocus: Record<ArchetypeType, string> = {
      Process_Auditor: '(Process & Timing Focus)',
      Preventability_Detective: '(Preventability Focus)',
      Preventability_Detective_Metric: '(Metric Compliance Focus)',
      Exclusion_Hunter: '(Exclusion Criteria Focus)',
      Data_Scavenger: '(Data Completeness Focus)',
      Delay_Driver_Profiler: '(Delay Analysis Focus)',
      Outcome_Tracker: '(Outcome Monitoring Focus)',
    };
    const focus = archetypeFocus[archetype];
    if (focus) parts.push(focus);
  }

  return parts.join(' ');
}

export function buildMetricFramedPrompt(opts: MetricPromptOptions): string {
  const { roleName, coreBody, metricContext } = opts;

  // No metric context -> simple, role-scoped wrapper
  if (!metricContext || metricContext.trim().length === 0) {
    return [
      `ROLE: ${roleName}`,
      ``,
      coreBody.trim(),
    ].join('\n');
  }

  // SAFE PATTERN #6: Metric-Locked Context Flooding
  return [
    `!!! CRITICAL METRIC CONTEXT (READ FIRST) !!!`,
    metricContext,
    ``,
    `=========================================`,
    `ROLE: ${roleName}`,
    `=========================================`,
    ``,
    coreBody.trim(),
    ``,
    `=========================================`,
    `CRITICAL REMINDER`,
    `=========================================`,
    `Your analysis must align STRICTLY with the metric definition above.`,
    `Do not hallucinate policies or drift from this specific definition.`,
  ].join('\n');
}

/**
 * Build domain-agnostic metric context string from semantic packet
 * Works for any domain, not just Orthopedics
 */
export function buildMetricContextString(packet: any): string {
  if (!packet?.metric) return '';

  const { metric, signals } = packet;
  const domainLabel = packet.metric.metric_type?.toUpperCase() || 'CLINICAL';

  return `
**${domainLabel} METRIC CONTEXT (HIGH PRIORITY):**
- **Metric Name:** ${metric.metric_name}
- **Clinical Focus:** ${metric.clinical_focus}
- **Rationale:** ${metric.rationale}

**Risk Factors (MUST ADDRESS):**
${(metric.risk_factors || []).map((r: string) => `- ${r}`).join('\n')}

**Review Questions (MUST ANSWER):**
${(metric.review_questions || []).map((q: string) => `- ${q}`).join('\n')}

**Signal Groups & Definitions:**
${(metric.signal_groups || []).map((gid: string) => {
     const sigs = signals?.[gid] || [];
     return `- **${gid}**: ${sigs.join(', ')}`;
  }).join('\n')}
`;
}

// Helper to load prompt text reusing the S5 logic
export function getPromptText(taskName: string, context: any): string {
  const { domain, primary_archetype, semantic_context } = context;

  // Build metric context string from semantic packet (domain-agnostic)
  const metricContextString = buildMetricContextString(semantic_context?.packet);
  const metricName = semantic_context?.packet?.metric?.metric_name;

  const promptContext = {
    domain,
    archetype: primary_archetype,
    ortho_context: semantic_context?.packet,
    ranking_context: semantic_context?.ranking,
    skeleton: null,
  };

  let coreBody = '';
  let roleName = '';

  switch (taskName) {
    case 'task_event_summary':
      roleName = buildDynamicRoleName('event_summary', domain, metricName);
      coreBody = getEventSummaryCoreBody(promptContext);
      break;
    case 'task_followup_questions':
      roleName = buildDynamicRoleName('followup_questions', domain, metricName);
      coreBody = getFollowupQuestionsCoreBody(promptContext);
      break;
    case 'task_signal_generation':
      roleName = buildDynamicRoleName('signal_enrichment', domain, metricName, primary_archetype);
      coreBody = getSignalEnrichmentCoreBody(promptContext);
      break;
    case 'task_summary_20_80':
      roleName = buildDynamicRoleName('summary_20_80', domain, metricName);
      coreBody = getSummary2080CoreBody(promptContext);
      break;
    case 'task_clinical_reviewer':
      roleName = buildDynamicRoleName('clinical_review_plan', domain, metricName);
      coreBody = getClinicalReviewPlanCoreBody(promptContext);
      break;
    default:
      return `Analyze this case for ${taskName}.`;
  }

  return buildMetricFramedPrompt({
    roleName,
    coreBody,
    metricContext: metricContextString
  });
}
