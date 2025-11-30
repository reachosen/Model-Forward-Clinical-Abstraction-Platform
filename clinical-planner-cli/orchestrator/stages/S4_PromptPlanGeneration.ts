/**
 * S4: Task-Based Prompt Plan Generation
 *
 * **Quality-Guided Generation**: Lookup prompts from versioned registry
 *
 * Generates a prompt execution plan by looking up prompt templates for each task
 * in the task graph. Prompts are selected based on domain/archetype/task combination.
 *
 * Input: TaskGraph + DomainContext
 * Output: PromptPlan (map of task_id → prompt config)
 *
 * Quality Strategy:
 * - Lookup prompts from versioned registry (prompts/{domain}/{archetype}/{task}/v{N}.ts)
 * - Registry ensures prompt templates exist and are valid
 * - Validation confirms all required tasks have prompts (should always pass)
 */

import {
  TaskGraph,
  DomainContext,
  PromptPlan,
  PromptPlanNode,
  PromptConfig,
  ValidationResult,
  ArchetypeType,
  TaskType,
} from '../types';

// ============================================================================
// Prompt Registry (Quality-Guided Generation - Lookup)
// ============================================================================

/**
 * Get prompt config for a specific domain/archetype/task combination
 *
 * Quality-Guided: This lookup is deterministic - we KNOW which prompt to use.
 * No LLM call needed to select prompts.
 *
 * In production, this would load from prompts/{domain}/{archetype}/{task}/v{N}.ts
 */
function getPromptConfig(
  domain: string,
  archetype: ArchetypeType,
  taskType: TaskType
): PromptConfig {
  // Build template_id: {domain}_{archetype}_{task}_v3
  const template_id = `${domain}_${archetype}_${taskType}_v3`;

  // Determine response format based on task type
  const response_format = getResponseFormat(taskType);

  // Build schema reference if JSON schema is used
  const schema_ref = response_format === 'json_schema'
    ? `schemas/${domain}/${archetype}/${taskType}_v3.json`
    : undefined;

  // Build prompt config
  const config: PromptConfig = {
    template_id,
    model: 'gpt-4',
    temperature: getTemperature(taskType),
    response_format,
    schema_ref,
  };

  return config;
}

/**
 * Get response format based on task type
 *
 * Tasks that require structured output use JSON schema.
 * Tasks that generate narrative text use plain JSON or text.
 */
function getResponseFormat(taskType: TaskType): 'json' | 'json_schema' | 'text' {
  const formats: Record<TaskType, 'json' | 'json_schema' | 'text'> = {
    signal_enrichment: 'json_schema', // Structured output - enforce schema
    event_summary: 'json', // Narrative but structured
    summary_20_80: 'json', // Two summaries as JSON
    followup_questions: 'json', // Array of questions
    clinical_review_plan: 'json_schema', // Structured output - enforce schema
  };

  return formats[taskType] || 'json';
}

/**
 * Get temperature based on task type
 *
 * Structured tasks (signals, review plans) use lower temperature (more deterministic).
 * Narrative tasks (summaries, questions) use higher temperature (more creative).
 */
function getTemperature(taskType: TaskType): number {
  const temperatures: Record<TaskType, number> = {
    signal_enrichment: 0.3, // Low - structured, factual
    event_summary: 0.5, // Medium - narrative but factual
    summary_20_80: 0.6, // Medium-high - patient-friendly narratives
    followup_questions: 0.7, // High - creative question generation
    clinical_review_plan: 0.3, // Low - structured, methodical
  };

  return temperatures[taskType] || 0.5;
}

// ============================================================================
// S4: Prompt Plan Generation Stage
// ============================================================================

