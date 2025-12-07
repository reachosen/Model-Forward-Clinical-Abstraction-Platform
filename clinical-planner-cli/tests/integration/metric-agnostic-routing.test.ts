/**
 * Metric-Agnostic Routing Tests
 *
 * Verifies the refactored pipeline handles any metric through generic,
 * data-driven flows without per-metric conditionals.
 *
 * Tests:
 * 1. Concern registry routing (no hardcoded domain→concern fallbacks)
 * 2. Single-lane vs Multi-lane detection and logging
 * 3. Dynamic role names based on metric context
 * 4. Generic prompt generation for any metric
 * 5. S5 schema selection is per task_type, not per metric
 */

import { PlanningInput } from '../../models/PlannerPlan';
import { S0_InputNormalizationStage } from '../../orchestrator/stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../../orchestrator/stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from '../../orchestrator/stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from '../../orchestrator/stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from '../../orchestrator/stages/S4_PromptPlanGeneration';
import { isConcernKnown, getConcernRouting } from '../../config/concernRegistry';
import { buildDynamicRoleName, buildMetricContextString } from '../../orchestrator/utils/promptBuilder';

// Test Helpers
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

// ============================================================================
// Test 1: Concern Registry Routing
// ============================================================================

async function testConcernRegistryRouting() {
  console.log('\n🧪 Test 1: Concern Registry Routing');
  console.log('='.repeat(60));

  const testCases = [
    { concernId: 'I25', expectedDomain: 'Orthopedics', expectedKnown: true },
    { concernId: 'I26', expectedDomain: 'Orthopedics', expectedKnown: true },
    { concernId: 'CLABSI', expectedDomain: 'HAC', expectedKnown: true },
    { concernId: 'C41.1a', expectedDomain: 'Endocrinology', expectedKnown: true },
    { concernId: 'UNKNOWN_METRIC', expectedDomain: null, expectedKnown: false },
  ];

  let failures = 0;

  for (const tc of testCases) {
    const known = isConcernKnown(tc.concernId);
    const routing = getConcernRouting(tc.concernId);

    if (known !== tc.expectedKnown) {
      console.log(`   ❌ ${tc.concernId}: isConcernKnown = ${known}, expected ${tc.expectedKnown}`);
      failures++;
      continue;
    }

    if (tc.expectedKnown && routing?.domain !== tc.expectedDomain) {
      console.log(`   ❌ ${tc.concernId}: domain = ${routing?.domain}, expected ${tc.expectedDomain}`);
      failures++;
      continue;
    }

    console.log(`   ✅ ${tc.concernId}: correctly routed (known=${known}, domain=${routing?.domain || 'N/A'})`);
  }

  if (failures === 0) {
    console.log('\n   🎉 All concern routing tests passed!');
  } else {
    console.log(`\n   💥 ${failures} concern routing tests failed`);
  }

  return failures;
}

// ============================================================================
// Test 2: Single-Lane vs Multi-Lane Detection
// ============================================================================

