import * as fs from 'fs';
import { PlannerPlan } from '../models/PlannerPlan';
import { BatchStrategy, GenerationScenario } from '../EvalsFactory/dataset/BatchStrategy';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const METRIC_ID = getArg('--metric');
// Input/Output paths are passed by Conductor usually via env or args, 
// but for standardisation let's assume we read from the Run Context (passed as arg?)
// Wait, my tracks.ts passes: --metric {{metricId}} --plan {{input_plan}} --out {{output_artifact}} ?
// Checking tracks.ts:
// args: { metric: '{{metricId}}' }, inputArtifact: '{{runDir}}/plan.json'
// My cli.ts logic for args is naive. It only passes --metric. 
// It relies on implicit "plan.json in runDir"? No.
// I need to update tracks.ts to pass input/output explicitly or update cli.ts to auto-inject.

// Let's assume for this tool, we require: --plan <path> --out <path>
// I will need to update tracks.ts to pass these.

const PLAN_PATH = getArg('--plan');
const OUT_PATH = getArg('--out');

if (!METRIC_ID || !PLAN_PATH || !OUT_PATH) {
  console.error('Usage: ts-node tools/derive-strategy.ts --metric <id> --plan <path> --out <path>');
  process.exit(1);
}

try {
  const plan: PlannerPlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  const config = plan.clinical_config;

  const scenarios: GenerationScenario[] = [];
  const primaryArchetype = config.config_metadata.archetype || 'Process_Auditor';

  // 1. Base Scenario
  scenarios.push({
    description: `Standard presentation of ${config.config_metadata.name} with clear documentation.`,
    archetype: primaryArchetype
  });

  // 2. Signal-Driven Scenarios
  (config.signals.signal_groups || []).forEach(group => {
    // Pick top 2 signals
    const topSignals = group.signals.slice(0, 2);
    topSignals.forEach(sig => {
      scenarios.push({
        description: `Patient case involving ${sig.name} (${group.display_name}).`,
        archetype: primaryArchetype,
        doubt: group.group_id === 'delay_drivers' ? [{ type: 'conflict', instruction: 'Conflicting times' }] : undefined
      });
    });
  });

  const strategy: BatchStrategy = {
    metric_id: METRIC_ID,
    domain: config.domain.name.toLowerCase(),
    task_ids: ['eval_main'],
    coverage_goals: {
      min_scenarios: scenarios.length,
      min_archetypes: 1,
      doubt_ratio: 0.2
    },
    scenarios: scenarios
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(strategy, null, 2));
  console.log(`Generated strategy with ${scenarios.length} scenarios at ${OUT_PATH}`);

} catch (err) {
  console.error('Strategy derivation failed:', err);
  process.exit(1);
}
