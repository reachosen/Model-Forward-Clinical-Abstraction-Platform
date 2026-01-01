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
import { getTaskLLMConfig } from '../config/taskConfig';
import { Paths } from '../../utils/pathConfig';
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
  const taskConfig = getTaskLLMConfig(taskType);

  // Build template_id: {domain}_{archetype}_{task}_v3, override if config provides
  const template_id = taskConfig?.prompt_template_id || `${domain}_${archetype}_${taskType}_v3`;

  const response_format = getResponseFormat(taskType);

  const schema_ref = response_format === 'json_schema'
    ? `schemas/${domain}/${archetype}/${taskType}_v3.json`
    : undefined;

  // Resolve template_ref path
  // Logic: Map domain to framework/specialty to find file in domains_registry
  let framework = 'USNWR';
  let specialty = domain;
  
  if (domain === 'HAC') {
    framework = 'HAC';
    specialty = ''; // No specialty for HAC root
  }

  // Construct absolute path using Paths utility
  const absPath = specialty 
    ? Paths.sharedPrompts(framework, specialty) 
    : Paths.sharedPrompts(framework);
    
  const filename = `${taskType}.md`;
  const fullAbsPath = path.join(absPath, filename);
  
  // Convert to relative path from factory-cli root (where planner.ts runs)
  // factory-cli/PlanningFactory/stages/S4... -> factory-cli/
  // We want "domains_registry/..."
  const cliRoot = path.resolve(__dirname, '../../'); 
  const relativePath = path.relative(cliRoot, fullAbsPath).replace(/\\/g, '/');

  const config: PromptConfig = {
    template_id,
    template_ref: {
      path: relativePath,
      version: 'v0' // Default version
    },
    model: taskConfig?.model || DEFAULT_MODEL,
    temperature: taskConfig?.temperature ?? getTemperature(taskType),
    response_format,
    schema_ref,
    max_tokens: taskConfig?.max_tokens,
    top_p: taskConfig?.top_p,
    context_policy: taskConfig?.context_policy,
  };

  return config;
}

function getResponseFormat(taskType: TaskType): 'json' | 'json_schema' | 'text' {
  const formats: Record<TaskType, 'json' | 'json_schema' | 'text'> = {
    signal_enrichment: 'json_schema',
    event_summary: 'json',
    '20_80_display_fields': 'json',
    followup_questions: 'json',
    clinical_review_plan: 'json_schema',
  };

  return formats[taskType] || 'json';
}

function getTemperature(taskType: TaskType): number {
  const temperatures: Record<TaskType, number> = {
    signal_enrichment: 0.3,
    event_summary: 0.5,
    '20_80_display_fields': 0.6,
    followup_questions: 0.7,
    clinical_review_plan: 0.3,
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
      // In the Unified Control Plane (S3), we use a linear graph.
      // All tasks use the primary archetype's prompt templates, which are expected
      // to handle the context of all active archetypes.
      const config = getPromptConfig(domain, archetype, node.type);

      const promptPlanNode: PromptPlanNode = {
        id: node.id,
        type: node.type,
        prompt_config: config,
      };

      promptPlanNodes.push(promptPlanNode);
      console.log(`  ✅ [Archetype: ${archetype}] Loaded prompt: ${config.template_id}`);
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
