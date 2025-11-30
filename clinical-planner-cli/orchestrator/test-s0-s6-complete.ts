/**
 * Test S0-S6: Complete CPPO Pipeline (End-to-End)
 *
 * Tests the complete Clinical Progressive Plan Orchestrator with quality gates:
 * S0: Input Normalization
 * S1: Domain Resolution
 * S2: Structural Skeleton
 * S3: Task Graph Identification
 * S4: Prompt Plan Generation
 * S5: Task Execution (with mock LLM)
 * S6: Plan Assembly & Global Validation
 */

import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from './stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from './stages/S4_PromptPlanGeneration';
import { S5_TaskExecutionStage } from './stages/S5_TaskExecution';
import { S6_PlanAssemblyStage } from './stages/S6_PlanAssembly';
import { ValidationFramework, GatePolicy } from './validators/ValidationFramework';
import { PlanningInput } from '../models/PlannerPlan';
import * as fs from 'fs';
import * as path from 'path';

async function testCompletePipeline(testCase: { name: string; input: PlanningInput }) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST CASE: ${testCase.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // S0: Input Normalization
    console.log('🔹 Stage 0: Input Normalization');
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await s0.execute(testCase.input);
    const s0Validation = s0.validate(routedInput);
    const s0Gate = ValidationFramework.enforceGate('S0', s0Validation);
    console.log(s0Gate.message);
    if (s0Gate.policy === GatePolicy.HALT) throw new Error('S0 gate blocked');

    // S1: Domain Resolution
    console.log('\n🔹 Stage 1: Domain Resolution');
    const s1 = new S1_DomainResolutionStage();
    const domainContext = await s1.execute(routedInput);
    const s1Validation = s1.validate(domainContext);
    const s1Gate = ValidationFramework.enforceGate('S1', s1Validation);
    console.log(s1Gate.message);
    if (s1Gate.policy === GatePolicy.HALT) throw new Error('S1 gate blocked');

    // S2: Structural Skeleton
    console.log('\n🔹 Stage 2: Structural Skeleton');
    const s2 = new S2_StructuralSkeletonStage();
    const skeleton = await s2.execute(routedInput, domainContext);
    const s2Validation = s2.validate(skeleton);
    const s2Gate = ValidationFramework.enforceGate('S2', s2Validation);
    console.log(s2Gate.message);
    if (s2Gate.policy === GatePolicy.HALT) throw new Error('S2 gate blocked');

    // S3: Task Graph Identification
    console.log('\n🔹 Stage 3: Task Graph Identification');
    const s3 = new S3_TaskGraphIdentificationStage();
    const taskGraph = await s3.execute(routedInput, domainContext, skeleton);
    const s3Validation = s3.validate(taskGraph, domainContext.archetype);
    const s3Gate = ValidationFramework.enforceGate('S3', s3Validation);
    console.log(s3Gate.message);
    if (s3Gate.policy === GatePolicy.HALT) throw new Error('S3 gate blocked');

    // S4: Prompt Plan Generation
    console.log('\n🔹 Stage 4: Prompt Plan Generation');
    const s4 = new S4_PromptPlanGenerationStage();
    const promptPlan = await s4.execute(taskGraph, domainContext);
    const s4Validation = s4.validate(promptPlan, taskGraph);
    const s4Gate = ValidationFramework.enforceGate('S4', s4Validation);
    console.log(s4Gate.message);
    if (s4Gate.policy === GatePolicy.HALT) throw new Error('S4 gate blocked');

    // S5: Task Execution
    console.log('\n🔹 Stage 5: Task Execution');
    const s5 = new S5_TaskExecutionStage();
    const taskResults = await s5.execute(promptPlan, taskGraph, skeleton, domainContext);
    const s5Validation = s5.validate(taskResults, taskGraph);
    const s5Gate = ValidationFramework.enforceGate('S5', s5Validation);
    console.log(s5Gate.message);
    if (s5Gate.policy === GatePolicy.HALT) throw new Error('S5 gate blocked');

    // S6: Plan Assembly & Global Validation
    console.log('\n🔹 Stage 6: Plan Assembly & Global Validation');
    const s6 = new S6_PlanAssemblyStage();
    const plan = await s6.execute(skeleton, taskResults, domainContext);
    const s6Validation = s6.validate(plan, domainContext);
    const s6Gate = ValidationFramework.enforceGate('S6', s6Validation);
    console.log(s6Gate.message);
    if (s6Gate.policy === GatePolicy.HALT) throw new Error('S6 gate blocked');

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ PIPELINE COMPLETE: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n📊 Final Plan Summary:`);
    console.log(`  Plan ID: ${plan.plan_metadata.plan_id}`);
    console.log(`  Domain: ${plan.plan_metadata.concern.domain}`);
    console.log(`  Concern Type: ${plan.plan_metadata.concern.concern_type}`);
    console.log(`  Archetype: ${domainContext.archetype}`);
    console.log(`  Signal Groups: ${plan.clinical_config.signals.signal_groups.length}`);
    console.log(`  Total Signals: ${plan.clinical_config.signals.signal_groups.reduce((sum, g) => sum + g.signals.length, 0)}`);
    console.log(`  Clinical Tools: ${plan.clinical_config.clinical_tools.length}`);
    const eventSummary = (plan.clinical_config.questions as any).event_summary || '';
    console.log(`  Event Summary: ${eventSummary.substring(0, 100)}...`);
    const rankingCtx = (plan.clinical_config.questions as any).ranking_context;
    console.log(`  Has Ranking Context: ${rankingCtx ? 'YES' : 'NO'}`);
    if (rankingCtx) {
      console.log(`    Rank: #${rankingCtx.rank} in ${rankingCtx.specialty_name}`);
    }
    const summary2080 = (plan.clinical_config.questions as any).summary_20_80;
    console.log(`  Has 20/80 Summary: ${summary2080 ? 'YES' : 'NO'}`);
    const followupQuestions = (plan.clinical_config.questions as any).followup_questions || [];
    console.log(`  Follow-up Questions: ${followupQuestions.length}`);

    // Validation summary
    console.log(`\n🎯 Quality Gates Summary:`);
    console.log(`  S0: ${s0Gate.policy === GatePolicy.PASS ? '✅ PASS' : s0Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S1: ${s1Gate.policy === GatePolicy.PASS ? '✅ PASS' : s1Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S2: ${s2Gate.policy === GatePolicy.PASS ? '✅ PASS' : s2Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S3: ${s3Gate.policy === GatePolicy.PASS ? '✅ PASS' : s3Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S4: ${s4Gate.policy === GatePolicy.PASS ? '✅ PASS' : s4Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S5: ${s5Gate.policy === GatePolicy.PASS ? '✅ PASS' : s5Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);
    console.log(`  S6: ${s6Gate.policy === GatePolicy.PASS ? '✅ PASS' : s6Gate.policy === GatePolicy.WARN ? '⚠️  WARN' : '❌ HALT'}`);

    if (s6Validation.warnings.length > 0) {
      console.log(`\n⚠️  Tier 2 Warnings:`);
      s6Validation.warnings.forEach(w => console.log(`  - ${w}`));
    }

    // Save plan to file
    const outputDir = path.join(__dirname, '..', 'output', 'test-plans');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filename = `plan_${testCase.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(plan, null, 2));
    console.log(`\n💾 Plan saved to: ${filepath}`);

    return { success: true, plan };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Pipeline failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Test Cases
// ============================================================================

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   CPPO Complete Pipeline Test (S0-S6 with Quality Gates)     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const results = [];

  // Test Case 1: USNWR Orthopedics (Process_Auditor, Rank 20)
  results.push(await testCompletePipeline({
    name: 'USNWR_Orthopedics_Process_Auditor',
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
  }));

  // Test Case 2: HAC CLABSI (Preventability_Detective)
  results.push(await testCompletePipeline({
    name: 'HAC_CLABSI_Preventability_Detective',
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
  }));

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     Test Results Summary                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed! CPPO pipeline is working correctly.`);
  }
}

// Run tests
runTests().catch(console.error);
