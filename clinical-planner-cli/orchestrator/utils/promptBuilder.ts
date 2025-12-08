import { getEventSummaryCoreBody } from '../prompts/eventSummary';
import { getFollowupQuestionsCoreBody } from '../prompts/followupQuestions';
import { getSignalEnrichmentCoreBody } from '../prompts/signalEnrichment';
import { getSummary2080CoreBody } from '../prompts/summary2080';
import { getClinicalReviewPlanCoreBody } from '../prompts/clinicalReviewPlan';
import { TaskType, ArchetypeType, TaskOutput } from '../types';

/**
 * C7/C8: Compressed lane findings structure for synthesis prompts
 * Only includes key timestamps, determinations, and flags to reduce token usage
 */
export interface CompressedLaneFindings {
  lane: string;
  determination: string;
  key_timestamps: string[];
  flags: string[];
  signal_count: number;
}

/**
 * C7/C8: Compress lane outputs into a compact structure for synthesis prompts
 * Extracts only essential information to reduce token usage in synthesis calls
 */
export function compressLaneFindings(
  taskOutputs: Map<string, TaskOutput>
): CompressedLaneFindings[] {
  const compressed: CompressedLaneFindings[] = [];

  taskOutputs.forEach((val, key) => {
    // Only process event_summary outputs as they contain the lane summaries
    if (key.includes('event_summary')) {
      const lane = key.split(':')[0];
      const output = val.output;

      // Extract key information
      const determination = output.summary || output.event_summary || '';
      const keyTimestamps: string[] = [];
      const flags: string[] = [];

      // Extract timestamps from summary if present
      const timestampMatches = determination.match(/\d{1,2}:\d{2}|\d{1,2}h|\d{1,2}\s*hours?/gi);
      if (timestampMatches) {
        keyTimestamps.push(...timestampMatches.slice(0, 3)); // Limit to 3 timestamps
      }

      // Extract flags/signals count from related signal_enrichment
      const signalKey = `${lane}:signal_enrichment`;
      const signalOutput = taskOutputs.get(signalKey);
      let signalCount = 0;

      if (signalOutput?.output?.signal_groups) {
        signalCount = signalOutput.output.signal_groups.reduce(
          (sum: number, g: any) => sum + (g.signals?.length || 0),
          0
        );
        // Extract high-priority flags
        signalOutput.output.signal_groups.forEach((g: any) => {
          if (g.signals) {
            g.signals.slice(0, 2).forEach((s: any) => {
              if (s.description && flags.length < 3) {
                flags.push(s.description.slice(0, 50));
              }
            });
          }
        });
      }

      compressed.push({
        lane: lane.toUpperCase(),
        determination: determination.slice(0, 200), // Truncate to ~200 chars
        key_timestamps: keyTimestamps,
        flags,
        signal_count: signalCount,
      });
    }
  });

  return compressed;
}

/**
 * C7/C8: Build compact laneFindings string from compressed data
 */
export function buildCompressedLaneFindingsString(
  compressed: CompressedLaneFindings[]
): string {
  if (compressed.length === 0) return 'No lane findings available.';

  return compressed
    .map(
      (c) =>
        `### ${c.lane}:\n` +
        `  Determination: ${c.determination}\n` +
        `  Timestamps: ${c.key_timestamps.join(', ') || 'N/A'}\n` +
        `  Key Flags: ${c.flags.join('; ') || 'N/A'}\n` +
        `  Signal Count: ${c.signal_count}`
    )
    .join('\n\n');
}

export interface MetricPromptOptions {
  roleName: string;
  coreBody: string;
  metricContext?: string;
}

export function buildSystemPrompt(metricContext: any): string {
  return [
    'SYSTEM CONTEXT:',
    'You have access to a shared metric_context JSON object (provided separately) and patient_payload.',
    '',
    'Safety & Guardrails:',
    '- Use ONLY patient_payload for evidence; do not speculate or invent.',
    '- Do NOT teach or generalize; stay on-task.',
    '- Emit strictly valid JSON per the task schema.',
    '- Stay aligned to metric_context; do not introduce other metrics.',
    '- Assume metric_context is available to every task; do not restate it.',
  ].join('\n');
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

  const contextLine = metricContext && metricContext.trim().length > 0
    ? `Use shared metric_context: ${metricContext}`
    : 'Use the shared metric_context from the system prompt.';

  return [
    `ROLE: ${roleName}`,
    ``,
    contextLine,
    `- Use ONLY patient_payload.`,
    `- Do NOT restate metric_context; consume it from the system prompt.`,
    `- Emit JSON exactly matching the schema below.`,
    ``,
    coreBody.trim(),
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

  const groups = (metric.signal_groups || []).map((gid: string) => {
     const sigs = signals?.[gid] || [];
     return `${gid}: ${sigs.slice(0, 2).join(', ')}`;
  }).join('; ');

  // Short reference line; full details live in metric_context JSON in the system prompt
  return `${domainLabel} Metric: ${metric.metric_name}. Focus: ${metric.clinical_focus}. Groups: ${groups}`;
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
