import * as fs from 'fs';
import * as path from 'path';
import { runGenerator } from '../EvalsFactory/dataset/core';
import { BatchStrategy } from '../EvalsFactory/dataset/BatchStrategy';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const STRATEGY_PATH = getArg('--strategy');
const OUT_PATH = getArg('--out');
const BATCH_SIZE = parseInt(getArg('--batch-size') || '5', 10);
const FORCE = argv.includes('--force');

if (!STRATEGY_PATH || !OUT_PATH) {
  console.error('Usage: ts-node tools/generate-cases.ts --strategy <path> --out <path> [--batch-size <n>] [--force]');
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(STRATEGY_PATH!)) {
    throw new Error(`Strategy file not found: ${STRATEGY_PATH}`);
  }

  const strategy: BatchStrategy = JSON.parse(fs.readFileSync(STRATEGY_PATH!, 'utf-8'));
  const tempDir = path.dirname(OUT_PATH!);

  console.log(`Loading strategy for ${strategy.metric_id}...`);

  // Load BIOS Overlay to inform simulation
  const loader = SemanticPacketLoader.getInstance();
  const domain = strategy.metric_id.startsWith('I') ? 'Orthopedics' : 'HAC'; 
  const packet = loader.load(domain, strategy.metric_id);

  await runGenerator({
    strategy,
    output_dir: tempDir,
    batch_size: BATCH_SIZE,
    resume: !FORCE,
    semantic_overlay: packet 
  });

  // Consolidate Batches
  const batchFiles = fs.readdirSync(tempDir).filter(f => {
      const isBatch = f.includes(`${strategy.metric_id}_batch_`);
      const isJson = f.endsWith('.json');
      return isBatch && isJson;
  });
  
  const allCases: any[] = [];
  const allScenarios: any[] = [];
  
  console.log(`Consolidating ${batchFiles.length} batch files...`);
  
  batchFiles.forEach(f => {
    const fullPath = path.join(tempDir, f);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    if (content.test_cases) {
      allCases.push(...content.test_cases);
    }
    if (content.batch_strategy?.scenarios) {
        allScenarios.push(...content.batch_strategy.scenarios);
    } else if (content.batch_plan?.scenarios) {
        allScenarios.push(...content.batch_plan.scenarios);
    }
  });

  if (allCases.length === 0) {
    throw new Error('No test cases generated.');
  }

  // Write Consolidated Artifact
  const output = {
    batch_plan: {
      batch_index: 1,
      scenario_count: allCases.length,
      scenarios: allScenarios
    },
    test_cases: allCases
  };

  fs.writeFileSync(OUT_PATH!, JSON.stringify(output, null, 2));
  console.log(`\n✅ Consolidated ${allCases.length} test cases to ${OUT_PATH}`);
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