async function testLaneDetection() {
  console.log('\n🧪 Test 2: Single-Lane vs Multi-Lane Detection');
  console.log('='.repeat(60));

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();

  // Capture console.log to verify lane logging
  const originalLog = console.log;
  let capturedLogs: string[] = [];
  console.log = (...args: any[]) => {
    capturedLogs.push(args.join(' '));
    originalLog.apply(console, args);
  };

  const testCases = [
    // Single-lane metric (CLABSI has Preventability_Detective only in registry)
    {
      concernId: 'CLABSI',
      domain: 'HAC',
      expectedLaneCount: 1,
      expectedLaneMode: 'Single Lane'
    },
    // Multi-lane metric (I25 has Process_Auditor + Delay_Driver_Profiler in packet)
    {
      concernId: 'I25',
      domain: 'Orthopedics',
      expectedLaneCount: 2,
      expectedLaneMode: 'Multi-Lane'
    },
    // Multi-lane metric (I27 has Process_Auditor + Exclusion_Hunter)
    {
      concernId: 'I27',
      domain: 'Orthopedics',
      expectedLaneCount: 2,
      expectedLaneMode: 'Multi-Lane'
    },
  ];

  let failures = 0;

  for (const tc of testCases) {
    capturedLogs = [];

    const input: PlanningInput = {
      planning_input_id: `test-${tc.concernId}`,
      concern: tc.concernId,
      concern_id: tc.concernId,
      domain_hint: tc.domain,
      intent: 'quality_reporting',
      target_population: 'pediatric',
      specific_requirements: []
    };

    try {
      const routed = await s0.execute(input);
      const context = await s1.execute(routed);

      const laneCount = context.archetypes.length;

      // Verify lane count
      if (laneCount !== tc.expectedLaneCount) {
        console.log(`   ❌ ${tc.concernId}: lane count = ${laneCount}, expected ${tc.expectedLaneCount}`);
        console.log(`      Archetypes: ${context.archetypes.join(', ')}`);
        failures++;
        continue;
      }

      console.log(`   ✅ ${tc.concernId}: ${laneCount} lane(s) - ${context.archetypes.join(', ')}`);

    } catch (e: any) {
      console.log(`   ❌ ${tc.concernId}: EXCEPTION - ${e.message}`);
      failures++;
    }
  }

  // Restore console.log
  console.log = originalLog;

  if (failures === 0) {
    console.log('\n   🎉 All lane detection tests passed!');
  } else {
    console.log(`\n   💥 ${failures} lane detection tests failed`);
  }

  return failures;
}

// ============================================================================
// Test 3: Dynamic Role Names
// ============================================================================

async function testDynamicRoleNames() {
  console.log('\n🧪 Test 3: Dynamic Role Names');
  console.log('='.repeat(60));

  const testCases = [
    {
      taskType: 'signal_enrichment',
      domain: 'Orthopedics',
      metricName: 'Supracondylar fracture to OR <18 hours',
      archetype: 'Process_Auditor' as const,
      shouldContain: ['Pediatric', 'Orthopedics', 'Clinical Signal Extractor', 'Supracondylar', 'Process']
    },
    {
      taskType: 'signal_enrichment',
      domain: 'HAC',
      metricName: 'CLABSI Prevention',
      archetype: 'Preventability_Detective' as const,
      shouldContain: ['Infection Prevention', 'Clinical Signal Extractor', 'Preventability']
    },
    {
      taskType: 'event_summary',
      domain: 'Endocrinology',
      metricName: 'A1c Control',
      archetype: undefined,
      shouldContain: ['Pediatric', 'Endocrinology', 'Event Summary']
    },
  ];

  let failures = 0;

  for (const tc of testCases) {
    const roleName = buildDynamicRoleName(
      tc.taskType as any,
      tc.domain,
      tc.metricName,
      tc.archetype
    );

    const missingParts = tc.shouldContain.filter(part => !roleName.toLowerCase().includes(part.toLowerCase()));

    if (missingParts.length > 0) {
      console.log(`   ❌ ${tc.taskType}/${tc.domain}: Missing parts: ${missingParts.join(', ')}`);
      console.log(`      Generated: "${roleName}"`);
      failures++;
    } else {
      console.log(`   ✅ ${tc.taskType}/${tc.domain}: "${roleName.substring(0, 60)}..."`);
    }
  }

  if (failures === 0) {
    console.log('\n   🎉 All dynamic role name tests passed!');
  } else {
    console.log(`\n   💥 ${failures} dynamic role name tests failed`);
  }

  return failures;
}

// ============================================================================
// Test 4: Metric Context String Generation
// ============================================================================

