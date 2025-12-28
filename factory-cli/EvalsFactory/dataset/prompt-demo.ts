import { loadBatchPlan } from './BatchConfig';
import { buildSystemPrompt, buildUserPrompt } from './core';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--metric' && argv[i + 1]) {
      args.metric = argv[i + 1];
      i++;
    } else if (token === '--scenario' && argv[i + 1]) {
      args.scenario = argv[i + 1];
      i++;
    }
  }
  return args;
}

function main() {
  const { metric, scenario } = parseArgs(process.argv.slice(2));
  if (!metric) {
    console.error('Usage: ts-node flywheel/dataset/prompt-demo.ts --metric <metric_id> [--scenario <index>]');
    process.exit(1);
  }

  const plan = loadBatchPlan(metric);
  const scenarioIndex = Math.max(0, (scenario ? parseInt(scenario, 10) - 1 : 0));
  const targetScenario = plan.scenarios[scenarioIndex];

  if (!targetScenario) {
    console.error(`Scenario index ${scenarioIndex + 1} not found. Plan has ${plan.scenarios.length} scenarios.`);
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt(plan.metric_id, plan.domain, plan.global_duet);
  const userPrompt = buildUserPrompt([targetScenario], 0);

  console.log('--- SYSTEM PROMPT ---\n');
  console.log(systemPrompt);
  console.log('\n--- USER PROMPT ---\n');
  console.log(userPrompt);
}

if (require.main === module) {
  main();
}
