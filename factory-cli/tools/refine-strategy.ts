/**
 * Strategy Refiner Tool (The Strategy Flywheel)
 * 
 * Automatically hardens a BatchStrategy by generating new, difficult scenarios.
 * 
 * Usage:
 *   npx ts-node tools/refine-strategy.ts --metric <metric_id>
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { getOpenAIClientOptions } from '../utils/envConfig';
import * as dotenv from 'dotenv';
import { loadBatchStrategy, BatchStrategy, GenerationScenario } from '../EvalsFactory/dataset/BatchStrategy';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new OpenAI(getOpenAIClientOptions());
const OPTIMIZER_MODEL = process.env.OPTIMIZER_MODEL || 'gpt-4o';
const STRATEGY_FILE = path.join(__dirname, '../EvalsFactory/dataset/batch_strategies.metadata.json');

// Validation Constants
const TARGET_SCENARIOS = 5;
const TARGET_DIVERSITY = 2; // Minimum archetypes
const TARGET_DOUBT_RATIO = 0.4; // 40% should be adversarial

interface StrategyHealth {
  isHealthy: boolean;
  gaps: string[];
  recommendation: string;
}

function diagnoseStrategy(strategy: BatchStrategy): StrategyHealth {
  const gaps: string[] = [];
  const count = strategy.scenarios.length;
  const archetypes = new Set(strategy.scenarios.map(s => s.archetype));
  const doubtCount = strategy.scenarios.filter(s => s.doubt && s.doubt.length > 0).length;
  const doubtRatio = count > 0 ? doubtCount / count : 0;

  if (count < TARGET_SCENARIOS) {
    gaps.push(`Low Volume: Has ${count}, needs ${TARGET_SCENARIOS}.`);
  }
  if (archetypes.size < TARGET_DIVERSITY) {
    gaps.push(`Low Diversity: Only ${archetypes.size} archetype(s). Needs mixed perspectives.`);
  }
  if (doubtRatio < TARGET_DOUBT_RATIO) {
    gaps.push(`Too Easy: Only ${(doubtRatio * 100).toFixed(0)}% adversarial. Needs more 'doubt' cases.`);
  }

  return {
    isHealthy: gaps.length === 0,
    gaps,
    recommendation: gaps.length > 0 
      ? `Generate new scenarios to fix: ${gaps.join(' ')}` 
      : "Strategy is healthy."
  };
}

async function generateHardeningScenarios(strategy: BatchStrategy, health: StrategyHealth): Promise<GenerationScenario[]> {
  console.log(`🤖 Requesting hardening scenarios from ${OPTIMIZER_MODEL}...`);

  const metaPrompt = `You are a QA Strategist for Clinical AI.
Your goal is to harden a Test Strategy by generating CHALLENGING scenarios.

CURRENT STRATEGY (${strategy.metric_id}):
${JSON.stringify(strategy.scenarios.map(s => `${s.archetype}: ${s.description} [Doubt: ${s.doubt?.length || 0}]`), null, 2)}

DIAGNOSIS:
${health.gaps.join('\n')}

INSTRUCTIONS:
1. Generate 2-3 NEW scenarios that specifically address the gaps.
2. Focus on EDGE CASES (Ambiguity, Conflicting Vitals, Missing Documentation).
3. Use specific "doubt" modifiers to force the generator to write messy narratives.
4. Ensure variety in Archetypes (Process_Auditor, Delay_Driver_Profiler, Safety_Signal).

OUTPUT JSON:
{
  "new_scenarios": [
    {
      "description": "...",
      "archetype": "...",
      "doubt": [ { "type": "ambiguity", "instruction": "..." } ]
    }
  ]
}
`;

  const response = await client.chat.completions.create({
    model: OPTIMIZER_MODEL,
    messages: [{ role: 'user', content: metaPrompt }],
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.new_scenarios || [];
}

async function main() {
  const args = process.argv.slice(2);
  const metricArgIndex = args.indexOf('--metric');
  
  if (metricArgIndex === -1) {
    console.error('Usage: tools/refine-strategy.ts --metric <metric_id>');
    process.exit(1);
  }

  const metricId = args[metricArgIndex + 1];
  console.log(`🔍 Diagnosing Strategy: ${metricId}`);

  try {
    const strategy = loadBatchStrategy(metricId);
    const health = diagnoseStrategy(strategy);

    if (health.isHealthy) {
      console.log(`✅ Strategy is already healthy. No changes needed.`);
      console.log(`   (Run 'strategy:view' to inspect)`);
      return;
    }

    console.log(`⚠️  Strategy Weaknesses Detected:`);
    health.gaps.forEach(g => console.log(`   - ${g}`));

    const newScenarios = await generateHardeningScenarios(strategy, health);
    
    if (newScenarios.length === 0) {
      console.log(`⚠️  Optimizer returned no new scenarios.`);
      return;
    }

    console.log(`\n✨ Generated ${newScenarios.length} Hardening Scenarios:`);
    newScenarios.forEach(s => console.log(`   + [${s.archetype}] ${s.description}`));

    // Merge and Save
    strategy.scenarios = [...strategy.scenarios, ...newScenarios];
    
    // Load full file to preserve other strategies
    const fullMetadata = JSON.parse(fs.readFileSync(STRATEGY_FILE, 'utf-8'));
    const strategyIndex = fullMetadata.strategies.findIndex((s: any) => s.metric_id === metricId);
    
    if (strategyIndex !== -1) {
      fullMetadata.strategies[strategyIndex] = strategy;
      fs.writeFileSync(STRATEGY_FILE, JSON.stringify(fullMetadata, null, 2));
      console.log(`\n💾 Strategy updated in ${STRATEGY_FILE}`);
      console.log(`   Total Scenarios: ${strategy.scenarios.length}`);
    } else {
      console.error("❌ Critical Error: Strategy found in memory but not in file index.");
    }

  } catch (e: any) {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
