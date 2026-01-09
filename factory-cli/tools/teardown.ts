import * as fs from 'fs';
import * as path from 'path';
import { resolveMetricPath, Paths } from '../utils/pathConfig';

/**
 * ops:teardown Tool
 * 
 * Safely wipes generated outputs, test cases, and flywheel history
 * for a specific metric. 
 * 
 * CRITICAL: Does NOT touch the 'certified/' folder.
 */

function teardown() {
  const args = process.argv.slice(2);
  const metricFlagIdx = args.indexOf('--metric');
  const metricId = metricFlagIdx !== -1 ? args[metricFlagIdx + 1] : null;

  if (!metricId) {
    console.error("❌ Usage: ts-node tools/teardown.ts --metric <ID>");
    process.exit(1);
  }

  console.log(`\n🧹 Starting Teardown for: ${metricId}`);

  try {
    const metricPath = resolveMetricPath(metricId);
    const cliRoot = path.join(__dirname, '..');

    // 1. Wipe Planning Output (The Blueprint)
    const planDirName = `${metricId.toLowerCase()}-${(metricPath.specialty || 'General').toLowerCase()}`;
    const planOutputDir = path.join(cliRoot, 'output', planDirName);
    if (fs.existsSync(planOutputDir)) {
      console.log(`   [1/3] Wiping Planning Output: ${planOutputDir}`);
      fs.rmSync(planOutputDir, { recursive: true, force: true });
    }

    // 2. Wipe Test Cases (Evals)
    const testcasesDir = Paths.metricTestcases(metricPath);
    if (fs.existsSync(testcasesDir)) {
      console.log(`   [2/3] Wiping Test Cases: ${testcasesDir}`);
      const files = fs.readdirSync(testcasesDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(testcasesDir, file));
        }
      });
    }

    // 3. Wipe Flywheel History (Refinery)
    console.log(`   [3/3] Wiping Flywheel History for ${metricId}`);
    const reportPattern = `report_${metricId}_v`;
    const historyFile = `prompt_history_${metricId}.json`;
    
    const refineryDir = path.join(cliRoot, 'data/flywheel/reports/refinery');
    const promptsDir = path.join(cliRoot, 'data/flywheel/prompts');

    if (fs.existsSync(refineryDir)) {
      fs.readdirSync(refineryDir).forEach(file => {
        if (file.startsWith(reportPattern)) {
          fs.unlinkSync(path.join(refineryDir, file));
        }
      });
    }
    
    const historyPath = path.join(promptsDir, historyFile);
    if (fs.existsSync(historyPath)) {
      fs.unlinkSync(historyPath);
    }

    console.log(`\n✅ Teardown Complete. ${metricId} is now a clean slate.\n`);

  } catch (error: any) {
    console.error(`❌ Teardown failed: ${error.message}`);
    process.exit(1);
  }
}

teardown();
