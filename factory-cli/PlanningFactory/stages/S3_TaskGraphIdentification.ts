/**
 * S3: Task Graph Identification
 *
 * **Quality-Guided Generation**: Multi-Lane Task Graphs
 *
 * Determines which tasks to execute and in what order based on the archetypes.
 * Generates parallel lanes for each archetype and merges them with a synthesis task.
 *
 * Input: RoutedInput + DomainContext (with archetypes[]) + StructuralSkeleton
 * Output: TaskGraph (DAG of tasks to execute in S5)
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
// S3: Task Graph Identification Stage
// ============================================================================ 

export class S3_TaskGraphIdentificationStage {
  async execute(
    input: RoutedInput,
    domainContext: DomainContext,
    skeleton: StructuralSkeleton
  ): Promise<TaskGraph> {
    const { archetypes } = domainContext;
    
    console.log(`
[S3] Task Graph Identification (Unified Control Plane)`);
    console.log(`  Archetypes: ${archetypes.join(', ')}`);

    // Unified Graph Structure (V2: Exclusion-First Gate)
    // exclusion_check runs first as early gate - if excluded, downstream tasks skip.
    // The active 'archetypes' will be passed as context to these tasks in S4/S5.

    const combinedGraph: TaskGraph = {
      graph_id: `graph_${randomUUID()}`,
      nodes: [
        { id: 'exclusion_check', type: 'exclusion_check', description: 'Early gate: check if case should be excluded from denominator' },
        { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Enrich signals for all active archetypes' },
        { id: 'event_summary', type: 'event_summary', description: 'Generate unified event narrative' },
        { id: 'followup_questions', type: 'followup_questions', description: 'Generate unified followup questions' },
        { id: 'clinical_review_plan', type: 'clinical_review_plan', description: 'Generate final review plan and determination' },
      ],
      edges: [
        ['exclusion_check', 'signal_enrichment'],  // Gate: exclusion must pass before signals
        ['signal_enrichment', 'event_summary'],
        ['signal_enrichment', 'followup_questions'],  // V2: followup depends on signals, not summary
        ['event_summary', 'clinical_review_plan'],
      ],
      constraints: {
        must_run: ['exclusion_check', 'signal_enrichment', 'event_summary', 'clinical_review_plan'],
        optional: ['followup_questions'],
        early_exit_on: ['exclusion_check']  // S5 checks this for early termination
      }
    };

    console.log(`  ✅ Generated unified graph with ${combinedGraph.nodes.length} tasks`);
    return combinedGraph;
  }

  // NOTE: Template selection is no longer used for graph generation but kept if needed for reference
  // or future "graph strategy" selection (e.g. "Lightweight" vs "Comprehensive").
  // For now, we use the hardcoded unified graph above.

  validate(taskGraph: TaskGraph, archetype: ArchetypeType): ValidationResult {
    const errors: string[] = [];
    if (taskGraph.nodes.length === 0) errors.push('Graph must have nodes');

    // V2: exclusion_check is now a required gate task
    const requiredTasks = ['exclusion_check', 'signal_enrichment', 'event_summary', 'clinical_review_plan'];
    for (const req of requiredTasks) {
      if (!taskGraph.nodes.some(n => n.type === req)) {
        errors.push(`Graph missing required task: ${req}`);
      }
    }

    return { passed: errors.length === 0, errors, warnings: [] };
  }
}