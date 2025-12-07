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

    // Lane-to-Archetype mapping: each lane uses its own archetype prompts
    // Exception: synthesis lane uses primary archetype's synthesis prompt
    const LANE_TO_ARCHETYPE = {
      process_auditor: 'Process_Auditor',
      exclusion_hunter: 'Exclusion_Hunter',
      preventability_detective: 'Preventability_Detective',
      preventability_detective_metric: 'Preventability_Detective_Metric',
      data_scavenger: 'Data_Scavenger',
      delay_driver_profiler: 'Delay_Driver_Profiler',
      outcome_tracker: 'Outcome_Tracker',
      synthesis: 'SYNTHESIS', // Special merge node - uses primary archetype
    } as const satisfies Record<string, ArchetypeType | 'SYNTHESIS'>;

    for (const node of taskGraph.nodes) {
      // Determine archetype for this task (support Multi-Archetype lanes)
      let taskArchetype = archetype; // Default to primary archetype

      if (node.id.includes(':')) {
         const prefix = node.id.split(':')[0];
         const mappedArchetype = LANE_TO_ARCHETYPE[prefix];

         if (mappedArchetype === 'SYNTHESIS') {
           // Synthesis lane: use primary archetype for synthesis prompts
           // e.g., Orthopedics_Process_Auditor_multi_archetype_synthesis_v3
           taskArchetype = archetype;
         } else if (mappedArchetype) {
           // Regular lane: use lane-specific archetype
           // e.g., Orthopedics_Delay_Driver_Profiler_signal_enrichment_v3
           taskArchetype = mappedArchetype;
         }
         // If prefix not found, fall back to primary archetype
      }

      const config = getPromptConfig(domain, taskArchetype, node.type);

      const promptPlanNode: PromptPlanNode = {
        id: node.id,
        type: node.type,
        prompt_config: config,
      };

      promptPlanNodes.push(promptPlanNode);
      const laneId = node.id.includes(':') ? node.id.split(':')[0] : 'N/A';
      console.log(`  ✅ [Lane: ${laneId} – Archetype: ${taskArchetype}] Loaded prompt: ${config.template_id}`);
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
