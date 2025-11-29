#!/usr/bin/env node
/**
 * Revision CLI
 *
 * Test plan revision locally without the Next.js API.
 *
 * Usage:
 *   npm run revise -- <plan_file> --type signals --remark "Too many signals"
 *   npm run revise -- <plan_file> --type questions --remark "Add readmission question"
 */

import * as fs from 'fs';
import { reviseSection } from '../planner/revisionAgent';
import { PlanRevisionRequest, RevisionType } from '../models/PlanRevision';
import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlan } from '../models/PlannerPlan';

// Parse CLI arguments
const args = process.argv.slice(2);

function parseArgs() {
  const planFile = args[0];
  const typeIndex = args.indexOf('--type') || args.indexOf('-t');
  const remarkIndex = args.indexOf('--remark') || args.indexOf('-r');
  const outputIndex = args.indexOf('--output') || args.indexOf('-o');
  const mockFlag = args.includes('--mock') || args.includes('-m');

  if (!planFile) {
    console.error('Error: Plan file path is required');
    console.log('\nUsage:');
    console.log('  npm run revise -- <plan_file> --type <type> --remark <remark> [options]');
    console.log('\nOptions:');
    console.log('  --type, -t      Revision type (signals/questions/rules/phases/prompt/full)');
    console.log('  --remark, -r    Human explanation of what to change');
    console.log('  --output, -o    Output file path (default: <plan_file>-revised.json)');
    console.log('  --mock, -m      Use mock mode instead of LLM');
    console.log('\nExample:');
    console.log('  npm run revise -- output/plan.json --type signals --remark "Too many signals, keep only core 8"');
    process.exit(1);
  }

  const revisionType = typeIndex >= 0 ? args[typeIndex + 1] : null;
  const remark = remarkIndex >= 0 ? args[remarkIndex + 1] : null;
  const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : null;

  if (!revisionType) {
    console.error('Error: --type is required');
    process.exit(1);
  }

  if (!remark) {
    console.error('Error: --remark is required');
    process.exit(1);
  }

  const validTypes: RevisionType[] = ['signals', 'questions', 'rules', 'phases', 'prompt', 'full'];
  if (!validTypes.includes(revisionType as RevisionType)) {
    console.error(`Error: Invalid revision type: ${revisionType}`);
    console.error(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  return {
    planFile,
    revisionType: revisionType as RevisionType,
    remark,
    outputFile: outputFile || planFile.replace('.json', '-revised.json'),
    useMock: mockFlag,
  };
}

/**
 * Main revision flow
 */
async function main() {
  const { planFile, revisionType, remark, outputFile, useMock } = parseArgs();

  console.log(`\n🔄 Plan Revision Tool\n`);

  // Load plan file
  if (!fs.existsSync(planFile)) {
    console.error(`Error: Plan file not found: ${planFile}`);
    process.exit(1);
  }

  let planData: any;
  try {
    const content = fs.readFileSync(planFile, 'utf-8');
    planData = JSON.parse(content);
  } catch (error) {
    console.error(`Error: Failed to parse plan file:`, error);
    process.exit(1);
  }

  // Extract input and output from plan data
  // Assuming plan file contains both or is PlannerPlan itself
  let input: PlanningInput;
  let output: PlannerPlan;

  if (planData.input && planData.output) {
    // File contains both input and output
    input = planData.input;
    output = planData.output;
  } else if (planData.plan_metadata) {
    // File is a PlannerPlan - create minimal input
    output = planData as PlannerPlan;
    input = {
      planning_id: output.plan_metadata.planning_input_id || 'unknown',
      concern_id: 'UNKNOWN',
      archetype: 'UNKNOWN',
    } as PlanningInput;

    console.warn(`⚠️  Plan file doesn't include original input, using minimal input`);
  } else {
    console.error('Error: Plan file must contain PlannerPlan or {input, output}');
    process.exit(1);
  }

  console.log(`Plan File: ${planFile}`);
  console.log(`Revision Type: ${revisionType}`);
  console.log(`Remark: ${remark}`);
  console.log(`Mode: ${useMock ? 'MOCK' : 'LLM (not yet implemented, using mock)'}`);
  console.log(``);

  // Create revision request
  const revisionRequest: PlanRevisionRequest = {
    revision_type: revisionType,
    remark,
    original_input: input,
    original_output: output,
  };

  // Process revision
  try {
    const revisedPlan = await reviseSection(revisionRequest, useMock);

    // Save revised plan
    const outputData = {
      input,
      output: revisedPlan,
      revision: {
        type: revisionType,
        remark,
        revised_at: new Date().toISOString(),
      },
    };

    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf-8');

    console.log(`\n✅ Revision complete`);
    console.log(`   Saved to: ${outputFile}`);
    console.log(`   Original Plan ID: ${output.plan_metadata.plan_id}`);
    console.log(`   Revised Plan ID: ${revisedPlan.plan_metadata.plan_id}`);
    console.log(`   Validation: ${revisedPlan.validation.is_valid ? 'PASS' : 'FAIL'}`);

    if (!revisedPlan.validation.is_valid) {
      console.log(`   Errors: ${revisedPlan.validation.errors.length}`);
      revisedPlan.validation.errors.forEach(err => {
        console.log(`     - ${err}`);
      });
    }

    if (revisedPlan.validation.warnings.length > 0) {
      console.log(`   Warnings: ${revisedPlan.validation.warnings.length}`);
    }

    // Quality is a V2 field, not present in V9.1 plans
    const quality = (revisedPlan as any).quality;
    if (quality) {
      console.log(`   Quality Grade: ${quality.overall_grade}`);
      console.log(`   Fit-for-Use: ${quality.fit_for_use_score}/5`);
    }

    console.log(``);
  } catch (error) {
    console.error(`\n❌ Revision failed:`, error);
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error(`Fatal error:`, error);
  process.exit(1);
});
