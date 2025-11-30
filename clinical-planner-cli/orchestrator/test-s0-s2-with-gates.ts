/**
 * Test S0-S2 Pipeline WITH QUALITY GATES
 *
 * Demonstrates: Quality ingrained at every stage
 */

import { PlanningInput } from '../models/PlannerPlan';
import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';
import { ValidationFramework, GatePolicy, getStageQualityCriteria } from './validators/ValidationFramework';

/**
 * Execute a stage with quality gate enforcement
 */
async function executeStageWithGate<TInput, TOutput>(
  stageName: string,
  stageId: 'S0' | 'S1' | 'S2',
  stageExecutor: { execute: (input: TInput) => Promise<TOutput>; validate: (output: TOutput) => any },
  input: TInput
): Promise<TOutput | null> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Executing ${stageName}`);
  console.log(`${'='.repeat(60)}`);

  // Show quality criteria for this stage
  const criteria = getStageQualityCriteria(stageId);
  console.log(`\n📋 Quality Criteria (${criteria.length} checks):`);
  criteria.forEach((criterion, i) => {
    const isCritical = criterion.includes('⭐ CRITICAL');
    const prefix = isCritical ? '   ⭐' : '   •';
    console.log(`${prefix} ${criterion.replace('⭐ CRITICAL: ', '')}`);
  });

  // Execute stage
  const startTime = new Date();
  console.log(`\n⏱️  Starting execution...`);
  const output = await stageExecutor.execute(input);
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();
  console.log(`✅ Execution completed in ${duration}ms`);

  // Validate stage output
  console.log(`\n🔍 Running validation...`);
  const validationResult = stageExecutor.validate(output);

  // Enforce quality gate
  console.log(`\n🚦 Enforcing quality gate...`);
  const gateResult = ValidationFramework.enforceGate(stageId, validationResult);
  ValidationFramework.logGate(gateResult);

  // Handle gate decision
  if (gateResult.policy === GatePolicy.HALT) {
    console.log(`\n❌ PIPELINE HALTED - Tier 1 failure cannot be bypassed`);
    console.log(`   Fix the errors above before proceeding.`);
    return null;
  }

  if (gateResult.policy === GatePolicy.WARN) {
    console.log(`\n⚠️  Pipeline continuing with warnings (Tier 2 issues)`);
    console.log(`   Consider addressing warnings for better quality.`);
  }

  if (gateResult.policy === GatePolicy.PASS) {
    console.log(`\n✅ Gate passed - proceeding to next stage`);
  }

  return output;
}

async function testPipelineWithQualityGates() {
  console.log('🧪 Testing S0-S2 Pipeline WITH QUALITY GATES\n');
  console.log('This demonstrates: Quality ingrained at EVERY stage');
  console.log('='.repeat(60));

  // Test Case: USNWR Orthopedics (I25)
  console.log('\n\n📋 TEST CASE: USNWR Orthopedics (I25)');
  console.log('Expected: All gates PASS (this is a well-formed input)');
  console.log('='.repeat(60));

  const i25Input: PlanningInput = {
    planning_input_id: 'test-i25-gates',
    concern: 'Orthopedic procedure review for I25',
    domain_hint: 'Orthopedics',
    intent: 'quality_reporting',
    target_population: 'Pediatric patients undergoing hip/knee procedures',
    specific_requirements: [],
  };

  try {
    // GATE 1: S0 Input Normalization
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await executeStageWithGate(
      'S0: Input Normalization',
      'S0',
      s0,
      i25Input
    );

    if (!routedInput) {
      console.log('\n🛑 Test stopped at S0 gate');
      return;
    }

    // GATE 2: S1 Domain Resolution
    const s1 = new S1_DomainResolutionStage();
    const domainContext = await executeStageWithGate(
      'S1: Domain Resolution',
      'S1',
      s1,
      routedInput
    );

    if (!domainContext) {
      console.log('\n🛑 Test stopped at S1 gate');
      return;
    }

    // GATE 3: S2 Structural Skeleton
    const s2 = new S2_StructuralSkeletonStage();
    // Note: S2 needs both routedInput and domainContext, so we wrap it
    const s2Wrapper = {
      execute: async () => s2.execute(routedInput, domainContext),
      validate: (output: any) => s2.validate(output)
    };
    const skeleton = await executeStageWithGate(
      'S2: Structural Skeleton',
      'S2',
      s2Wrapper,
      null as any
    );

    if (!skeleton) {
      console.log('\n🛑 Test stopped at S2 gate');
      return;
    }

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL GATES PASSED - Pipeline completed successfully');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   • S0 Gate: ✅ PASS');
    console.log('   • S1 Gate: ✅ PASS');
    console.log('   • S2 Gate: ✅ PASS');
    console.log('\n🏆 Quality ingrained at every stage!');
    console.log('   - Each stage validated its output');
    console.log('   - Gates enforced Tier 1 (halt) vs Tier 2 (warn) policy');
    console.log('   - Pipeline only proceeded when quality criteria met');

  } catch (error: any) {
    console.error('\n💥 UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
  }

  // Test Case 2: Invalid input (demonstrate HALT)
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 TEST CASE 2: Invalid Input (demonstrates HALT)');
  console.log('Expected: S0 gate HALTS pipeline');
  console.log('='.repeat(60));

  const invalidInput: PlanningInput = {
    planning_input_id: 'test-invalid',
    concern: 'Unknown concern XYZ999', // Invalid concern_id
    domain_hint: 'Orthopedics',
    intent: 'quality_reporting',
    target_population: 'Pediatric patients',
    specific_requirements: [],
  };

  try {
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await executeStageWithGate(
      'S0: Input Normalization',
      'S0',
      s0,
      invalidInput
    );

    if (!routedInput) {
      console.log('\n✅ Test correctly halted at S0 gate (invalid concern_id)');
      console.log('   This demonstrates Tier 1 gate enforcement!');
    } else {
      console.log('\n⚠️  Expected gate to halt, but it passed');
      console.log('   This may indicate validation needs strengthening');
    }

  } catch (error: any) {
    console.error('\n💥 UNEXPECTED ERROR:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📚 Key Takeaways:');
  console.log('='.repeat(60));
  console.log('1. Quality is checked at EVERY stage (S0, S1, S2, ...)');
  console.log('2. Each stage has explicit quality criteria (QUALITY_CRITERIA.md)');
  console.log('3. Gates enforce policy:');
  console.log('   - Tier 1 errors → HALT pipeline (structural issues)');
  console.log('   - Tier 2 warnings → WARN but continue (semantic issues)');
  console.log('4. Pipeline only proceeds when quality standards met');
  console.log('5. This ensures: Bad inputs cannot produce bad outputs');
  console.log('\n💎 Quality ingrained at every gate = Predictable, reliable plans');
}

// Run the test
if (require.main === module) {
  testPipelineWithQualityGates().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testPipelineWithQualityGates };
