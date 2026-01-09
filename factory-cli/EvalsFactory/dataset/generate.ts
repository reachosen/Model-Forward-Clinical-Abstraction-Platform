import { runGenerator } from './core';
import { loadBatchStrategy, getAllBatchStrategies } from './BatchStrategy';
import { loadEnv } from '../../utils/envConfig';
import { Paths, resolveMetricPath } from '../../utils/pathConfig';

// Load environment variables
loadEnv();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const metricId = args[1];
  const resume = args.includes('--resume');
  
  // Simple flag parsing for api-key
  const apiKeyIdx = args.indexOf('--api-key');
  const apiKey = apiKeyIdx !== -1 ? args[apiKeyIdx + 1] : undefined;

  if (command === 'list') {
    const strategies = getAllBatchStrategies();
    console.log('Available Batch Strategies:');
    strategies.forEach(s => {
        const count = s.scenarios?.length || (s.task_scenarios ? Object.values(s.task_scenarios).flatMap(ts => ts.scenarios).length : 0);
        console.log(` - ${s.metric_id} (${s.domain}) [${count} scenarios]`);
    });
    return;
  }

  if (command === 'run' && metricId) {
    try {
      console.log(`Loading strategy for ${metricId}...`);
      const strategy = loadBatchStrategy(metricId);

      // Resolve output directory from metric path
      let outputDir: string;
      try {
        const metricPath = resolveMetricPath(metricId);
        outputDir = Paths.metricTestcases(metricPath);
      } catch {
        // Fallback to legacy path
        outputDir = Paths.legacy.testcases();
      }
      console.log(`Output directory: ${outputDir}`);

      await runGenerator({
        strategy,
        output_dir: outputDir,
        batch_size: 5,
        resume: resume,
        apiKey: apiKey
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  console.log('Usage:');
  console.log('  npx ts-node EvalsFactory/dataset/generate.ts list');
  console.log('  npx ts-node EvalsFactory/dataset/generate.ts run <metric_id>');
}

if (require.main === module) {
  main().catch(console.error);
}