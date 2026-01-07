#!/usr/bin/env node

/**
 * HAC Planner CLI - Unified Entry Point
 *
 * Provides workflow modes:
 * - generate: Fast LLM-based plan generation
 * - flywheel: Prompt refinement loop
 * - eval: Evaluation commands
 */

// Load environment variables from root .env file
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from root directory (single global config)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Command } from 'commander';
import * as fs from 'fs/promises';
import { PlanningInput } from '../models/PlanningInput';
import { generatePlan, PlannerConfig } from '../PlanningFactory/planner/planGen';
import { getPlanOutputPath } from '../utils/outputConfig';
import { detectDomain, getDomainDescription } from '../utils/domainDetection';

const program = new Command();

program
  .name('planner')
  .description('HAC/USNWR Clinical Abstraction Planning CLI')
  .version('2.0.0');

// ============================================
// GENERATE COMMAND (Fast Mode)
// ============================================
program
  .command('generate')
  .description('Generate plan quickly using LLM (no research)')
  .requiredOption('-c, --concern <id>', 'Concern ID (e.g., CLABSI, CAUTI, I06)')
  .option('-d, --domain <domain>', 'Override auto-detected domain (optional)')
  .option('-o, --output <path>', 'Output path for plan JSON')
  .option('--api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env var)')
  .option('--model <model>', 'LLM model to use', 'gpt-4o-mini')
  .option('--temperature <temp>', 'Temperature for LLM', parseFloat, 0.7)
  .option('--validate-only', 'Validate without generating')
  .action(async (options) => {
    try {
      // Auto-detect domain from concern if not provided
      const detectedDomain = detectDomain(options.concern);
      const domain = options.domain || detectedDomain;

      console.log(`\n⚡ Fast Generation Mode`);
      console.log(`   Concern: ${options.concern}`);
      console.log(`   Domain: ${domain}${!options.domain ? ' (auto-detected)' : ''}`);
      if (!options.domain) {
        console.log(`   ℹ️  ${getDomainDescription(detectedDomain as any)}`);
      }
      console.log(`   Model: ${options.model}\n`);

      const input: PlanningInput = {
        planning_input_id: `input_${Date.now()}`,
        planning_id: `input_${Date.now()}`,
        concern_id: options.concern,
        concern: options.concern, // V9.1 field
        domain: domain, // Auto-detected or user-specified
        // V9.1: domain_hint should NOT be set - let archetype matrix determine it
        intent: 'surveillance', // V9.1 field
        target_population: domain, // V9.1 field
        specific_requirements: [], // V9.1 field
        archetype: inferArchetype(options.concern),
        data_profile: {
          sources: [{
            source_id: 'EHR',
            type: 'EHR',
            available_data: ['demographics', 'vitals', 'labs', 'medications', 'procedures']
          }]
        },
        clinical_context: {
          objective: `Generate ${options.concern} clinical abstraction configuration`,
          population: domain,
          patient_payload: "DUMMY PAYLOAD FOR GENERATION MODE - SKIPPING EXECUTION"
        }
      };

      const config: PlannerConfig = {
        apiKey: options.apiKey || process.env.OPENAI_API_KEY,
        model: options.model,
        temperature: options.temperature
      };

      // V9.1: Generate plan using unified entry point
      const plan = await generatePlan(input, config);

      // Determine output path using centralized config
      const outputPath = options.output || getPlanOutputPath(
        options.concern,
        domain,
        'lean_plan.json'
      );

      // Save plan to file
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(plan, null, 2));
      console.log(`\n✅ Plan saved to: ${outputPath}\n`);

    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * @deprecated This function uses old archetype names (HAC_CLABSI, etc.) which are not V9.1 compliant.
 * V9.1 uses the Archetype Matrix in plannerAgent.ts with archetype types: Preventability_Detective, Process_Auditor, etc.
 * Maintained for backward compatibility in bin/planner.ts only.
 */
function inferArchetype(concernId: string): string {
  const concernUpper = concernId.toUpperCase();

  if (concernUpper === 'CLABSI') return 'HAC_CLABSI';
  if (concernUpper === 'CAUTI') return 'HAC_CAUTI';
  if (concernUpper === 'VAP' || concernUpper === 'VAE') return 'HAC_VAP';
  if (concernUpper === 'SSI') return 'HAC_SSI';
  if (concernUpper.match(/^I\d+[AB]?$/)) return 'USNWR';

  return 'HAC';
}

import { flywheel } from '../EvalsFactory/cli/flywheel';
import { safeScore } from '../EvalsFactory/cli/safeScore';
import { evalCommand } from '../EvalsFactory/cli/eval';
import { evalStatus } from '../EvalsFactory/cli/evalStatus';
import { evalRoundtrip } from '../EvalsFactory/cli/evalRoundtrip';
// import { exportUiPayload } from '../tools/ui-export';

// ============================================
// FLYWHEEL COMMAND (Prompt Refinery)
// ============================================
program.addCommand(flywheel);

// ============================================
// SAFE:SCORE COMMAND (SAFE v0 Evaluation)
// ============================================
program.addCommand(safeScore);

// ============================================
// EVAL COMMAND (New EvalFactory)
// ============================================
program.addCommand(evalCommand);

// ============================================
// EVAL:STATUS COMMAND (QA Scorecard)
// ============================================
program.addCommand(evalStatus);

// ============================================
// EVAL:ROUNDTRIP COMMAND (Automated Cycle)
// ============================================
program.addCommand(evalRoundtrip);

// ============================================
// UI:EXPORT COMMAND (UI Factory Demo Payload)
// ============================================
/*
program
  .command('ui:export')
  .description('Export UI payload for a metric + case')
  .requiredOption('-m, --metric <id>', 'Metric ID (e.g., I32a)')
  .requiredOption('-c, --case <id>', 'Case ID (e.g., emily)')
  .requiredOption('-o, --out <dir>', 'Output directory')
  .action(async (options) => {
    try {
      await exportUiPayload({
        metricId: options.metric,
        caseId: options.case,
        outDir: options.out
      });
    } catch (error: any) {
      console.error(`\nƒ?O Error: ${error.message}\n`);
      process.exit(1);
    }
  });
*/

// ============================================
// PARSE AND EXECUTE
// ============================================

program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
