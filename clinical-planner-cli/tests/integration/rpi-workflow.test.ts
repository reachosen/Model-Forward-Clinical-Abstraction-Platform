/**
 * Integration Test: Research-Plan-Implement Workflow
 *
 * This test validates the complete RPI workflow:
 * 1. Research phase (fetch/cache sources)
 * 2. Plan generation with research augmentation
 * 3. Quality assessment
 *
 * Run with: ts-node tests/integration/rpi-workflow.test.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ResearchOrchestrator } from '../../research/researchOrchestrator';
import { planHAC, PlannerConfig } from '../../planner/plannerAgent';
import { PlanningInput } from '../../models/PlanningInput';
import { PlannerPlanV2 } from '../../models/PlannerPlanV2';

async function runIntegrationTest() {
  console.log('\n' + '='.repeat(70));
  console.log('RPI WORKFLOW INTEGRATION TEST');
  console.log('='.repeat(70) + '\n');

  const testOutputDir = './test-output';
  await fs.mkdir(testOutputDir, { recursive: true });

  try {
    // ============================================
    // TEST 1: Research Phase
    // ============================================
    console.log('TEST 1: Research Phase');
    console.log('-'.repeat(70));

    const orchestrator = new ResearchOrchestrator();
    const research = await orchestrator.research('CLABSI', 'picu', {
      forceRefresh: false
    });

    console.log(`✓ Research completed`);
    console.log(`  Research ID: ${research.research_id}`);
    console.log(`  Coverage: ${Math.round(research.coverage.coverage_score * 100)}%`);
    console.log(`  Sources: ${research.coverage.sources_successful}/${research.coverage.sources_attempted}`);
    console.log(`  Clinical Tools: ${research.clinical_tools.length}`);

    // Assertions
    if (research.coverage.sources_successful === 0) {
      throw new Error('No sources successfully fetched');
    }

    if (research.coverage.coverage_score < 0.5) {
      console.warn(`⚠️  Coverage score low: ${research.coverage.coverage_score}`);
    }

    // Save research bundle
    const researchPath = path.join(testOutputDir, 'research-bundle.json');
    await fs.writeFile(researchPath, JSON.stringify(research, null, 2));
    console.log(`  Saved: ${researchPath}\n`);

    // ============================================
    // TEST 2: Plan Generation with Research
    // ============================================
    console.log('TEST 2: Plan Generation with Research');
    console.log('-'.repeat(70));

    const input: PlanningInput = {
      planning_id: `test_${Date.now()}`,
      concern_id: 'CLABSI',
      domain: 'picu',
      archetype: 'HAC_CLABSI'
    };

    const config: PlannerConfig = {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.7
    };

    if (!config.apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set - skipping LLM-based plan generation');
      console.log('   Set OPENAI_API_KEY environment variable to test full workflow\n');
      console.log('✓ Research phase validated successfully\n');
      return;
    }

    const plan = await planHAC(input, config, research) as PlannerPlanV2;

    console.log(`✓ Plan generated`);
    console.log(`  Plan ID: ${plan.plan_metadata.plan_id}`);
    console.log(`  Schema Version: ${plan.plan_metadata.schema_version}`);
    console.log(`  Quality Score: ${Math.round(plan.quality.overall_score * 100)}%`);
    console.log(`  Quality Grade: ${plan.quality.quality_grade}`);
    console.log(`  Deployment Ready: ${plan.quality.deployment_ready ? 'YES' : 'NO'}`);

    // Assertions
    if (!plan.plan_metadata) {
      throw new Error('Plan missing metadata');
    }

    if (!plan.quality) {
      throw new Error('Plan missing quality assessment');
    }

    if (!plan.provenance) {
      throw new Error('Plan missing provenance');
    }

    if (plan.provenance.sources.length === 0) {
      throw new Error('Plan has no provenance sources');
    }

    // Save plan
    const planPath = path.join(testOutputDir, 'planner-plan-v2.json');
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
    console.log(`  Saved: ${planPath}\n`);

    // ============================================
    // TEST 3: Quality Assessment Validation
    // ============================================
    console.log('TEST 3: Quality Assessment Validation');
    console.log('-'.repeat(70));

    const quality = plan.quality;

    console.log(`✓ Quality Dimensions:`);

    if (quality.dimensions.research_coverage) {
      console.log(`  Research Coverage: ${Math.round(quality.dimensions.research_coverage.score * 100)}%`);
    }

    if (quality.dimensions.spec_compliance) {
      console.log(`  Spec Compliance: ${Math.round(quality.dimensions.spec_compliance.score * 100)}%`);
    }

    console.log(`  Clinical Accuracy: ${Math.round(quality.dimensions.clinical_accuracy.score * 100)}%`);
    console.log(`  Data Feasibility: ${Math.round(quality.dimensions.data_feasibility.score * 100)}%`);
    console.log(`  Parsimony: ${Math.round(quality.dimensions.parsimony.score * 100)}%`);
    console.log(`  Completeness: ${Math.round(quality.dimensions.completeness.score * 100)}%`);

    console.log(`\n✓ Quality Gates:`);
    console.log(`  Deployment Ready: ${quality.quality_gates.deployment_ready ? 'PASS' : 'FAIL'}`);

    if (quality.flagged_areas.length > 0) {
      console.log(`\n⚠️  Flagged Areas:`);
      quality.flagged_areas.forEach(area => {
        console.log(`  - ${area}`);
      });
    }

    if (quality.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      quality.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    // ============================================
    // TEST 4: Provenance Validation
    // ============================================
    console.log('\n' + 'TEST 4: Provenance Validation');
    console.log('-'.repeat(70));

    const provenance = plan.provenance;

    console.log(`✓ Provenance Sources: ${provenance.sources.length}`);
    provenance.sources.forEach((source, idx) => {
      console.log(`  ${idx + 1}. ${source.authority} (${source.version})`);
      console.log(`     URL: ${source.url}`);
      console.log(`     Cache Status: ${source.cache_status}`);
    });

    if (provenance.clinical_tools.length > 0) {
      console.log(`\n✓ Clinical Tools: ${provenance.clinical_tools.length}`);
      provenance.clinical_tools.forEach((tool, idx) => {
        console.log(`  ${idx + 1}. ${tool.tool_name} (${tool.version})`);
      });
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log(`\nTest artifacts saved to: ${testOutputDir}/`);
    console.log(`  - research-bundle.json`);
    console.log(`  - planner-plan-v2.json\n`);

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(70));
    console.error(`\nError: ${error.message}`);
    if (error.stack) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    console.error();
    process.exit(1);
  }
}

// Run test
runIntegrationTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
