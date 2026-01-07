import { S5Adapter } from './adapters/S5Adapter';
import { DatasetLoader } from './loaders/DatasetLoader';
import { SAFEEvaluator } from './evaluators/SAFEEvaluator';
import { RefineryRunner } from './runners/RefineryRunner';
import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlanV2 } from '../../models/PlannerPlan';
import { PlanAdapter } from '../adapters/PlanAdapter';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';
import { DomainContext } from '../../PlanningFactory/types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
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
    let baseContext: DomainContext | undefined;
    const metricId = datasetId.split('_')[0];

    if (planPath) {
        if (!fs.existsSync(planPath)) {
            console.error(`❌ Plan file not found: ${planPath}`);
            process.exit(1);
        }
        
        const planRaw = fs.readFileSync(planPath, 'utf8');
        let plan = JSON.parse(planRaw) as PlannerPlanV2;

        if ((plan as any).handoff_metadata) {
             plan = PlanAdapter.adapt(plan);
        }

        const packetLoader = SemanticPacketLoader.getInstance();
        const packet = packetLoader.load(plan.plan_metadata.concern.domain, metricId);
        
        if (packet) {
            baseContext = {
                domain: plan.plan_metadata.concern.domain,
                primary_archetype: 'Preventability_Detective' as any,
                archetypes: ['Preventability_Detective' as any],
                semantic_context: {
                    packet: {
                        metric: packet.metrics[metricId],
                        signals: packet.signals,
                        priorities: packet.priorities
                    }
                }
            };
        }
        
        const taskPrompts = plan.clinical_config.prompts.task_prompts;
        const taskKey = Object.keys(taskPrompts).find(k => k === taskType || k === 'signal_generation' && taskType === 'signal_enrichment') || taskType;
        const promptConfig = taskPrompts[taskKey];
        
        if (promptConfig) {
            if (promptConfig.template_ref) {
                const relPath = promptConfig.template_ref.path;
                const absPath = path.resolve(__dirname, '../../', relPath);
                if (fs.existsSync(absPath)) {
                    promptTemplate = fs.readFileSync(absPath, 'utf8');
                    sourceLabel = relPath;
                }
            } else if (promptConfig.instruction) {
                promptTemplate = promptConfig.instruction;
                sourceLabel = 'Embedded';
            }
        }
    }

    const adapter = new S5Adapter();
    const loader = new DatasetLoader();
    const evaluator = new SAFEEvaluator();
    const runner = new RefineryRunner(adapter, loader, evaluator);

    const report = await runner.run({
      run_id: `cli_${Date.now()}`,
      metric_id: metricId,
      task_type: taskType,
      dataset_id: datasetId,
      candidate: {
        id: 'candidate_v1',
        task_type: taskType,
        prompt_template: promptTemplate,
        version_label: sourceLabel
      },
      sample_size: 5
    }, baseContext);

    console.log('\n📊 Refinery Report');
    console.log('=================');
    console.log(`Run ID: ${report.run_id}`);
    console.log(`Score: ${(report.overall_score * 100).toFixed(1)}%`);
    console.log(`Pass: ${report.passed_cases} | Fail: ${report.failed_cases}`);
  }
}

main().catch(console.error);
