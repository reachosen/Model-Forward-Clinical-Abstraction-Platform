/**
 * Research, Plan & Implement Command
 *
 * Full workflow: Research → Plan → Implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ResearchOrchestrator } from '../research/researchOrchestrator';
import { generatePlan, PlannerConfig } from '../planner/plannerAgent';
import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlanV2 } from '../models/PlannerPlan';
import { QualityAttributes } from '../models/QualityAttributes';
import { getOutputDir } from '../utils/outputConfig';

export async function researchPlanImplementCommand(options: any) {
  const { concern, domain, outputDir, forceRefresh } = options;

  if (!concern) {
    console.error('❌ Error: --concern is required');
    process.exit(1);
  }

  // Get output directory using centralized config
  const outputDirectory = outputDir || getOutputDir(`${concern.toLowerCase()}-${domain || 'general'}`);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 RESEARCH, PLAN & IMPLEMENT WORKFLOW`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   Concern: ${concern}`);
  console.log(`   Domain: ${domain || 'general'}`);
  console.log(`   Output: ${outputDirectory}`);
  console.log();

  // ============================================
  // PHASE 1: RESEARCH
  // ============================================
  console.log(`${'='.repeat(70)}`);
  console.log(`PHASE 1: RESEARCH`);
  console.log(`${'='.repeat(70)}\n`);

  const orchestrator = new ResearchOrchestrator();
  const research = await orchestrator.research(concern, domain, {
    forceRefresh
  });

  console.log(`\n   📊 Research Summary:`);
  console.log(`   Coverage: ${Math.round(research.coverage.coverage_score * 100)}% (${research.coverage.sources_successful}/${research.coverage.sources_attempted} sources) ${research.coverage.coverage_score >= 0.75 ? '✅' : '⚠️'}`);
  console.log(`   Clinical Tools: ${research.clinical_tools.length}`);

  // Save research bundle
  await fs.mkdir(path.join(outputDirectory, '01-research'), { recursive: true });
  await fs.writeFile(
    path.join(outputDirectory, '01-research/research-bundle.json'),
    JSON.stringify(research, null, 2)
  );
  console.log(`   ✅ Research saved to: ${path.join(outputDirectory, '01-research/research-bundle.json')}`);

  // ============================================
  // PHASE 2: PLAN GENERATION
  // ============================================
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PHASE 2: PLAN GENERATION`);
  console.log(`${'='.repeat(70)}\n`);

  const input: PlanningInput = {
    planning_id: `input_${Date.now()}`,
    concern_id: concern,
    concern: concern, // V9.1 field
    domain,
    // V9.1: domain_hint should NOT be set - let archetype matrix determine it
    intent: 'surveillance', // V9.1 field
    target_population: domain || 'general', // V9.1 field
    specific_requirements: [], // V9.1 field
    archetype: inferArchetype(concern),
    data_profile: {
      sources: [
        {
          source_id: 'ehr-primary',
          type: 'EHR',
          available_data: ['vitals', 'labs', 'medications', 'procedures', 'diagnoses', 'notes']
        }
      ]
    },
    clinical_context: {
      objective: `Monitor and detect ${concern} cases for quality improvement and surveillance`
    }
  };

  const config: PlannerConfig = {
    apiKey: process.env.OPENAI_API_KEY
  };

  // V9.1: Use unified generatePlan entry point
  const plan = await generatePlan(input, config, research) as PlannerPlanV2;

  // Save plan
  await fs.mkdir(path.join(outputDirectory, '02-plan'), { recursive: true });
  await fs.writeFile(
    path.join(outputDirectory, '02-plan/planner-plan.json'),
    JSON.stringify(plan, null, 2)
  );
  console.log(`   ✅ Plan saved to: ${path.join(outputDirectory, '02-plan/planner-plan.json')}`);

  // ============================================
  // QUALITY ASSESSMENT
  // ============================================
  console.log(`\n${'='.repeat(70)}`);
  console.log(`QUALITY ASSESSMENT`);
  console.log(`${'='.repeat(70)}\n`);

  displayQualityReport(plan.quality);

  // ============================================
  // PHASE 3: IMPLEMENTATION
  // ============================================
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PHASE 3: IMPLEMENTATION`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`   ⏩ Implementation code generation (coming in future sprint)`);
  console.log(`   ⏩ Test suite generation (coming in future sprint)`);

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ WORKFLOW COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`📦 Output Bundle: ${outputDirectory}/`);
  console.log(`   ├── 01-research/research-bundle.json`);
  console.log(`   └── 02-plan/planner-plan.json\n`);

  console.log(`📋 Plan Details:`);
  console.log(`   Plan ID: ${plan.plan_metadata.plan_id}`);
  console.log(`   Version: ${plan.plan_metadata.plan_version}`);
  console.log(`   Schema: v${plan.plan_metadata.schema_version}`);
  console.log(`   Quality: ${Math.round(plan.quality.overall_score * 100)}% (Grade ${plan.quality.quality_grade})`);
  console.log(`   Deployment Ready: ${plan.quality.deployment_ready ? 'YES ✅' : 'NO ❌'}\n`);

  if (!plan.quality.deployment_ready) {
    console.log(`⚠️  Quality gates not passed. Review flagged areas:`);
    plan.quality.flagged_areas.forEach((area: string) => {
      console.log(`   - ${area}`);
    });
    console.log();

    if (plan.quality.recommendations.length > 0) {
      console.log(`💡 Recommendations:`);
      plan.quality.recommendations.forEach((rec: string) => {
        console.log(`   - ${rec}`);
      });
      console.log();
    }
  }
}

function displayQualityReport(quality: QualityAttributes) {
  console.log(`   Overall Score: ${Math.round(quality.overall_score * 100)}% (Grade ${quality.quality_grade}) ${quality.overall_score >= 0.85 ? '✅' : quality.overall_score >= 0.75 ? '⚠️' : '❌'}\n`);

  console.log(`   Quality Dimensions:`);

  if (quality.dimensions.research_coverage) {
    const rc = quality.dimensions.research_coverage;
    console.log(`   • Research Coverage:    ${Math.round(rc.score * 100)}% ${rc.score >= 0.75 ? '✅' : '❌'}`);
  }

  if (quality.dimensions.spec_compliance) {
    const sc = quality.dimensions.spec_compliance;
    console.log(`   • Spec Compliance:      ${Math.round(sc.score * 100)}% ${sc.score >= 0.90 ? '✅' : '❌'}`);
  }

  const ca = quality.dimensions.clinical_accuracy;
  console.log(`   • Clinical Accuracy:    ${Math.round(ca.score * 100)}% ${ca.score >= 0.85 ? '✅' : '❌'}`);

  const df = quality.dimensions.data_feasibility;
  console.log(`   • Data Feasibility:     ${Math.round(df.score * 100)}% ${df.score >= 0.70 ? '✅' : '❌'}`);

  const p = quality.dimensions.parsimony;
  console.log(`   • Parsimony:            ${Math.round(p.score * 100)}% ${p.score >= 0.70 ? '✅' : '❌'}`);

  const c = quality.dimensions.completeness;
  console.log(`   • Completeness:         ${Math.round(c.score * 100)}% ${c.score >= 0.85 ? '✅' : '❌'}`);

  console.log(`\n   Quality Gates: ${quality.quality_gates.deployment_ready ? 'ALL PASSED ✅' : 'FAILED ❌'}`);
  console.log(`   Deployment Ready: ${quality.deployment_ready ? 'YES ✅' : 'NO ❌'}`);

  if (quality.flagged_areas.length > 0) {
    console.log(`\n   ⚠️  Flagged Areas:`);
    quality.flagged_areas.forEach(area => {
      console.log(`      - ${area}`);
    });
  }
}

function inferArchetype(concernId: string): string {
  const concernUpper = concernId.toUpperCase();

  if (concernUpper === 'CLABSI') return 'HAC_CLABSI';
  if (concernUpper === 'CAUTI') return 'HAC_CAUTI';
  if (concernUpper === 'VAP' || concernUpper === 'VAE') return 'HAC_VAP';
  if (concernUpper === 'SSI') return 'HAC_SSI';
  if (concernUpper.match(/^I\d+[AB]?$/)) return 'USNWR';

  return 'HAC';
}
