/**
 * S4: Task-Based Prompt Plan Generation
 *
 * **Quality-Guided Generation**: Lookup prompts from versioned registry
 *
 * Generates a prompt execution plan by looking up prompt templates for each task
 * in the task graph. Prompts are selected based on domain/archetype/task combination.
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
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Load model from environment variable
const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

// ============================================================================
// Prompt Registry
// ============================================================================

function getPromptConfig(
  domain: string,
  archetype: ArchetypeType,
  taskType: TaskType
): PromptConfig {
  // Build template_id: {domain}_{archetype}_{task}_v3
  const template_id = `${domain}_${archetype}_${taskType}_v3`;

  const response_format = getResponseFormat(taskType);

  const schema_ref = response_format === 'json_schema'
    ? `schemas/${domain}/${archetype}/${taskType}_v3.json`
    : undefined;

  const config: PromptConfig = {
    template_id,
    model: DEFAULT_MODEL,
    temperature: getTemperature(taskType),
    response_format,
    schema_ref,
  };

  return config;
}

function getResponseFormat(taskType: TaskType): 'json' | 'json_schema' | 'text' {
  const formats: Record<TaskType, 'json' | 'json_schema' | 'text'> = {
    signal_enrichment: 'json_schema',
    event_summary: 'json',
    summary_20_80: 'json',
    followup_questions: 'json',
    clinical_review_plan: 'json_schema',
    multi_archetype_synthesis: 'json_schema', // Structured output
  };

  return formats[taskType] || 'json';
}

function getTemperature(taskType: TaskType): number {
  const temperatures: Record<TaskType, number> = {
    signal_enrichment: 0.3,
    event_summary: 0.5,
    summary_20_80: 0.6,
    followup_questions: 0.7,
    clinical_review_plan: 0.3,
    multi_archetype_synthesis: 0.4, // Balanced
  };

  return temperatures[taskType] || 0.5;
}

// ============================================================================ 
// S4: Prompt Plan Generation Stage
// ============================================================================ 

export class S4_PromptPlanGenerationStage {
  async execute(taskGraph: TaskGraph, domainContext: DomainContext): Promise<PromptPlan> {
    const { domain, primary_archetype } = domainContext;
    const archetype = primary_archetype; // Default archetype

    console.log(`
[S4] Task-Based Prompt Plan Generation`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Primary Archetype: ${archetype}`);
    console.log(`  Tasks: ${taskGraph.nodes.length}`);

    const promptPlanNodes: PromptPlanNode[] = [];

    for (const node of taskGraph.nodes) {
      // Determine archetype for this task (support Multi-Archetype)
      let taskArchetype = archetype;
      
      if (node.id.includes(':') && node.type !== 'multi_archetype_synthesis') {
         const prefix = node.id.split(':')[0];
         if (prefix === 'process_auditor') taskArchetype = 'Process_Auditor';
         else if (prefix === 'exclusion_hunter') taskArchetype = 'Exclusion_Hunter';
         else if (prefix === 'preventability_detective') taskArchetype = 'Preventability_Detective';
         else if (prefix === 'data_scavenger') taskArchetype = 'Data_Scavenger';
      }

      const config = getPromptConfig(domain, taskArchetype, node.type);

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

  validate(promptPlan: PromptPlan, taskGraph: TaskGraph): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!promptPlan.graph_id) errors.push('⭐ CRITICAL: Prompt plan must have graph_id');
    if (!promptPlan.nodes || promptPlan.nodes.length === 0) errors.push('⭐ CRITICAL: Prompt plan must have nodes');

    if (promptPlan.graph_id !== taskGraph.graph_id) warnings.push('Prompt plan graph_id does not match task graph');

    const taskIds = new Set(taskGraph.nodes.map(n => n.id));
    const promptNodeIds = new Set(promptPlan.nodes.map(n => n.id));

    for (const taskId of taskIds) {
      if (!promptNodeIds.has(taskId)) errors.push(`⭐ CRITICAL: No prompt found for task: ${taskId}`);
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
