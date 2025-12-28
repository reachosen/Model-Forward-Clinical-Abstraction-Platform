import * as fs from 'fs';
import * as path from 'path';
import { I25BatchRunner } from '../validation/runner';

// Configuration
const CONCERN_ID = 'I25';
const FULL_BATCH_DIR = path.join(__dirname, '../../data/flywheel/testcases/batch1_full');
const FULL_PLAN_PATH = path.join(FULL_BATCH_DIR, 'generation_plan.json');
const GOLDEN_SET_PATH = path.join(__dirname, '../../data/flywheel/testcases/golden_set.json');
const HISTORY_FILE = path.join(__dirname, '../../data/flywheel/prompts/prompt_history_lean.json');

async function upgradeGoldenSet() {
  console.log("🆙 Upgrading Golden Set to Next Difficulty Level...");

  // 1. Get Latest Best Prompt
  if (!fs.existsSync(HISTORY_FILE)) {
    throw new Error("No prompt history found. Run the flywheel first.");
  }
  const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  const latest = history[history.length - 1];
  console.log(`   Using Prompt Version v${latest.version} (Score: ${(latest.metrics?.signal_recall * 100).toFixed(1)}%)`);

  // 2. Run against Full Batch (Mining Mode)
  console.log(`   ⛏️  Mining failures from full batch (${FULL_BATCH_DIR})...`);
  const runner = new I25BatchRunner(CONCERN_ID, FULL_PLAN_PATH, FULL_BATCH_DIR);
  const report = await runner.run(latest.prompt_text);

  // 3. Identify Failures
  const failures = report.raw_results.filter((r: any) => 
    !r.semantic.signals_ok || !r.semantic.summary_ok || !r.semantic.followups_ok
  );

  console.log(`   Found ${failures.length} remaining failures out of ${report.total_cases}.`);

  if (failures.length === 0) {
    console.log("   🎉 Amazing! Zero failures in the full batch. Time to generate Batch 2!");
    return;
  }

  // 4. Select Diversity of Failures (Max 12)
  // Prioritize different archetypes to ensure the new set is well-rounded
  const nextGoldenIds = new Set<string>();
  const archetypeCounts: Record<string, number> = {};
  
  // Sort failures by lowest recall to get the "hardest" ones first
  failures.sort((a: any, b: any) => (a.scores.signals_recall || 0) - (b.scores.signals_recall || 0));

  failures.forEach((f: any) => {
    const arc = f.archetype || 'Unknown';
    if (!archetypeCounts[arc]) archetypeCounts[arc] = 0;
    
    // Take up to 3 of each archetype to force diversity
    if (archetypeCounts[arc] < 3 && nextGoldenIds.size < 12) {
      nextGoldenIds.add(f.test_id);
      archetypeCounts[arc]++;
    }
  });

  // Fill remaining slots if we haven't hit 12
  if (nextGoldenIds.size < 12) {
    failures.forEach((f: any) => {
      if (nextGoldenIds.size < 12) nextGoldenIds.add(f.test_id);
    });
  }

  console.log(`   Selected ${nextGoldenIds.size} new hard cases:`, Array.from(nextGoldenIds));

  // 5. Hydrate and Save New Golden Set
  const goldenCases = [];
  // Need to read from the actual source files
  const batchFiles = fs.readdirSync(FULL_BATCH_DIR)
    .filter(f => f.startsWith('I25_batch_') && f.endsWith('.json'))
    .map(f => path.join(FULL_BATCH_DIR, f));

  for (const file of batchFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const tc of data.test_cases) {
      if (nextGoldenIds.has(tc.test_id)) {
        goldenCases.push(tc);
      }
    }
  }

  const output = {
    batch_plan: {
      batch_index: latest.version + 1, // Symbolic level up
      scenario_count: goldenCases.length,
      scenarios: goldenCases.map(c => c.description)
    },
    test_cases: goldenCases
  };

  fs.writeFileSync(GOLDEN_SET_PATH, JSON.stringify(output, null, 2));
  console.log(`   ✅ New Golden Set saved to ${GOLDEN_SET_PATH}`);
  console.log(`   🚀 You are ready to run the Flywheel again to conquer Level ${latest.version + 1}!`);
}

upgradeGoldenSet().catch(console.error);
