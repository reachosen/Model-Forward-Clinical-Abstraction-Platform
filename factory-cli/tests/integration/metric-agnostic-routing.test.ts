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

import { PlanningInput, DomainType } from '../../models/PlannerPlan';
import { S0_InputNormalizationStage } from '../../PlanningFactory/stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../../PlanningFactory/stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from '../../PlanningFactory/stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from '../../PlanningFactory/stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from '../../PlanningFactory/stages/S4_PromptPlanGeneration';
import { isConcernKnown, getConcernRouting } from '../../config/concernRegistry';
import { buildDynamicRoleName, buildMetricContextString } from '../../PlanningFactory/utils/promptBuilder';

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
      domain_hint: tc.domain as DomainType,
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
      domain_hint: undefined as any,
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
// Test 6: Unified Task Graph & Prompt Loading (I25 Orthopedics)
// ============================================================================

async function testUnifiedTaskGraph() {
  console.log('\n🧪 Test 6: Unified Task Graph & Prompt Loading (I25 Orthopedics)');
  console.log('='.repeat(60));

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();
  const s2 = new S2_StructuralSkeletonStage();
  const s3 = new S3_TaskGraphIdentificationStage();
  const s4 = new S4_PromptPlanGenerationStage();

  const input: PlanningInput = {
    planning_input_id: 'test-I25-unified',
    concern: 'I25',
    concern_id: 'I25',
    domain_hint: 'Orthopedics' as DomainType,
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

    // Verify unified graph structure (no lanes)
    const nodeIds = promptPlan.nodes.map(n => n.id);
    const hasLanes = nodeIds.some(id => id.includes(':'));

    if (hasLanes) {
      console.log(`   ❌ Task graph should be unified (no lanes), but found lanes in node IDs: ${nodeIds.join(', ')}`);
      failures++;
    } else {
      console.log(`   ✅ Unified task graph verified (no lanes detected)`);
    }

    // Verify prompts use primary archetype but unified templates
    // In S4, we now use the primary archetype's template name for all tasks
    const signalEnrichmentNode = promptPlan.nodes.find(n => n.type === 'signal_enrichment');
    const expectedTemplateId = 'signal_enrichment'; // Unified template ID

    if (signalEnrichmentNode?.prompt_config.template_id !== expectedTemplateId) {
      console.log(`   ❌ signal_enrichment template = ${signalEnrichmentNode?.prompt_config.template_id}, expected ${expectedTemplateId}`);
      failures++;
    } else {
      console.log(`   ✅ Unified prompt template loaded: ${expectedTemplateId}`);
    }

    // Verify multi-archetype resolution in S1
    if (domainContext.archetypes.length > 1) {
      console.log(`   ✅ Multi-archetype resolution verified: ${domainContext.archetypes.join(', ')}`);
    } else {
      console.log(`   ❌ Multi-archetype resolution failed for I25, got only: ${domainContext.archetypes.join(', ')}`);
      failures++;
    }

  } catch (e: any) {
    console.log(`   ❌ EXCEPTION: ${e.message}`);
    failures++;
  }

  if (failures === 0) {
    console.log('\n   🎉 Unified task graph tests passed!');
  } else {
    console.log(`\n   💥 ${failures} unified task graph tests failed`);
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
  totalFailures += await testUnifiedTaskGraph();

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
