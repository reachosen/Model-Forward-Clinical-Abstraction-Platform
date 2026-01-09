import { getEventSummaryVariables } from '../../shared/context_builders/eventSummary';
import { getFollowupQuestionsVariables } from '../../shared/context_builders/followupQuestions';
import { getSignalEnrichmentVariables } from '../../shared/context_builders/signalEnrichment';
import { getClinicalReviewPlanVariables } from '../../shared/context_builders/clinicalReviewPlan';
import { getClinicalReviewHelperVariables } from '../../shared/context_builders/clinicalReviewHelper';
import { getExclusionCheckVariables } from '../../shared/context_builders/exclusionCheck';
import { TaskType, ArchetypeType } from '../types';
import { loadPromptFromRegistry } from './promptLoader';
import * as promptsConfig from '../config/prompts.json';

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
  archetype?: ArchetypeType | ArchetypeType[]
): string {
  // Base role names by task type (metric-agnostic)
  const baseRoles: Record<string, string> = {
    signal_enrichment: 'Clinical Signal Extractor',
    event_summary: 'Clinical Event Summary Assistant',
    followup_questions: 'Clinical Investigator',
    clinical_review_plan: 'Clinical Review Planner',
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
  // Support both single archetype and array
  if (archetype && taskType === 'signal_enrichment') {
    const activeArchetypes = Array.isArray(archetype) ? archetype : [archetype];
    const archetypeFocus: Partial<Record<ArchetypeType, string>> = {
      Process_Auditor: '(Process & Timing Focus)',
      Preventability_Detective: '(Preventability Focus)',
      Preventability_Detective_Metric: '(Metric Compliance Focus)',
      Exclusion_Hunter: '(Exclusion Criteria Focus)',
      Data_Scavenger: '(Data Completeness Focus)',
      Delay_Driver_Profiler: '(Delay Analysis Focus)',
      Outcome_Tracker: '(Outcome Monitoring Focus)',
    };
    
    // Append unique focus strings
    const focusStrings = activeArchetypes
      .map(a => archetypeFocus[a])
      .filter(f => !!f);
    
    if (focusStrings.length > 0) {
      parts.push([...new Set(focusStrings)].join(' + '));
    }
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
     return `${gid}: ${sigs.slice(0, 2).map((s: any) => {
         const id = s.id || s.signal_id;
         const text = s.description || s.name || s;
         return id ? `[${id}] ${text}` : text;
     }).join(', ')}`;
  }).join('; ');

  // Short reference line; full details live in metric_context JSON in the system prompt
  return `${domainLabel} Metric: ${metric.metric_name}. Focus: ${metric.clinical_focus}. Groups: ${groups}`;
}

/**
 * Core Hydration Engine
 * Interpolates {{variables}} into a template using the provided clinical context.
 */
export function hydratePromptText(taskType: string, template: string, context: any): string {
  const { domain, primary_archetype, semantic_context, archetypes } = context;
  const ranking_context = semantic_context?.ranking;
  
  // Create promptContext using the same structure S5 expects
  const promptContext = {
    domain,
    archetype: primary_archetype,
    archetypes: archetypes || [primary_archetype],
    ortho_context: semantic_context?.packet,
    ranking_context: ranking_context,
    skeleton: null,
  };

  let variables: Record<string, string> = {};

  if (taskType === 'signal_enrichment' || taskType === 'task_signal_generation') {
    variables = getSignalEnrichmentVariables(promptContext);
  } else if (taskType === 'event_summary' || taskType === 'task_event_summary') {
    variables = getEventSummaryVariables(promptContext);
  } else if (taskType === 'followup_questions' || taskType === 'task_followup_questions') {
    variables = getFollowupQuestionsVariables(promptContext);
  } else if (taskType === 'clinical_review_plan' || taskType === 'task_clinical_reviewer') {
    variables = getClinicalReviewPlanVariables(promptContext);
  } else if (taskType === 'clinical_review_helper') {
    variables = getClinicalReviewHelperVariables({
        ...promptContext,
        eventSummary: context.eventSummary,
        keySignals: context.keySignals,
        currentDetermination: context.currentDetermination,
        userQuery: context.userQuery,
        openQuestions: context.openQuestions
    });
  } else if (taskType === 'exclusion_check') {
    variables = getExclusionCheckVariables(promptContext);
  }

  let promptText = template;
  // Interpolate
  for (const [key, value] of Object.entries(variables)) {
    promptText = promptText.split(`{{${key}}}`).join(value);
  }

  // Clean up simple handlebars conditionals used in templates.
  promptText = promptText.replace(/{{#if\s+[^}]+}}/g, '').replace(/{{\/if}}/g, '');

  return promptText;
}

// Helper to load prompt text reusing the S5 logic
export function getPromptText(taskName: string, context: any): string {
  const taskMap: Record<string, string> = {
    'task_event_summary': 'event_summary',
    'task_followup_questions': 'followup_questions',
    'task_signal_generation': 'signal_enrichment',
    'task_clinical_reviewer': 'clinical_review_plan',
    'clinical_review_helper': 'clinical_review_helper'
  };

  const taskType = taskMap[taskName] || taskName;
  const { domain, semantic_context } = context;
  const ranking_context = semantic_context?.ranking;
  const specialty_name = ranking_context?.specialty_name;
  
  const packet = semantic_context?.packet;
  const concernId = context.concern_id || context.ortho_context?.metric?.metric_id;
  
  if (packet && concernId && !packet.metric) {
      packet.metric = packet.metrics[concernId];
  }

  const metricContextString = buildMetricContextString(packet);
  const metricName = packet?.metric?.metric_name;

  // 1. Load Template from Registry
  let promptText = loadPromptFromRegistry(domain, specialty_name, taskType) || '';

  if (!promptText) {
    const templateEntry = (promptsConfig as any)[taskType];
    if (templateEntry && templateEntry.template) {
        promptText = templateEntry.template;
    } else {
        return `Analyze this case for ${taskName}.`;
    }
  }

  // 2. Hydrate & Wrap
  const coreBody = hydratePromptText(taskType, promptText, context);
  const roleName = buildDynamicRoleName(taskType, domain, metricName, context.archetypes || [context.primary_archetype]);
  
  return buildMetricFramedPrompt({
    roleName,
    coreBody,
    metricContext: metricContextString
  });
}