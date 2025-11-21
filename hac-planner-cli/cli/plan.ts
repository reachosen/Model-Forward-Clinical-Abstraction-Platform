#!/usr/bin/env node

/**
 * HAC Planner CLI
 *
 * Command-line interface for generating HAC configurations from planning inputs.
 *
 * Usage:
 *   npx ts-node cli/plan.ts <input-file> [options]
 *   npm run plan -- <input-file> [options]
 *
 * Options:
 *   --output, -o <path>     Output directory (default: current directory)
 *   --api-key <key>         OpenAI API key (uses mock if not provided)
 *   --model <name>          OpenAI model name (default: gpt-4-turbo-preview)
 *   --mock                  Force use of mock planner
 *   --validate-only         Only validate input without generating plan
 *   --help, -h              Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlan } from '../models/PlannerPlan';
import { planHAC } from '../planner/plannerAgent';
import {
  validatePlanningInput,
  validatePlan,
  printValidationResult
} from '../planner/validatePlan';

/**
 * CLI configuration parsed from arguments
 */
interface CLIConfig {
  inputFile: string;
  outputDir: string;
  apiKey?: string;
  model?: string;
  useMock: boolean;
  validateOnly: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const config: CLIConfig = {
    inputFile: args[0],
    outputDir: process.cwd(),
    useMock: false,
    validateOnly: false
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
      case '-o':
        config.outputDir = args[++i];
        break;
      case '--api-key':
        config.apiKey = args[++i];
        break;
      case '--model':
        config.model = args[++i];
        break;
      case '--mock':
        config.useMock = true;
        break;
      case '--validate-only':
        config.validateOnly = true;
        break;
      default:
        console.error(`❌ Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     HAC Planner CLI                           ║
║   Generate HAC configurations from planning inputs            ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  npx ts-node cli/plan.ts <input-file> [options]

Arguments:
  <input-file>            Path to planning input JSON file

Options:
  --output, -o <path>     Output directory (default: current directory)
  --api-key <key>         OpenAI API key (uses mock if not provided)
  --model <name>          OpenAI model name (default: gpt-4-turbo-preview)
  --mock                  Force use of mock planner
  --validate-only         Only validate input without generating plan
  --help, -h              Show this help message

Environment Variables:
  OPENAI_API_KEY          OpenAI API key (alternative to --api-key)

Examples:
  # Generate plan using mock planner
  npx ts-node cli/plan.ts examples/clabsi_planning_input.json

  # Generate plan using OpenAI API
  npx ts-node cli/plan.ts examples/clabsi_planning_input.json \\
    --api-key sk-... --model gpt-4-turbo-preview

  # Validate input only
  npx ts-node cli/plan.ts examples/clabsi_planning_input.json --validate-only

  # Specify output directory
  npx ts-node cli/plan.ts examples/clabsi_planning_input.json -o ./output

Output Files:
  planner_plan.json       Complete planner output with metadata
  hac_config.json         Extracted HAC configuration
  validation_report.txt   Validation results and warnings
`);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║                     HAC Planner CLI                           ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

  try {
    // Parse arguments
    const config = parseArgs();

    // Load input file
    console.log(`📂 Loading planning input...`);
    console.log(`   File: ${config.inputFile}`);

    if (!fs.existsSync(config.inputFile)) {
      throw new Error(`Input file not found: ${config.inputFile}`);
    }

    const inputContent = fs.readFileSync(config.inputFile, 'utf-8');
    const input: PlanningInput = JSON.parse(inputContent);

    console.log(`   ✅ Input loaded`);
    console.log(`   Planning ID: ${input.planning_id}`);
    console.log(`   Concern: ${input.concern_id}`);
    console.log(`   Archetype: ${input.archetype}`);

    // Validate input
    console.log(`\n🔍 Validating planning input...`);
    const inputValidation = validatePlanningInput(input);
    printValidationResult(inputValidation, 'Input Validation');

    if (!inputValidation.is_valid) {
      throw new Error('Planning input validation failed. Please fix errors and try again.');
    }

    // If validate-only mode, exit here
    if (config.validateOnly) {
      console.log(`✅ Validation complete (--validate-only mode)\n`);
      process.exit(0);
    }

    // Determine if using mock or real API
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    const useMock = config.useMock || !apiKey;

    if (!useMock && !apiKey) {
      console.warn(`⚠️  No API key provided, using mock planner`);
    }

    // Generate plan
    console.log(`\n🚀 Generating HAC configuration plan...`);

    const plan: PlannerPlan = await planHAC(input, {
      apiKey,
      model: config.model,
      useMock
    });

    console.log(`   ✅ Plan generated`);
    console.log(`   Plan ID: ${plan.plan_metadata.plan_id}`);
    console.log(`   Confidence: ${(plan.plan_metadata.confidence * 100).toFixed(1)}%`);
    console.log(`   Requires Review: ${plan.plan_metadata.requires_review ? 'Yes' : 'No'}`);

    // Validate plan
    console.log(`\n🔍 Validating generated plan...`);
    const planValidation = validatePlan(plan);
    printValidationResult(planValidation, 'Plan Validation');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Write outputs
    console.log(`\n💾 Writing output files...`);
    console.log(`   Output directory: ${config.outputDir}`);

    // 1. Write complete planner plan
    const planPath = path.join(config.outputDir, 'planner_plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`   ✅ planner_plan.json`);

    // 2. Write extracted HAC config
    const configPath = path.join(config.outputDir, 'hac_config.json');
    fs.writeFileSync(configPath, JSON.stringify(plan.hac_config, null, 2));
    console.log(`   ✅ hac_config.json`);

    // 3. Write validation report
    const reportPath = path.join(config.outputDir, 'validation_report.txt');
    const report = generateValidationReport(input, plan, planValidation);
    fs.writeFileSync(reportPath, report);
    console.log(`   ✅ validation_report.txt`);

    // Print summary
    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║                        SUMMARY                                ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(``);
    console.log(`  Concern:           ${input.concern_id}`);
    console.log(`  Archetype:         ${input.archetype}`);
    console.log(`  Plan Confidence:   ${(plan.plan_metadata.confidence * 100).toFixed(1)}%`);
    console.log(`  Validation:        ${planValidation.is_valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Errors:            ${planValidation.errors.length}`);
    console.log(`  Warnings:          ${planValidation.warnings.length}`);
    console.log(`  Requires Review:   ${plan.plan_metadata.requires_review ? 'Yes' : 'No'}`);
    console.log(``);
    console.log(`  📁 Output Files:`);
    console.log(`     ${planPath}`);
    console.log(`     ${configPath}`);
    console.log(`     ${reportPath}`);
    console.log(``);

    if (planValidation.warnings.length > 0) {
      console.log(`  ⚠️  Review warnings in validation_report.txt`);
      console.log(``);
    }

    if (!planValidation.is_valid) {
      console.log(`  ❌ Plan has validation errors. Review and fix before deployment.`);
      console.log(``);
      process.exit(1);
    } else if (plan.plan_metadata.requires_review) {
      console.log(`  ⚠️  Plan requires clinical review before deployment.`);
      console.log(``);
    } else {
      console.log(`  ✅ Plan ready for deployment (subject to organizational review).`);
      console.log(``);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(``);
    process.exit(1);
  }
}

/**
 * Generate human-readable validation report
 */
function generateValidationReport(
  input: PlanningInput,
  plan: PlannerPlan,
  validation: ValidationResult
): string {
  const timestamp = new Date().toISOString();

  let report = `HAC PLANNER VALIDATION REPORT
${'='.repeat(80)}

Generated: ${timestamp}

INPUT SUMMARY
${'-'.repeat(80)}
Planning ID:       ${input.planning_id}
Concern:           ${input.concern_id}
Archetype:         ${input.archetype}
Facility Type:     ${input.domain.facility.type}
Clinical Objective: ${input.clinical_context.objective}

PLAN SUMMARY
${'-'.repeat(80)}
Plan ID:           ${plan.plan_metadata.plan_id}
Generated At:      ${plan.plan_metadata.generated_at}
Planner Version:   ${plan.plan_metadata.planner_version}
Model Used:        ${plan.plan_metadata.model_used || 'N/A'}
Confidence:        ${(plan.plan_metadata.confidence * 100).toFixed(1)}%
Requires Review:   ${plan.plan_metadata.requires_review ? 'Yes' : 'No'}
Status:            ${plan.plan_metadata.status}

CONFIG SUMMARY
${'-'.repeat(80)}
Config ID:         ${plan.hac_config.config_metadata.config_id}
Config Name:       ${plan.hac_config.config_metadata.name}
Version:           ${plan.hac_config.config_metadata.version}
Signal Groups:     ${plan.hac_config.signals.signal_groups.length}
Timeline Phases:   ${plan.hac_config.timeline.phases.length}
Clinical Rules:    ${plan.hac_config.criteria.rules.length}
Follow-Up Qs:      ${plan.hac_config.questions?.followup_questions?.length || 0}

VALIDATION RESULTS
${'-'.repeat(80)}
Overall Valid:     ${validation.is_valid ? 'YES ✓' : 'NO ✗'}
Schema Valid:      ${validation.schema_valid ? 'YES ✓' : 'NO ✗'}
Business Rules:    ${validation.business_rules_valid ? 'YES ✓' : 'NO ✗'}
Error Count:       ${validation.errors.length}
Warning Count:     ${validation.warnings.length}

`;

  if (validation.errors.length > 0) {
    report += `ERRORS\n${'-'.repeat(80)}\n`;
    validation.errors.forEach((error, i) => {
      report += `${i + 1}. ${error}\n`;
    });
    report += `\n`;
  }

  if (validation.warnings.length > 0) {
    report += `WARNINGS\n${'-'.repeat(80)}\n`;
    validation.warnings.forEach((warning, i) => {
      report += `${i + 1}. ${warning}\n`;
    });
    report += `\n`;
  }

  report += `RATIONALE\n${'-'.repeat(80)}\n`;
  report += `${plan.rationale.summary}\n\n`;

  report += `KEY DECISIONS\n${'-'.repeat(80)}\n`;
  plan.rationale.key_decisions.forEach((decision, i) => {
    report += `${i + 1}. ${decision.aspect.toUpperCase()}\n`;
    report += `   Decision:  ${decision.decision}\n`;
    report += `   Reasoning: ${decision.reasoning}\n`;
    if (decision.confidence !== undefined) {
      report += `   Confidence: ${(decision.confidence * 100).toFixed(1)}%\n`;
    }
    report += `\n`;
  });

  if (plan.rationale.concerns && plan.rationale.concerns.length > 0) {
    report += `CONCERNS\n${'-'.repeat(80)}\n`;
    plan.rationale.concerns.forEach((concern, i) => {
      report += `${i + 1}. ${concern}\n`;
    });
    report += `\n`;
  }

  if (plan.rationale.recommendations && plan.rationale.recommendations.length > 0) {
    report += `RECOMMENDATIONS\n${'-'.repeat(80)}\n`;
    plan.rationale.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
    report += `\n`;
  }

  report += `${'='.repeat(80)}\n`;
  report += `END OF REPORT\n`;

  return report;
}

/**
 * Validation result type (imported from validatePlan.ts)
 */
interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  schema_valid: boolean;
  business_rules_valid: boolean;
}

// Run CLI
if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}
