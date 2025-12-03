/**
 * Gate-by-Gate Testing for I32b
 * Tests S0→S1→S2→S3→S4→S5→S6 incrementally
 */

import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from './stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from './stages/S4_PromptPlanGeneration';
import { PlanningInput } from '../models/PlannerPlan';

const testInput: PlanningInput = {
  planning_input_id: 'test_i32b_001',
  concern: 'I32b Neuromuscular Scoliosis review',
  concern_id: 'I32b',
  domain_hint: 'Orthopedics',
  intent: 'quality_reporting',
  target_population: 'pediatric',
  specific_requirements: ['infection prevention', 'readmission prevention'],
  clinical_context: {
    admission_summary: 'NMS patient for complex spine fusion',
    timeline: [],
  },
};

async function testGates() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        Gate-by-Gate Test: I32b Multi-Archetype           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // ========================================================================
    // GATE S0: Input Normalization
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('GATE S0: Input Normalization');
    console.log('═'.repeat(60));

    const s0 = new S0_InputNormalizationStage();
    const routedInput = await s0.execute(testInput);
    const s0Validation = s0.validate(routedInput);

    console.log('\n📊 S0 Results:');
    console.log(`  Concern ID: ${routedInput.concern_id}`);
    console.log(`  Domain Hint: ${routedInput.raw_domain}`);
    console.log(`  Has Metadata: ${!!routedInput.inferred_metadata}`);
    console.log(`\n✅ Validation: ${s0Validation.passed ? 'PASS' : 'FAIL'}`);
    if (s0Validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${s0Validation.errors.join(', ')}`);
      return;
    }
    if (s0Validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${s0Validation.warnings.join(', ')}`);
    }

    console.log('\n✓ S0 Gate: PASS - Proceeding to S1\n');

    // ========================================================================
    // GATE S1: Domain Resolution & Multi-Archetype Derivation
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('GATE S1: Domain Resolution & Multi-Archetype Derivation');
    console.log('═'.repeat(60));

    const s1 = new S1_DomainResolutionStage();
    const domainContext = await s1.execute(routedInput);
    const s1Validation = s1.validate(domainContext);

    console.log('\n📊 S1 Results:');
    console.log(`  Domain: ${domainContext.domain}`);
    console.log(`  Primary Archetype: ${domainContext.primary_archetype}`);
    console.log(`  All Archetypes: ${domainContext.archetypes.join(', ')}`);
    console.log(`  Has Semantic Packet: ${!!domainContext.semantic_context.packet}`);
    console.log(`  Has Ranking Context: ${!!domainContext.semantic_context.ranking}`);

    if (domainContext.semantic_context.packet) {
      const metric = domainContext.semantic_context.packet.metric;
      console.log(`\n📦 Semantic Packet Loaded:`);
      console.log(`  Metric: ${metric.metric_name}`);
      console.log(`  Risk Factors: ${metric.risk_factors.length}`);
      console.log(`    - ${metric.risk_factors.slice(0, 2).join('\n    - ')}`);
      console.log(`  Signal Groups: ${metric.signal_groups.join(', ')}`);
      console.log(`  Review Questions: ${metric.review_questions.length}`);
    }

    console.log(`\n✅ Validation: ${s1Validation.passed ? 'PASS' : 'FAIL'}`);
    if (s1Validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${s1Validation.errors.join(', ')}`);
      return;
    }
    if (s1Validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${s1Validation.warnings.join(', ')}`);
    }

    console.log('\n🎯 Multi-Archetype Check:');
    if (domainContext.archetypes.length > 1) {
      console.log(`  ✅ SUCCESS: ${domainContext.archetypes.length} archetypes derived`);
      console.log(`  Expected: Multi-archetype for I32b (infection + bundle + readmission)`);
      console.log(`  Actual: ${domainContext.archetypes.join(', ')}`);
    } else {
      console.log(`  ⚠️  Only 1 archetype: ${domainContext.primary_archetype}`);
      console.log(`  Expected multiple archetypes for I32b based on signal_groups:`);
      console.log(`    - bundle_compliance → Preventability_Detective`);
      console.log(`    - infection_risks → Preventability_Detective`);
    }

    console.log('\n✓ S1 Gate: PASS - Proceeding to S2\n');

    // ========================================================================
    // GATE S2: Structural Skeleton
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('GATE S2: Structural Skeleton');
    console.log('═'.repeat(60));

    const s2 = new S2_StructuralSkeletonStage();
    const skeleton = await s2.execute(routedInput, domainContext);
    const s2Validation = s2.validate(skeleton);

    console.log('\n📊 S2 Results:');
    console.log(`  Plan ID: ${skeleton.plan_metadata.plan_id}`);
    console.log(`  Concern Type: ${skeleton.plan_metadata.concern.concern_type}`);
    console.log(`  Signal Groups: ${skeleton.clinical_config.signals.signal_groups.length}`);

    console.log(`\n📋 Signal Groups Generated:`);
    skeleton.clinical_config.signals.signal_groups.forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.group_id} - ${g.display_name}`);
    });

    console.log(`\n✅ Validation: ${s2Validation.passed ? 'PASS' : 'FAIL'}`);
    if (s2Validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${s2Validation.errors.join(', ')}`);
      return;
    }
    if (s2Validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${s2Validation.warnings.join(', ')}`);
    }

    console.log('\n✓ S2 Gate: PASS - Proceeding to S3\n');

    // ========================================================================
    // GATE S3: Task Graph Identification
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('GATE S3: Task Graph Identification');
    console.log('═'.repeat(60));

    const s3 = new S3_TaskGraphIdentificationStage();
    const taskGraph = await s3.execute(routedInput, domainContext, skeleton);
    const s3Validation = s3.validate(taskGraph, domainContext.primary_archetype);

    console.log('\n📊 S3 Results:');
    console.log(`  Graph ID: ${taskGraph.graph_id}`);
    console.log(`  Total Nodes: ${taskGraph.nodes.length}`);
    console.log(`  Total Edges: ${taskGraph.edges.length}`);
    console.log(`  Must Run: ${taskGraph.constraints.must_run.length}`);
    console.log(`  Optional: ${taskGraph.constraints.optional.length}`);

    console.log(`\n📋 Task Graph Structure:`);

    // Group tasks by archetype lane
    const lanes = new Map<string, string[]>();
    taskGraph.nodes.forEach(node => {
      const lane = node.id.includes(':') ? node.id.split(':')[0] : 'synthesis';
      if (!lanes.has(lane)) lanes.set(lane, []);
      lanes.get(lane)!.push(node.id);
    });

    lanes.forEach((tasks, lane) => {
      console.log(`\n  Lane: ${lane}`);
      tasks.forEach(t => console.log(`    - ${t}`));
    });

    console.log(`\n✅ Validation: ${s3Validation.passed ? 'PASS' : 'FAIL'}`);
    if (s3Validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${s3Validation.errors.join(', ')}`);
      return;
    }
    if (s3Validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${s3Validation.warnings.join(', ')}`);
    }

    console.log('\n✓ S3 Gate: PASS - Proceeding to S4\n');

    // ========================================================================
    // GATE S4: Prompt Plan Generation
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('GATE S4: Prompt Plan Generation');
    console.log('═'.repeat(60));

    const s4 = new S4_PromptPlanGenerationStage();
    const promptPlan = await s4.execute(taskGraph, domainContext);
    const s4Validation = s4.validate(promptPlan, taskGraph);

    console.log('\n📊 S4 Results:');
    console.log(`  Prompt Plan Graph ID: ${promptPlan.graph_id}`);
    console.log(`  Prompt Nodes: ${promptPlan.nodes.length}`);

    console.log(`\n📋 Prompt Configurations:`);
    promptPlan.nodes.slice(0, 5).forEach(node => {
      console.log(`\n  Task: ${node.id}`);
      console.log(`    Template: ${node.prompt_config.template_id}`);
      console.log(`    Model: ${node.prompt_config.model}`);
      console.log(`    Temperature: ${node.prompt_config.temperature}`);
      console.log(`    Format: ${node.prompt_config.response_format}`);
    });
    if (promptPlan.nodes.length > 5) {
      console.log(`\n  ... and ${promptPlan.nodes.length - 5} more`);
    }

    console.log(`\n✅ Validation: ${s4Validation.passed ? 'PASS' : 'FAIL'}`);
    if (s4Validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${s4Validation.errors.join(', ')}`);
      return;
    }
    if (s4Validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${s4Validation.warnings.join(', ')}`);
    }

    console.log('\n✓ S4 Gate: PASS\n');

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    GATES S0-S4: ALL PASS                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('✅ S0: Input Normalization - PASS');
    console.log('✅ S1: Domain Resolution - PASS');
    console.log('✅ S2: Structural Skeleton - PASS');
    console.log('✅ S3: Task Graph - PASS');
    console.log('✅ S4: Prompt Plan - PASS');
    console.log('\n⏸️  Pausing before S5 (LLM execution)');
    console.log('   Ready to proceed with S5→S6 when confirmed.\n');

  } catch (error: any) {
    console.error(`\n❌ Gate failed: ${error.message}`);
    console.error(error.stack);
  }
}

testGates().catch(console.error);
