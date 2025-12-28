import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
// import { FlywheelRunner } from '../flywheel'; // TODO: Fix import path
import { generatePlan } from '../../PlanningFactory/planner/planGen';
import { PlanningInput } from '../../models/PlanningInput';

export const flywheel = new Command('flywheel')
  .description('Run the Prompt Refinery Flywheel to validate task prompts against test cases')
  .requiredOption('-c, --concern <ID>', 'Concern ID to evaluate (e.g., I32b)')
  .option('-t, --tests <PATH>', 'Path to test_cases.json')
  .option('-p, --plan <PATH>', 'Path to generated plan JSON (optional, generates if missing)')
  .option('-o, --out <PATH>', 'Output path for refinement report', './flywheel_report.json')
  .action(async (options) => {
    try {
      const concernId = options.concern;
      let testPath = options.tests;
      
      // Default test path resolution
      if (!testPath) {
        testPath = path.join(__dirname, `../data/flywheel/${concernId}_tests.json`);
        if (!fs.existsSync(testPath)) {
             console.error(`❌ Test file not found at default location: ${testPath}`);
             process.exit(1);
        }
      }

      let plan;
      if (options.plan) {
          plan = JSON.parse(fs.readFileSync(options.plan, 'utf-8'));
      } else {
          console.log(`⚙️  Generating fresh plan for ${concernId}...`);
          const input: PlanningInput = {
              planning_input_id: 'flywheel_gen',
              concern_id: concernId,
              concern: concernId, // V9.1 compat
              domain_hint: 'Orthopedics', // heuristic
              intent: 'quality_reporting',
              target_population: 'pediatric',
              specific_requirements: [],
              data_profile: {
                  sources: []
              },
              clinical_context: {
                  objective: 'Flywheel validation'
              }
          };
          plan = await generatePlan(input, { useMock: false });
      }
      
      if (plan) {
        console.log('Plan generated successfully (Flywheel disabled).');
      }

      // const runner = new FlywheelRunner();
      // const result = await runner.run(concernId, testPath, plan);

      // console.log(result.humanOutput);

      // if (!result.success) {
      //     console.log('❌ Flywheel detected prompt failures.');
      //     process.exit(1);
      // } else {
      //     console.log('✅ All prompts passed validation.');
      //     process.exit(0);
      // }
      console.log('⚠️ Flywheel runner temporarily disabled during refactor.');

    } catch (error: any) {
      console.error('❌ Flywheel execution failed:', error.message);
      process.exit(1);
    }
  });
