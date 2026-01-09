import * as fs from 'fs';
import * as path from 'path';
import { ClinicalEvalEngine } from '../validation/runner';
import { resolveMetricPath, Paths } from '../../utils/pathConfig';

/**
 * eval:leap Tool (Golden Set Upgrade)
 * 
 * Mines failures from the full batch suite and promotes the 
 * most difficult cases into a new 'Golden Set'.
 */

async function upgradeGoldenSet() {
  const args = process.argv.slice(2);
  const metricFlagIdx = args.indexOf('--metric');
  const metricId = metricFlagIdx !== -1 ? args[metricFlagIdx + 1] : 'I32a';

  console.log(`\n🆙 Leap Forward: Upgrading Golden Set for ${metricId}...`);

  try {
    const metricPath = resolveMetricPath(metricId);
    const cliRoot = path.join(__dirname, '../../..');
    const testDataDir = Paths.metricTestcases(metricPath);
    
    const planDirName = `${metricId.toLowerCase()}-${(metricPath.specialty || 'General').toLowerCase()}`;
    const planPath = path.join(cliRoot, 'factory-cli/output', planDirName, 'lean_plan.json');
    const historyFile = path.join(cliRoot, 'factory-cli/data/flywheel/prompts', `prompt_history_${metricId}.json`);
    const goldenSetPath = path.join(testDataDir, 'golden_set_v3.json');

    // 1. Get Latest Best Prompt
    if (!fs.existsSync(historyFile)) {
      throw new Error(`No prompt history found for ${metricId}. Run the flywheel first.`);
    }
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    const latest = history[history.length - 1];
    console.log(`   Using Latest Prompt Version v${latest.version} (Score: ${(latest.metrics?.signal_recall * 100 || 0).toFixed(1)}%)`);

    // 2. Run against Full Batch Suite (Mining Mode)
    console.log(`   ⛏️  Mining hardest cases from: ${testDataDir}...`);
    const runner = new ClinicalEvalEngine(metricId, planPath, testDataDir);
    runner.quiet = true;
    const report = await runner.run(latest.prompt_text);

    // 3. Identify Hardest Failures
    const failures = report.raw_results.filter((r: any) => 
      !r.semantic.signals_ok || !r.semantic.summary_ok
    );

    console.log(`   Found ${failures.length} challenging cases out of ${report.total_cases}.`);

    if (failures.length === 0) {
      console.log("   🎉 Amazing! Zero failures found. Current prompt is perfect for this set.");
      return;
    }

    // 4. Select Hardest Cases (Max 20)
    failures.sort((a: any, b: any) => (a.scores.signals_recall || 0) - (b.scores.signals_recall || 0));
    const selectedCases = failures.slice(0, 20);
    const selectedIds = new Set(selectedCases.map((f: any) => f.test_id));

    console.log(`   Selected ${selectedCases.length} "Hard Mode" cases for the new Golden Set.`);

    // 5. Materialize v3
    const finalCases = [];
    const batchFiles = fs.readdirSync(testDataDir).filter(f => f.includes('_batch_') && f.endsWith('.json'));

    for (const file of batchFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(testDataDir, file), 'utf-8'));
      for (const tc of data.test_cases) {
        if (selectedIds.has(tc.test_id)) {
          finalCases.push(tc);
        }
      }
    }

    const output = {
      metadata: { 
        version: "v3", 
        source: "eval:leap mining",
        mined_at: new Date().toISOString(),
        parent_version: `v${latest.version}`
      },
      test_cases: finalCases
    };

    fs.writeFileSync(goldenSetPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ SUCCESS: New Golden Set created: golden_set_v3.json`);
    console.log(`   🚀 Action: Run eval:optimize again with --dataset golden_set_v3 to conquer the next level!`);

  } catch (error: any) {
    console.error(`❌ Leap failed: ${error.message}`);
    process.exit(1);
  }
}

upgradeGoldenSet().catch(console.error);