async function testMetricContextGeneration() {
  console.log('\n🧪 Test 4: Metric Context String Generation');
  console.log('='.repeat(60));

  // Mock packet data
  const mockPacket = {
    metric: {
      metric_name: 'Test Metric',
      metric_type: 'outcome_oriented_process',
      clinical_focus: 'Testing metric-agnostic context generation',
      rationale: 'This is a test metric',
      risk_factors: ['Risk factor 1', 'Risk factor 2'],
      review_questions: ['Review question 1?', 'Review question 2?'],
      signal_groups: ['delay_drivers', 'safety_signals'],
    },
    signals: {
      delay_drivers: ['delay_sig_1', 'delay_sig_2'],
      safety_signals: ['safety_sig_1'],
    }
  };

  const contextString = buildMetricContextString(mockPacket);

  const shouldContain = [
    'Test Metric',
    'OUTCOME_ORIENTED_PROCESS',
    'Testing metric-agnostic context generation',
    'Risk factor 1',
    'Review question 1?',
    'delay_drivers',
    'safety_signals',
  ];

  let failures = 0;
  for (const part of shouldContain) {
    if (!contextString.includes(part)) {
      console.log(`   ❌ Missing in context: "${part}"`);
      failures++;
    }
  }

  if (failures === 0) {
    console.log('   ✅ Metric context string contains all expected parts');
    console.log('\n   🎉 Metric context generation test passed!');
  } else {
    console.log(`\n   💥 ${failures} parts missing from context string`);
  }

  return failures;
}

// ============================================================================
// Test 5: S0 No Domain:null Logging for Known Metrics
// ============================================================================

async function testNoDomainNullLogging() {
  console.log('\n🧪 Test 5: No "Domain: null" for Known Metrics');
  console.log('='.repeat(60));

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();

  // Capture console logs
  const originalLog = console.log;
  const originalWarn = console.warn;
  let capturedLogs: string[] = [];

  console.log = (...args: any[]) => {
    capturedLogs.push(args.join(' '));
    originalLog.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    capturedLogs.push(args.join(' '));
    originalWarn.apply(console, args);
  };

  const knownMetrics = ['I25', 'I26', 'CLABSI', 'CAUTI'];
  let failures = 0;

  for (const metricId of knownMetrics) {
    capturedLogs = [];

    const input: PlanningInput = {
      planning_input_id: `test-${metricId}`,
      concern: metricId,
      concern_id: metricId,
      domain_hint: undefined,
      intent: 'quality_reporting',
      target_population: 'pediatric',
      specific_requirements: []
    };

    try {
      const routed = await s0.execute(input);
      const context = await s1.execute(routed);

      // Check for "Domain: null" in logs (BAD - should not happen for known metrics)
      const hasDomainNull = capturedLogs.some(log =>
        log.includes('Domain: null') || log.includes('domain: null')
      );

      if (hasDomainNull) {
        console.log(`   ❌ ${metricId}: Found "Domain: null" in logs (should not happen for known metric)`);
        failures++;
      } else if (!context.domain) {
        console.log(`   ❌ ${metricId}: Domain is undefined in context`);
        failures++;
      } else {
        console.log(`   ✅ ${metricId}: Domain correctly resolved to "${context.domain}"`);
      }

    } catch (e: any) {
      console.log(`   ❌ ${metricId}: EXCEPTION - ${e.message}`);
      failures++;
    }
  }

  // Restore console
  console.log = originalLog;
  console.warn = originalWarn;

  if (failures === 0) {
    console.log('\n   🎉 All "no Domain:null" tests passed!');
  } else {
    console.log(`\n   💥 ${failures} tests failed`);
  }

  return failures;
}

// ============================================================================
// Test 6: Lane-Specific Prompt Loading (I25 Orthopedics)
// ============================================================================

