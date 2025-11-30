/**
 * S3: Task Graph Identification
 *
 * **Quality-Guided Generation**: Pre-populate task graphs from archetype templates
 *
 * Determines which tasks to execute and in what order based on the archetype.
 * Uses template-based generation (no LLM calls needed) - task graphs are deterministic.
 *
 * Input: RoutedInput + DomainContext + StructuralSkeleton
 * Output: TaskGraph (DAG of tasks to execute in S5)
 *
 * Quality Strategy:
 * - Pre-populate from archetype-specific templates (PROCESS_AUDITOR_GRAPH, PREVENTABILITY_DETECTIVE_GRAPH)
 * - Task graph is deterministic based on archetype
 * - Validation confirms structure (should always pass - template is pre-validated)
 */

import {
  RoutedInput,
  DomainContext,
  StructuralSkeleton,
  TaskGraph,
  ArchetypeType,
  ValidationResult,
} from '../types';
import { randomUUID } from 'crypto';

// ============================================================================
// Task Graph Templates (Quality-Guided Generation - Pre-Population)
// ============================================================================

/**
 * Process_Auditor: Focus on protocol compliance
 * Tasks execute in order: signals → event summary → 20/80 → followup → review plan
 *
 * Graph structure:
 * signal_enrichment → event_summary → summary_20_80
 *                                   → followup_questions
 *                                   → clinical_review_plan
 */
const PROCESS_AUDITOR_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    {
      id: 'signal_enrichment',
      type: 'signal_enrichment',
      description: 'Enrich signal groups with clinical signals focused on protocol compliance',
    },
    {
      id: 'event_summary',
      type: 'event_summary',
      description: 'Generate event summary describing protocol adherence timeline',
    },
    {
      id: 'summary_20_80',
      type: 'summary_20_80',
      description: 'Generate 20% patient-facing and 80% provider-facing summaries',
    },
    {
      id: 'followup_questions',
      type: 'followup_questions',
      description: 'Generate follow-up questions for protocol compliance investigation',
    },
    {
      id: 'clinical_review_plan',
      type: 'clinical_review_plan',
      description: 'Generate clinical review plan with compliance checking tools',
    },
  ],
  edges: [
    ['signal_enrichment', 'event_summary'],
    ['event_summary', 'summary_20_80'],
    ['event_summary', 'followup_questions'],
    ['event_summary', 'clinical_review_plan'],
  ],
  constraints: {
    must_run: ['signal_enrichment', 'event_summary', 'clinical_review_plan'],
    optional: ['summary_20_80', 'followup_questions'],
  },
};

/**
 * Preventability_Detective: Focus on preventability determination
 * Tasks execute in order: signals → event summary → followup → review plan
 * (No 20/80 summary needed for HAC preventability assessments)
 *
 * Graph structure:
 * signal_enrichment → event_summary → followup_questions
 *                                   → clinical_review_plan
 */
const PREVENTABILITY_DETECTIVE_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    {
      id: 'signal_enrichment',
      type: 'signal_enrichment',
      description: 'Enrich signal groups with preventability-focused signals (rule_in/rule_out)',
    },
    {
      id: 'event_summary',
      type: 'event_summary',
      description: 'Generate HAC investigation narrative with preventability determination',
    },
    {
      id: 'followup_questions',
      type: 'followup_questions',
      description: 'Generate follow-up questions for root cause investigation',
    },
    {
      id: 'clinical_review_plan',
      type: 'clinical_review_plan',
      description: 'Generate clinical review plan with root cause analysis tools',
    },
  ],
  edges: [
    ['signal_enrichment', 'event_summary'],
    ['event_summary', 'followup_questions'],
    ['event_summary', 'clinical_review_plan'],
  ],
  constraints: {
    must_run: ['signal_enrichment', 'event_summary', 'clinical_review_plan'],
    optional: ['followup_questions'],
  },
};

/**
 * Preventability_Detective_Metric: Focus on metric thresholds
 * Similar to Process_Auditor but for metric-based assessment
 *
 * Graph structure:
 * signal_enrichment → event_summary → summary_20_80
 *                                   → followup_questions
 *                                   → clinical_review_plan
 */
const PREVENTABILITY_DETECTIVE_METRIC_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    {
      id: 'signal_enrichment',
      type: 'signal_enrichment',
      description: 'Enrich signal groups with metric-based signals (thresholds, compliance)',
    },
    {
      id: 'event_summary',
      type: 'event_summary',
      description: 'Generate event summary with metric compliance assessment',
    },
    {
      id: 'summary_20_80',
      type: 'summary_20_80',
      description: 'Generate 20% patient-facing and 80% provider-facing summaries',
    },
    {
      id: 'followup_questions',
      type: 'followup_questions',
      description: 'Generate follow-up questions for metric investigation',
    },
    {
      id: 'clinical_review_plan',
      type: 'clinical_review_plan',
      description: 'Generate clinical review plan with metric tracking tools',
    },
  ],
  edges: [
    ['signal_enrichment', 'event_summary'],
    ['event_summary', 'summary_20_80'],
    ['event_summary', 'followup_questions'],
    ['event_summary', 'clinical_review_plan'],
  ],
  constraints: {
    must_run: ['signal_enrichment', 'event_summary', 'clinical_review_plan'],
    optional: ['summary_20_80', 'followup_questions'],
  },
};

// ============================================================================
// S3: Task Graph Identification Stage
// ============================================================================