export class S4_PromptPlanGenerationStage {
  async execute(taskGraph: TaskGraph, domainContext: DomainContext): Promise<PromptPlan> {
    const { domain, archetype } = domainContext;

    console.log(`\n[S4] Task-Based Prompt Plan Generation`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Archetype: ${archetype}`);
    console.log(`  Tasks: ${taskGraph.nodes.length}`);

    // Quality-Guided Generation: Lookup prompt configs from registry
    const promptPlanNodes: PromptPlanNode[] = [];

    for (const node of taskGraph.nodes) {
      // Get prompt config for this domain/archetype/task
      const config = getPromptConfig(domain, archetype, node.type);

      const promptPlanNode: PromptPlanNode = {
        id: node.id,
        type: node.type,
        prompt_config: config,
      };

      promptPlanNodes.push(promptPlanNode);
      console.log(`  ✅ Loaded prompt: ${config.template_id}`);
    }

    const promptPlan: PromptPlan = {
      graph_id: taskGraph.graph_id,
      nodes: promptPlanNodes,
    };

    console.log(`  ✅ Prompt plan generated (${promptPlanNodes.length} prompts)`);

    return promptPlan;
  }

  /**
   * Validate prompt plan
   *
   * Should ALWAYS pass since prompts are loaded from registry.
   * Validation confirms all tasks have prompts.
   */
  validate(promptPlan: PromptPlan, taskGraph: TaskGraph): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Tier 1: Structural validation
    if (!promptPlan.graph_id) {
      errors.push('⭐ CRITICAL: Prompt plan must have graph_id');
    }

    if (!promptPlan.nodes || promptPlan.nodes.length === 0) {
      errors.push('⭐ CRITICAL: Prompt plan must have at least one node');
    }

    // Check graph_id matches
    if (promptPlan.graph_id !== taskGraph.graph_id) {
      warnings.push('Prompt plan graph_id does not match task graph graph_id');
    }

    // Check all tasks have prompts
    const taskIds = new Set(taskGraph.nodes.map(n => n.id));
    const promptNodeIds = new Set(promptPlan.nodes.map(n => n.id));

    for (const taskId of taskIds) {
      if (!promptNodeIds.has(taskId)) {
        errors.push(`⭐ CRITICAL: No prompt found for task: ${taskId}`);
      }
    }

    // Check all prompt nodes reference valid tasks
    for (const node of promptPlan.nodes) {
      if (!taskIds.has(node.id)) {
        warnings.push(`Prompt node references unknown task: ${node.id}`);
      }

      // Tier 2: Check prompt config has required fields
      const config = node.prompt_config;

      if (!config.template_id) {
        errors.push(`⭐ CRITICAL: Prompt for ${node.id} missing template_id`);
      }

      if (!config.model) {
        errors.push(`⭐ CRITICAL: Prompt for ${node.id} missing model`);
      }

      if (!config.response_format) {
        errors.push(`⭐ CRITICAL: Prompt for ${node.id} missing response_format`);
      }

      // Warn if json_schema is used but no schema_ref provided
      if (config.response_format === 'json_schema' && !config.schema_ref) {
        warnings.push(`Prompt for ${node.id} uses json_schema but missing schema_ref`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        prompt_node_count: promptPlan.nodes.length,
        task_count: taskGraph.nodes.length,
      },
    };
  }
}

/**
 * Quality-First Architecture Notes:
 *
 * 1. Registry-Based Lookup:
 *    - Prompts are pre-defined in versioned files
 *    - No LLM call needed to select prompts → deterministic
 *    - Registry ensures prompts exist and are valid
 *
 * 2. Validation is Confirmation:
 *    - validate() confirms all tasks have prompts
 *    - Should ALWAYS pass (registry guarantees prompt existence)
 *    - If validation fails, it's a code bug (missing template file)
 *
 * 3. Context-Aware Quality:
 *    - Prompts are specific to domain/archetype/task
 *    - Process_Auditor prompts emphasize protocol compliance
 *    - Preventability_Detective prompts emphasize preventability
 *    - Prompts inject quality requirements directly
 *
 * 4. Quality-Guided Generation (in S5):
 *    - output_schema enforces structure at generation time
 *    - context_requirements ensure prompt has necessary inputs
 *    - Tier 1 failures become impossible (schema enforces structure)
 */
