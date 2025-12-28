import * as fs from 'fs';
import * as path from 'path';
import { runGenerator } from '../EvalsFactory/dataset/core';
import { BatchStrategy } from '../EvalsFactory/dataset/BatchStrategy';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const STRATEGY_PATH = getArg('--strategy');
const OUT_PATH = getArg('--out');

if (!STRATEGY_PATH || !OUT_PATH) {
  console.error('Usage: ts-node tools/generate-cases.ts --strategy <path> --out <path>');
  process.exit(1);
}

// Ensure type safety
const safeStrategyPath: string = STRATEGY_PATH;
const safeOutPath: string = OUT_PATH;

async function main() {
  if (!fs.existsSync(safeStrategyPath)) {
    throw new Error(`Strategy file not found: ${safeStrategyPath}`);
  }

  const strategy: BatchStrategy = JSON.parse(fs.readFileSync(safeStrategyPath, 'utf-8'));
  const tempDir = path.dirname(safeOutPath); // Write batches to run dir temporarily

  console.log(`Loading strategy for ${strategy.metric_id}...`);

  await runGenerator({
    strategy,
    output_dir: tempDir,
    batch_size: 5
  });

  // Consolidate Batches
  const batchFiles = fs.readdirSync(tempDir).filter(f => f.match(new RegExp(`${strategy.metric_id}_batch_\\d+\.json`)));
  
  const allCases: any[] = [];
  
  batchFiles.forEach(f => {
    const content = JSON.parse(fs.readFileSync(path.join(tempDir, f), 'utf-8'));
    if (content.test_cases) {
      allCases.push(...content.test_cases);
    }
    // Optional: Cleanup batch file? Keeping for debug for now.
  });

  if (allCases.length === 0) {
    throw new Error('No test cases generated.');
  }

  // Write Consolidated Artifact
  fs.writeFileSync(safeOutPath, JSON.stringify(allCases, null, 2));
  console.log(`\n✅ Consolidated ${allCases.length} test cases to ${safeOutPath}`);
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});