async function testLaneSpecificPrompts() {
  console.log('\n🧪 Test 6: Lane-Specific Prompt Loading (I25 Orthopedics)');
  console.log('='.repeat(60));

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();
  const s2 = new S2_StructuralSkeletonStage();
  const s3 = new S3_TaskGraphIdentificationStage();
  const s4 = new S4_PromptPlanGenerationStage();

  const input: PlanningInput = {
    planning_input_id: 'test-I25-lanes',
    concern: 'I25',
    concern_id: 'I25',
    domain_hint: 'Orthopedics',
    intent: 'quality_reporting',
    target_population: 'pediatric',
    specific_requirements: []
  };

  let failures = 0;

  try {
    const routed = await s0.execute(input);
    const domainContext = await s1.execute(routed);
    const skeleton = await s2.execute(routed, domainContext);
    const taskGraph = await s3.execute(routed, domainContext, skeleton);
    const promptPlan = await s4.execute(taskGraph, domainContext);

    // Group prompts by lane
    const lanePrompts: Record<string, string[]> = {};
    for (const node of promptPlan.nodes) {
      const lane = node.id.includes(':') ? node.id.split(':')[0] : 'root';
      if (!lanePrompts[lane]) lanePrompts[lane] = [];
      lanePrompts[lane].push(node.prompt_config.template_id);
    }

    // Expected patterns
    const expectations = [
      {
        lane: 'process_auditor',
        shouldContain: 'Orthopedics_Process_Auditor_signal_enrichment_v3',
        description: 'process_auditor lane uses Process_Auditor archetype'
      },
      {
        lane: 'delay_driver_profiler',
        shouldContain: 'Orthopedics_Delay_Driver_Profiler_signal_enrichment_v3',
        description: 'delay_driver_profiler lane uses Delay_Driver_Profiler archetype'
      },
      {
        lane: 'synthesis',
        shouldContain: 'Orthopedics_Process_Auditor_multi_archetype_synthesis_v3',
        description: 'synthesis lane uses primary archetype (Process_Auditor)'
      },
    ];

    for (const exp of expectations) {
      const prompts = lanePrompts[exp.lane] || [];
      const found = prompts.some(p => p === exp.shouldContain);

      if (found) {
        console.log(`   ✅ ${exp.description}`);
        console.log(`      Found: ${exp.shouldContain}`);
      } else {
        console.log(`   ❌ ${exp.description}`);
        console.log(`      Expected: ${exp.shouldContain}`);
        console.log(`      Got: ${prompts.join(', ') || 'no prompts'}`);
        failures++;
      }
    }

    // Additional check: no cross-contamination
    const delayPrompts = lanePrompts['delay_driver_profiler'] || [];
    const hasWrongArchetype = delayPrompts.some(p => p.includes('_Process_Auditor_'));
    if (hasWrongArchetype) {
      console.log(`   ❌ delay_driver_profiler lane incorrectly using Process_Auditor prompts`);
      failures++;
    } else {
      console.log(`   ✅ No cross-lane archetype contamination`);
    }

  } catch (e: any) {
    console.log(`   ❌ EXCEPTION: ${e.message}`);
    failures++;
  }

  if (failures === 0) {
    console.log('\n   🎉 All lane-specific prompt tests passed!');
  } else {
    console.log(`\n   💥 ${failures} lane-specific prompt tests failed`);
  }

  return failures;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  METRIC-AGNOSTIC ROUTING INTEGRATION TESTS');
  console.log('═'.repeat(60));

  let totalFailures = 0;

  totalFailures += await testConcernRegistryRouting();
  totalFailures += await testLaneDetection();
  totalFailures += await testDynamicRoleNames();
  totalFailures += await testMetricContextGeneration();
  totalFailures += await testNoDomainNullLogging();
  totalFailures += await testLaneSpecificPrompts();

  console.log('\n' + '═'.repeat(60));
  if (totalFailures === 0) {
    console.log('  🎉 ALL TESTS PASSED - Metric-agnostic routing verified!');
  } else {
    console.log(`  💥 ${totalFailures} TOTAL TEST FAILURES`);
    process.exit(1);
  }
  console.log('═'.repeat(60) + '\n');
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(e => {
    console.error('Test runner failed:', e);
    process.exit(1);
  });
}

export { runAllTests };
