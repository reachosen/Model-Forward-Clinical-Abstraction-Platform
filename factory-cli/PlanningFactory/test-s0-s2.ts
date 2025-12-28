/**
 * Test S0-S2 Pipeline
 *
 * Simple test to verify the first 3 stages work together
 */

import { PlanningInput } from '../models/PlannerPlan';
import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';

async function testS0S2Pipeline() {
  console.log('🧪 Testing S0-S2 Pipeline\n');
  console.log('='.repeat(60));

  // Test Case 1: USNWR Orthopedics (I25) - Should have ranking context
  console.log('\n📋 TEST CASE 1: USNWR Orthopedics (I25)');
  console.log('='.repeat(60));

  const i25Input: PlanningInput = {
    planning_input_id: 'test-i25-001',
    concern: 'Orthopedic procedure review for I25',
    domain_hint: 'Orthopedics',
    intent: 'quality_reporting',
    target_population: 'Pediatric patients undergoing hip/knee procedures',
    specific_requirements: [],
  };

  try {
    // S0: Input Normalization
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await s0.execute(i25Input);
    const s0Validation = s0.validate(routedInput);

    console.log('\n[S0] Validation:', s0Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s0Validation.errors.length > 0) {
      console.log('   Errors:', s0Validation.errors);
    }
    if (s0Validation.warnings.length > 0) {
      console.log('   Warnings:', s0Validation.warnings);
    }

    // S1: Domain Resolution
    const s1 = new S1_DomainResolutionStage();
    const domainContext = await s1.execute(routedInput);
    const s1Validation = s1.validate(domainContext);

    console.log('\n[S1] Validation:', s1Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s1Validation.errors.length > 0) {
      console.log('   Errors:', s1Validation.errors);
    }
    if (s1Validation.warnings.length > 0) {
      console.log('   Warnings:', s1Validation.warnings);
    }
    console.log('   Metadata:', s1Validation.metadata);

    // S2: Structural Skeleton
    const s2 = new S2_StructuralSkeletonStage();
    const skeleton = await s2.execute(routedInput, domainContext);
    const s2Validation = s2.validate(skeleton);

    console.log('\n[S2] Validation:', s2Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s2Validation.errors.length > 0) {
      console.log('   Errors:', s2Validation.errors);
    }
    if (s2Validation.warnings.length > 0) {
      console.log('   Warnings:', s2Validation.warnings);
    }
    console.log('   Metadata:', s2Validation.metadata);

    console.log('\n✅ TEST CASE 1 COMPLETED SUCCESSFULLY\n');
  } catch (error: any) {
    console.error('\n❌ TEST CASE 1 FAILED:', error.message);
    console.error(error.stack);
  }

  // Test Case 2: HAC CLABSI - Should NOT have ranking context
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST CASE 2: HAC CLABSI');
  console.log('='.repeat(60));

  const clabsiInput: PlanningInput = {
    planning_input_id: 'test-clabsi-001',
    concern: 'CLABSI review for PICU',
    domain_hint: 'HAC',
    intent: 'surveillance',
    target_population: 'PICU patients with central lines',
    specific_requirements: ['NHSN definition compliance', 'Bundle gap analysis'],
  };

  try {
    // S0: Input Normalization
    const s0 = new S0_InputNormalizationStage();
    const routedInput = await s0.execute(clabsiInput);
    const s0Validation = s0.validate(routedInput);

    console.log('\n[S0] Validation:', s0Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s0Validation.errors.length > 0) {
      console.log('   Errors:', s0Validation.errors);
    }
    if (s0Validation.warnings.length > 0) {
      console.log('   Warnings:', s0Validation.warnings);
    }

    // S1: Domain Resolution
    const s1 = new S1_DomainResolutionStage();
    const domainContext = await s1.execute(routedInput);
    const s1Validation = s1.validate(domainContext);

    console.log('\n[S1] Validation:', s1Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s1Validation.errors.length > 0) {
      console.log('   Errors:', s1Validation.errors);
    }
    if (s1Validation.warnings.length > 0) {
      console.log('   Warnings:', s1Validation.warnings);
    }
    console.log('   Metadata:', s1Validation.metadata);

    // S2: Structural Skeleton
    const s2 = new S2_StructuralSkeletonStage();
    const skeleton = await s2.execute(routedInput, domainContext);
    const s2Validation = s2.validate(skeleton);

    console.log('\n[S2] Validation:', s2Validation.passed ? '✅ PASS' : '❌ FAIL');
    if (s2Validation.errors.length > 0) {
      console.log('   Errors:', s2Validation.errors);
    }
    if (s2Validation.warnings.length > 0) {
      console.log('   Warnings:', s2Validation.warnings);
    }
    console.log('   Metadata:', s2Validation.metadata);

    console.log('\n✅ TEST CASE 2 COMPLETED SUCCESSFULLY\n');
  } catch (error: any) {
    console.error('\n❌ TEST CASE 2 FAILED:', error.message);
    console.error(error.stack);
  }

  console.log('='.repeat(60));
  console.log('🎉 ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  testS0S2Pipeline().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testS0S2Pipeline };
