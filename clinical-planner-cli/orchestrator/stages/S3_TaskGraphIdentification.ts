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
// Task Graph Templates
// ============================================================================ 

const PROCESS_AUDITOR_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Enrich signal groups' },
    { id: 'event_summary', type: 'event_summary', description: 'Generate protocol adherence summary' },
    { id: 'summary_20_80', type: 'summary_20_80', description: 'Generate patient/provider summaries' },
    { id: 'followup_questions', type: 'followup_questions', description: 'Generate compliance questions' },
    { id: 'clinical_review_plan', type: 'clinical_review_plan', description: 'Generate review tools' },
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

const PREVENTABILITY_DETECTIVE_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Enrich preventability signals' },
    { id: 'event_summary', type: 'event_summary', description: 'Generate investigation narrative' },
    { id: 'followup_questions', type: 'followup_questions', description: 'Generate root cause questions' },
    { id: 'clinical_review_plan', type: 'clinical_review_plan', description: 'Generate RCA tools' },
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

const PREVENTABILITY_DETECTIVE_METRIC_GRAPH = PREVENTABILITY_DETECTIVE_GRAPH;

const EXCLUSION_HUNTER_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Find exclusion criteria' },
    { id: 'event_summary', type: 'event_summary', description: 'Summarize exclusion status' },
  ],
  edges: [
    ['signal_enrichment', 'event_summary']
  ],
  constraints: {
    must_run: ['signal_enrichment', 'event_summary'],
    optional: [],
  },
};

const DATA_SCAVENGER_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Scavenge data elements' },
    { id: 'event_summary', type: 'event_summary', description: 'Summarize data completeness' },
  ],
  edges: [
    ['signal_enrichment', 'event_summary']
  ],
  constraints: {
    must_run: ['signal_enrichment', 'event_summary'],
    optional: [],
  },
};

// Delay_Driver_Profiler: Focuses on timing and delay analysis (similar to Process_Auditor)
const DELAY_DRIVER_PROFILER_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Extract delay-related signals' },
    { id: 'event_summary', type: 'event_summary', description: 'Generate delay timeline summary' },
    { id: 'summary_20_80', type: 'summary_20_80', description: 'Summarize key delay drivers' },
    { id: 'followup_questions', type: 'followup_questions', description: 'Generate timing clarification questions' },
    { id: 'clinical_review_plan', type: 'clinical_review_plan', description: 'Generate delay analysis tools' },
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

// Outcome_Tracker: Focuses on outcome monitoring (similar to Preventability_Detective)
const OUTCOME_TRACKER_GRAPH: Omit<TaskGraph, 'graph_id'> = {
  nodes: [
    { id: 'signal_enrichment', type: 'signal_enrichment', description: 'Extract outcome-related signals' },
    { id: 'event_summary', type: 'event_summary', description: 'Generate outcome narrative' },
    { id: 'followup_questions', type: 'followup_questions', description: 'Generate outcome clarification questions' },
    { id: 'clinical_review_plan', type: 'clinical_review_plan', description: 'Generate outcome tracking tools' },
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
    const laneCount = archetypes.length;
    const laneMode = laneCount === 1 ? 'Single Lane' : 'Multi-Lane';

    console.log(`
[S3] Task Graph Identification (${laneMode})`);
    console.log(`  Lane Count: ${laneCount}`);
    console.log(`  Archetypes: ${archetypes.join(', ')}`);

    const combinedGraph: TaskGraph = {
      graph_id: `graph_${randomUUID()}`,
      nodes: [],
      edges: [],
      constraints: { must_run: [], optional: [] }
    };

    const laneFinalNodes: string[] = [];

    // Build lanes for each archetype
    for (const archetype of archetypes) {
      const template = this.selectTaskGraphTemplate(archetype);
      const prefix = archetype.toLowerCase(); // Namespace: e.g. "process_auditor"

      // Clone and namespace nodes
      const laneNodes = template.nodes.map(n => ({
        ...n,
        id: `${prefix}:${n.id}`
      }));

      // Namespace edges
      const laneEdges = template.edges.map(e => [
        `${prefix}:${e[0]}`,
        `${prefix}:${e[1]}`
      ] as [string, string]);

      // Add to combined graph
      combinedGraph.nodes.push(...laneNodes);
      combinedGraph.edges.push(...laneEdges);
      
      combinedGraph.constraints.must_run.push(
        ...template.constraints.must_run.map(id => `${prefix}:${id}`)
      );
      combinedGraph.constraints.optional.push(
        ...template.constraints.optional.map(id => `${prefix}:${id}`)
      );

      // Identify final node of this lane
      const sourceNodes = new Set(laneEdges.map(e => e[0]));
      const finalNode = laneNodes.find(n => !sourceNodes.has(n.id));
      if (finalNode) {
        laneFinalNodes.push(finalNode.id);
      }
    }

    // Add Synthesis Node
    const synthesisId = 'synthesis:multi_archetype_synthesis';
    combinedGraph.nodes.push({
      id: synthesisId,
      type: 'multi_archetype_synthesis',
      description: 'Merge findings from multiple archetype lanes'
    });
    combinedGraph.constraints.must_run.push(synthesisId);

    // Connect all lanes to synthesis
    for (const finalNodeId of laneFinalNodes) {
      combinedGraph.edges.push([finalNodeId, synthesisId]);
    }

    console.log(`  ✅ Generated ${combinedGraph.nodes.length} tasks across ${laneCount} ${laneCount === 1 ? 'lane' : 'lanes'} (${laneMode})`);
    return combinedGraph;
  }

  private selectTaskGraphTemplate(archetype: ArchetypeType): Omit<TaskGraph, 'graph_id'> {
    const templates: Record<ArchetypeType, Omit<TaskGraph, 'graph_id'>> = {
      Process_Auditor: PROCESS_AUDITOR_GRAPH,
      Preventability_Detective: PREVENTABILITY_DETECTIVE_GRAPH,
      Preventability_Detective_Metric: PREVENTABILITY_DETECTIVE_METRIC_GRAPH,
      Exclusion_Hunter: EXCLUSION_HUNTER_GRAPH,
      Data_Scavenger: DATA_SCAVENGER_GRAPH,
      Delay_Driver_Profiler: DELAY_DRIVER_PROFILER_GRAPH,
      Outcome_Tracker: OUTCOME_TRACKER_GRAPH,
    };

    const template = templates[archetype];
    if (!template) {
      // Fallback to Process_Auditor if unknown
      console.warn(`⚠️  Unknown archetype ${archetype}, using Process_Auditor template`);
      return PROCESS_AUDITOR_GRAPH;
    }
    return template;
  }

  validate(taskGraph: TaskGraph, archetype: ArchetypeType): ValidationResult {
    // Simplified validation for V10
    const errors: string[] = [];
    if (taskGraph.nodes.length === 0) errors.push('Graph must have nodes');
    if (!taskGraph.nodes.some(n => n.type === 'multi_archetype_synthesis')) {
      errors.push('Graph must include synthesis task');
    }
    return { passed: errors.length === 0, errors, warnings: [] };
  }
}