export class S3_TaskGraphIdentificationStage {
  async execute(
    input: RoutedInput,
    domainContext: DomainContext,
    skeleton: StructuralSkeleton
  ): Promise<TaskGraph> {
    const { archetype } = domainContext;

    console.log(`\n[S3] Task Graph Identification`);
    console.log(`  Archetype: ${archetype}`);

    // Quality-Guided Generation: Pre-populate from archetype template
    const taskGraph = this.selectTaskGraphTemplate(archetype);

    console.log(`  ✅ Task graph loaded from template (${taskGraph.nodes.length} tasks)`);
    console.log(`  Edges: ${taskGraph.edges.length} dependencies`);
    console.log(`  Must run: ${taskGraph.constraints.must_run.join(', ')}`);

    return taskGraph;
  }

  /**
   * Quality-Guided Generation: Select task graph template based on archetype
   *
   * This is DETERMINISTIC - no LLM call needed.
   * Task graphs are pre-validated templates that cannot fail validation.
   */
  private selectTaskGraphTemplate(archetype: ArchetypeType): TaskGraph {
    const templates: Record<ArchetypeType, Omit<TaskGraph, 'graph_id'>> = {
      Process_Auditor: PROCESS_AUDITOR_GRAPH,
      Preventability_Detective: PREVENTABILITY_DETECTIVE_GRAPH,
      Preventability_Detective_Metric: PREVENTABILITY_DETECTIVE_METRIC_GRAPH,
    };

    const template = templates[archetype];
    if (!template) {
      throw new Error(`No task graph template found for archetype: ${archetype}`);
    }

    // Deep clone and add graph_id
    return {
      graph_id: `graph_${randomUUID()}`,
      ...JSON.parse(JSON.stringify(template)),
    };
  }

  /**
   * Validate task graph structure
   *
   * Should ALWAYS pass since we're using pre-validated templates.
   * Validation confirms rather than discovers errors.
   */
  validate(taskGraph: TaskGraph, archetype: ArchetypeType): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Tier 1: Structural validation (CRITICAL)
    if (!taskGraph.graph_id) {
      errors.push('⭐ CRITICAL: Task graph must have graph_id');
    }

    if (!taskGraph.nodes || taskGraph.nodes.length === 0) {
      errors.push('⭐ CRITICAL: Task graph must have at least one node');
    }

    if (!taskGraph.edges || !Array.isArray(taskGraph.edges)) {
      errors.push('⭐ CRITICAL: Task graph must have edges array');
    }

    if (!taskGraph.constraints) {
      errors.push('⭐ CRITICAL: Task graph must have constraints defined');
    }

    // Check all nodes have required fields
    taskGraph.nodes?.forEach((node, idx) => {
      if (!node.id) {
        errors.push(`⭐ CRITICAL: Node ${idx} missing id`);
      }
      if (!node.type) {
        errors.push(`⭐ CRITICAL: Node ${idx} missing type`);
      }
    });

    // Check edges reference valid nodes
    const nodeIds = new Set(taskGraph.nodes?.map(n => n.id) || []);
    taskGraph.edges?.forEach(([from, to], idx) => {
      if (!nodeIds.has(from)) {
        errors.push(`⭐ CRITICAL: Edge ${idx} references unknown node: ${from}`);
      }
      if (!nodeIds.has(to)) {
        errors.push(`⭐ CRITICAL: Edge ${idx} references unknown node: ${to}`);
      }
    });

    // Check constraints reference valid nodes
    taskGraph.constraints?.must_run?.forEach(nodeId => {
      if (!nodeIds.has(nodeId)) {
        errors.push(`⭐ CRITICAL: Constraint must_run references unknown node: ${nodeId}`);
      }
    });

    // Tier 2: Semantic validation (archetype-specific expectations)
    if (archetype === 'Process_Auditor') {
      // Process_Auditor should have summary_20_80
      const has2080 = taskGraph.nodes?.some(n => n.type === 'summary_20_80');
      if (!has2080) {
        warnings.push('Process_Auditor typically includes summary_20_80 task');
      }
    }

    if (archetype === 'Preventability_Detective') {
      // Preventability_Detective should NOT have summary_20_80 (HAC focus)
      const has2080 = taskGraph.nodes?.some(n => n.type === 'summary_20_80');
      if (has2080) {
        warnings.push('Preventability_Detective (HAC) typically does not include summary_20_80');
      }
    }

    // Check for signal_enrichment as required task (best practice)
    const hasSignalEnrichment = taskGraph.constraints?.must_run?.includes('signal_enrichment');
    if (!hasSignalEnrichment) {
      warnings.push('Best practice: signal_enrichment should be in must_run constraints');
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        archetype,
        node_count: taskGraph.nodes?.length || 0,
        edge_count: taskGraph.edges?.length || 0,
        must_run_count: taskGraph.constraints?.must_run?.length || 0,
      },
    };
  }
}

/**
 * Quality-First Architecture Notes:
 *
 * 1. Pre-Population Strategy:
 *    - Task graphs are deterministic based on archetype
 *    - No LLM call needed → instant, zero cost, predictable
 *    - Templates are pre-validated → cannot fail
 *
 * 2. Validation is Confirmation:
 *    - validate() confirms structure is correct
 *    - Should ALWAYS pass (template is pre-validated)
 *    - If validation fails, it's a code bug, not a generation failure
 *
 * 3. Context-Aware Quality:
 *    - Process_Auditor → includes summary_20_80 (USNWR quality reporting)
 *    - Preventability_Detective → excludes summary_20_80 (HAC preventability)
 *    - Task graphs adapt to archetype requirements
 *
 * 4. Benefits:
 *    - Impossible to generate invalid task graph
 *    - Zero wasted tokens on task graph generation
 *    - Deterministic, predictable execution flow
 *    - Validation is instant (no API calls)
 */
