/**
 * Test S0-S3: Input → Domain → Skeleton → Task Graph
 *
 * Tests the first 4 stages of CPPO with quality gates:
 * S0: Input Normalization
 * S1: Domain Resolution
 * S2: Structural Skeleton
 * S3: Task Graph Identification
 */

import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from './stages/S3_TaskGraphIdentification';
import { ValidationFramework, GatePolicy } from './validators/ValidationFramework';
import { PlanningInput } from '../models/PlannerPlan';

async function testS0ToS3(testCase: { name: string; input: PlanningInput }) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST CASE: ${testCase.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // S0: Input Normalization
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await s0.execute(testCase.input);
    const s0Validation = s0.validate(routedInput);
    const s0Gate = ValidationFramework.enforceGate('S0', s0Validation);
    console.log(s0Gate.message);

    if (s0Gate.policy === GatePolicy.HALT) {
      throw new Error('S0 gate blocked - cannot proceed');
    }

    console.log(`\n  Routed Input:`);
    console.log(`    concern_id: ${routedInput.concern_id}`);
    console.log(`    raw_domain: ${routedInput.raw_domain || 'null'}`);

    // S1: Domain Resolution
    const s1 = new S1_DomainResolutionStage();
    const domainContext = await s1.execute(routedInput);
    const s1Validation = s1.validate(domainContext);
    const s1Gate = ValidationFramework.enforceGate('S1', s1Validation);
    console.log(s1Gate.message);

    if (s1Gate.policy === GatePolicy.HALT) {
      throw new Error('S1 gate blocked - cannot proceed');
    }

    console.log(`\n  Domain Context:`);
    console.log(`    domain: ${domainContext.domain}`);
    console.log(`    archetype: ${domainContext.archetype}`);
    console.log(`    ranking_context: ${domainContext.ranking_context ? 'YES' : 'NO'}`);
    if (domainContext.ranking_context) {
      console.log(`      rank: ${domainContext.ranking_context.rank}`);
      console.log(`      specialty: ${domainContext.ranking_context.specialty_name}`);
    }

    // S2: Structural Skeleton
    const s2 = new S2_StructuralSkeletonStage();
    const skeleton = await s2.execute(routedInput, domainContext);
    const s2Validation = s2.validate(skeleton);
    const s2Gate = ValidationFramework.enforceGate('S2', s2Validation);
    console.log(s2Gate.message);

    if (s2Gate.policy === GatePolicy.HALT) {
      throw new Error('S2 gate blocked - cannot proceed');
    }

    console.log(`\n  Structural Skeleton:`);
    console.log(`    signal_groups: ${skeleton.clinical_config?.signals?.signal_groups.length}`);
    skeleton.clinical_config?.signals?.signal_groups.forEach((g: any) => {
      console.log(`      - ${g.group_id} (${g.display_name})`);
    });

    // S3: Task Graph Identification
    const s3 = new S3_TaskGraphIdentificationStage();
    const taskGraph = await s3.execute(routedInput, domainContext, skeleton);
    const s3Validation = s3.validate(taskGraph, domainContext.archetype);
    const s3Gate = ValidationFramework.enforceGate('S3', s3Validation);
    console.log(s3Gate.message);

    if (s3Gate.policy === GatePolicy.HALT) {
      throw new Error('S3 gate blocked - cannot proceed');
    }

    console.log(`\n  Task Graph:`);
    console.log(`    graph_id: ${taskGraph.graph_id}`);
    console.log(`    total_nodes: ${taskGraph.nodes.length}`);
    console.log(`    edges: ${taskGraph.edges.length}`);
    console.log(`    must_run: ${taskGraph.constraints.must_run.join(', ')}`);
    console.log(`\n    Nodes:`);
    taskGraph.nodes.forEach((node: any) => {
      const incomingEdges = taskGraph.edges.filter(([_, to]) => to === node.id);
      const outgoingEdges = taskGraph.edges.filter(([from, _]) => from === node.id);
      console.log(`      ${node.id} (${node.type})`);
      console.log(`        Incoming: ${incomingEdges.map(([from, _]) => from).join(', ') || 'none'}`);
      console.log(`        Outgoing: ${outgoingEdges.map(([_, to]) => to).join(', ') || 'none'}`);
      console.log(`        Description: ${node.description}`);
    });

    console.log(`\n✅ [${testCase.name}] Pipeline S0-S3 completed successfully`);
    return { success: true, domainContext, skeleton, taskGraph };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ [${testCase.name}] Pipeline failed:`, errorMessage);
    return { success: false, error };
  }
}

// ============================================================================
// Test Cases
// ============================================================================

async function runTests() {
  console.log('Starting S0-S3 Pipeline Tests with Quality Gates\n');

  // Test Case 1: USNWR Orthopedics (Process_Auditor)
  await testS0ToS3({
    name: 'USNWR Orthopedics - Process_Auditor',
    input: {
      planning_input_id: 'test_ortho_001',
      concern: 'Patient with I25 diagnosis requiring quality review',
      concern_id: 'I25',
      domain_hint: 'Orthopedics',
      intent: 'quality_reporting',
      target_population: 'pediatric',
      specific_requirements: ['bundle compliance', 'protocol adherence'],
      clinical_context: {
        admission_summary: 'Pediatric patient admitted for orthopedic surgery at Boston Children\'s Hospital',
        timeline: [
          { timestamp: '2024-01-15T08:00:00Z', event: 'Admission' },
          { timestamp: '2024-01-15T10:00:00Z', event: 'Pre-op bundle checklist' },
          { timestamp: '2024-01-15T14:00:00Z', event: 'Surgery completed' },
        ],
      },
    },
  });

  // Test Case 2: HAC CLABSI (Preventability_Detective)
  await testS0ToS3({
    name: 'HAC CLABSI - Preventability_Detective',
    input: {
      planning_input_id: 'test_hac_clabsi_001',
      concern: 'CLABSI event requiring preventability assessment',
      concern_id: 'CLABSI',
      domain_hint: 'HAC',
      intent: 'surveillance',
      target_population: 'inpatient',
      specific_requirements: ['preventability determination', 'root cause analysis'],
      clinical_context: {
        admission_summary: 'Central line-associated bloodstream infection detected on day 5',
        timeline: [
          { timestamp: '2024-01-10T08:00:00Z', event: 'Central line inserted' },
          { timestamp: '2024-01-15T10:00:00Z', event: 'Positive blood culture' },
          { timestamp: '2024-01-15T14:00:00Z', event: 'CLABSI confirmed' },
        ],
      },
    },
  });

  // Test Case 3: Endocrinology with metrics (Preventability_Detective_Metric)
  await testS0ToS3({
    name: 'Endocrinology Hyperglycemia - Preventability_Detective_Metric',
    input: {
      planning_input_id: 'test_endo_e11_001',
      concern: 'Patient with E11 (Type 2 Diabetes) and hyperglycemia requiring metric assessment',
      concern_id: 'E11',
      domain_hint: 'Endocrinology',
      intent: 'quality_reporting',
      target_population: 'pediatric',
      specific_requirements: ['glycemic control assessment', 'A1c monitoring'],
      clinical_context: {
        admission_summary: 'Pediatric patient with uncontrolled Type 2 Diabetes, A1c 9.8%',
        timeline: [
          { timestamp: '2024-01-10T08:00:00Z', event: 'Admission - glucose 380 mg/dL' },
          { timestamp: '2024-01-10T12:00:00Z', event: 'Insulin protocol initiated' },
          { timestamp: '2024-01-11T08:00:00Z', event: 'Glucose 210 mg/dL' },
        ],
      },
    },
  });

  console.log('\n' + '='.repeat(80));
  console.log('All tests completed');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);
