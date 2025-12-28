import { S5Adapter } from './adapters/S5Adapter';
import { DatasetLoader } from './loaders/DatasetLoader';
import { SAFEEvaluator } from './evaluators/SAFEEvaluator';
import { RefineryRunner } from './runners/RefineryRunner';
import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlanV2 } from '../../models/PlannerPlan';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    // Usage: run <task_type> <dataset_id> --plan <path_to_plan.json>
    const taskType = args[1];
    const datasetId = args[2];
    const planFlagIndex = args.indexOf('--plan');
    const planPath = planFlagIndex > -1 ? args[planFlagIndex + 1] : null;

    if (!taskType || !datasetId) {
        console.error('Usage: npx ts-node EvalsFactory/refinery/cli.ts run <task_type> <dataset_id> --plan <path_to_plan.json>');
        process.exit(1);
    }
    
    let promptTemplate = '';
    let sourceLabel = 'Unknown';

    if (planPath) {
        // Mode A: Load from Linked Plan (Model-Forward)
        console.log(`\n📂 Loading plan from: ${planPath}`);
        if (!fs.existsSync(planPath)) {
            console.error(`❌ Plan file not found: ${planPath}`);
            process.exit(1);
        }
        
        const planRaw = fs.readFileSync(planPath, 'utf8');
        const plan = JSON.parse(planRaw) as PlannerPlanV2;
        
        // Resolve Task Prompt
        // Note: The schema stores canonical task keys (e.g. 'signal_generation' vs 'signal_enrichment')
        // We need to map or check existence.
        const taskPrompts = plan.clinical_config.prompts.task_prompts;
        
        // Map common aliases if needed
        const taskKey = Object.keys(taskPrompts).find(k => k === taskType || k === 'signal_generation' && taskType === 'signal_enrichment') || taskType;
        
        const promptConfig = taskPrompts[taskKey];
        
        if (!promptConfig) {
            console.error(`❌ Task '${taskType}' not found in plan prompts.`);
            console.error(`   Available keys: ${Object.keys(taskPrompts).join(', ')}`);
            process.exit(1);
        }

        if (promptConfig.template_ref) {
            // "Linker" Mode
            const relPath = promptConfig.template_ref.path; // e.g., "domains_registry/..."
            // Navigation from EvalsFactory/refinery/cli.ts to root of factory-cli
            const absPath = path.resolve(__dirname, '../../', relPath);
            
            console.log(`🔗 Resolving template_ref: ${relPath}`);
            
            if (!fs.existsSync(absPath)) {
                console.error(`❌ CRITICAL: Referenced template file missing at: ${absPath}`);
                console.error(`   (Integrity Check Failed)`);
                process.exit(1);
            }
            
            promptTemplate = fs.readFileSync(absPath, 'utf8');
            sourceLabel = relPath;
            console.log(`✅ Loaded ${promptTemplate.length} chars from registry.`);
            
        } else if (promptConfig.instruction) {
            // Legacy/Embedded Mode
            promptTemplate = promptConfig.instruction;
            sourceLabel = 'Embedded in Plan';
            console.log(`⚠️  Using embedded instruction (Legacy Mode).`);
        } else {
            console.error(`❌ Invalid prompt config for '${taskKey}': Missing both template_ref and instruction.`);
            process.exit(1);
        }

    } else {
        // Mode B: Legacy Fallback (Config File)
        console.warn('⚠️  WARNING: No --plan provided. Falling back to internal defaults (Legacy).');
        const promptsConfig = require('../../PlanningFactory/config/prompts.json');
        const templateEntry = (promptsConfig as any)[taskType];
        if (!templateEntry) {
            console.error(`Unknown task in legacy config: ${taskType}`);
            process.exit(1);
        }
        promptTemplate = templateEntry.template;
        sourceLabel = 'Internal Config (Legacy)';
    }

    const adapter = new S5Adapter();
    const loader = new DatasetLoader();
    const evaluator = new SAFEEvaluator();
    const runner = new RefineryRunner(adapter, loader, evaluator);

    const report = await runner.run({
      run_id: `cli_${Date.now()}`,
      metric_id: 'I25', // TODO: Extract from plan
      task_type: taskType,
      dataset_id: datasetId,
      candidate: {
        id: 'candidate_v1',
        task_type: taskType,
        prompt_template: promptTemplate,
        version_label: sourceLabel
      },
      sample_size: 5 // Default small sample
    });

    console.log('\n📊 Refinery Report');
    console.log('=================');
    console.log(`Run ID: ${report.run_id}`);
    console.log(`Score: ${(report.overall_score * 100).toFixed(1)}%`);
    console.log(`Pass: ${report.passed_cases} | Fail: ${report.failed_cases}`);
    console.log(`Details logged to console.`);
  } else {
    console.log('Usage: npx ts-node EvalsFactory/refinery/cli.ts run <task_type> <dataset_id> --plan <path_to_plan.json>');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
