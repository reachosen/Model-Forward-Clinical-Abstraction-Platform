
/**
 * ⚠️ DEPRECATED / LEGACY MODULE ⚠️
 * ---------------------------------------------------------------------
 * @deprecated THIS COMPONENT IS SCHEDULED FOR DELETION.
 * DO NOT EDIT OR IMPORT FOR NEW FEATURES.
 * * Future AI Instructions: 
 * - Treat this file as read-only reference.
 * - If you need this logic, refactor it into the new Architecture.
 * ---------------------------------------------------------------------
 */

#!/usr/bin/env node

// --- ADD THIS BLOCK AT THE TOP ---
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load from project root (single global config)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// ---------------------------------


/**
 * HAC Planner CLI
 * Command-line interface for generating HAC configurations.
 */

import * as fs from 'fs';
import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlan, PlannerPlanV2 } from '../models/PlannerPlan';
import { generatePlan } from '../planner/plannerAgent';
import {
  validatePlanningInput,
  validatePlan,
  printValidationResult
} from '../planner/validatePlan';
import { getOutputDir } from '../utils/outputConfig';

interface CLIConfig {
  inputFile: string;
  outputDir: string;
  apiKey?: string;
  model?: string;
  useMock: boolean;
  validateOnly: boolean;
}

function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npx ts-node cli/plan.ts <input-file> [options]');
    console.log('  --output, -o <dir>    Output directory (default: from .env OUTPUT_DIR or ./output)');
    console.log('  --api-key <key>       OpenAI API key (default: from .env OPENAI_API_KEY)');
    console.log('  --model <name>        Model to use (default: from .env MODEL or gpt-4o)');
    console.log('  --mock                Use mock generation instead of LLM');
    console.log('  --validate-only       Only validate input, do not generate');
    process.exit(0);
  }

  // Get default output directory using centralized config
  const defaultOutputDir = getOutputDir();

  const config: CLIConfig = {
    inputFile: args[0],
    outputDir: defaultOutputDir,
    useMock: false,
    validateOnly: false
  };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') config.outputDir = args[++i];
    if (arg === '--api-key') config.apiKey = args[++i];
    if (arg === '--model') config.model = args[++i];
    if (arg === '--mock') config.useMock = true;
    if (arg === '--validate-only') config.validateOnly = true;
  }
  return config;
}

// Type Guard
function isV2Plan(plan: any): plan is PlannerPlanV2 {
  return 'quality' in plan && 'provenance' in plan;
}

async function main(): Promise<void> {
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║                     HAC Planner CLI                           ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

  try {
    const config = parseArgs();
    console.log(`📂 Loading planning input...`);
    if (!fs.existsSync(config.inputFile)) throw new Error(`Input file not found: ${config.inputFile}`);
    
    const input: PlanningInput = JSON.parse(fs.readFileSync(config.inputFile, 'utf-8'));
    console.log(`   ✅ Input loaded`);

    console.log(`\n🔍 Validating planning input...`);
    const inputValidation = validatePlanningInput(input);
    printValidationResult(inputValidation, 'Input Validation');
    if (!inputValidation.is_valid) process.exit(1);
    if (config.validateOnly) return;

    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    const useMock = config.useMock || !apiKey;

    console.log(`\n🚀 Generating HAC configuration plan...`);
    // V9.1: Use unified generatePlan entry point
    const plan = await generatePlan(input, { apiKey, model: config.model, useMock });

    // Safe property extraction handling V1 vs V2 vs V9.1
    let planId = '';
    let validationStatus = '';
    let requiresReview = false;

    if (isV2Plan(plan)) {
      // V2
      planId = plan.plan_metadata.plan_id;
      validationStatus = plan.quality.overall_score >= 0.7 ? 'Good' : 'Needs Review';
      requiresReview = plan.plan_metadata.status.requires_review;
    } else if (plan.plan_metadata.planner_version?.startsWith('9.')) {
      // V9.1
      planId = plan.plan_metadata.plan_id;
      validationStatus = plan.validation.is_valid ? 'Valid' : 'Has Errors';
      requiresReview = !plan.validation.is_valid || plan.validation.warnings.length > 0;
    } else {
      // V1
      planId = plan.plan_metadata.plan_id;
      validationStatus = 'Unknown (V1 plan)';
      requiresReview = false;
    }

    console.log(`   ✅ Plan generated`);
    console.log(`   Plan ID: ${planId}`);
    console.log(`   Validation Status: ${validationStatus}`);
    console.log(`   Requires Review: ${requiresReview ? 'Yes' : 'No'}`);

    console.log(`\n🔍 Validating generated plan...`);
    const planValidation = validatePlan(plan);
    printValidationResult(planValidation, 'Plan Validation');

    if (!fs.existsSync(config.outputDir)) fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`\n💾 Writing output files...`);
    
    fs.writeFileSync(path.join(config.outputDir, 'planner_plan.json'), JSON.stringify(plan, null, 2));
    console.log(`   ✅ planner_plan.json`);

    fs.writeFileSync(path.join(config.outputDir, 'hac_config.json'), JSON.stringify(plan.clinical_config, null, 2));
    console.log(`   ✅ hac_config.json`);

    // Generate Report
    const reportPath = path.join(config.outputDir, 'validation_report.txt');
    const report = generateValidationReport(input, plan, planValidation);
    fs.writeFileSync(reportPath, report);
    console.log(`   ✅ validation_report.txt`);

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function generateValidationReport(
  input: PlanningInput,
  plan: PlannerPlan | PlannerPlanV2,
  validation: any
): string {
  const config = plan.clinical_config;
  const configId = config?.config_metadata?.config_id || 'UNKNOWN';
  
  return `HAC PLANNER VALIDATION REPORT
${'='.repeat(80)}
Config ID:         ${configId}
Validation Result: ${validation.is_valid ? 'PASS' : 'FAIL'}
Errors:            ${validation.errors.length}
Warnings:          ${validation.warnings.length}
${'='.repeat(80)}
`;
}

if (require.main === module) {
  main().catch(console.error);
}