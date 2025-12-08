export interface TaskLLMConfig {
  task_id: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  context_policy?: string;
  prompt_template_id?: string;
}

/**
 * Per-task LLM and context policy defaults.
 * These are observation-friendly and do not change behavior when unset.
 */
export const TASK_LLM_CONFIGS: Record<string, TaskLLMConfig> = {
  signal_enrichment: {
    task_id: 'signal_enrichment',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 1200,
    context_policy: 'rich_signals_first',
    prompt_template_id: 'signal_enrichment.v1',
  },
  event_summary: {
    task_id: 'event_summary',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 800,
    context_policy: 'timeline_first',
    prompt_template_id: 'event_summary.v1',
  },
  followup_questions: {
    task_id: 'followup_questions',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 600,
    context_policy: 'gaps_first',
    prompt_template_id: 'followup_questions.v1',
  },
  clinical_review_plan: {
    task_id: 'clinical_review_plan',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 800,
    context_policy: 'tools_first',
    prompt_template_id: 'clinical_review_plan.v1',
  },
  multi_archetype_synthesis_draft: {
    task_id: 'multi_archetype_synthesis_draft',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1200,
    context_policy: 'synthesis_lane_first',
    prompt_template_id: 'multi_archetype_synthesis_draft.v1',
  },
  multi_archetype_synthesis_verify: {
    task_id: 'multi_archetype_synthesis_verify',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 1200,
    context_policy: 'synthesis_lane_first',
    prompt_template_id: 'multi_archetype_synthesis_verify.v1',
  },
};

export function getTaskLLMConfig(taskType: string): TaskLLMConfig | undefined {
  return TASK_LLM_CONFIGS[taskType];
}
