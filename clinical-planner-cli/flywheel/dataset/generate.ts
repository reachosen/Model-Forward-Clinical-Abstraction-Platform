import * as fs from 'fs';
import * as path from 'path';
import { runGenerator } from './core';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PLAN_PATH = path.join(__dirname, '../../data/flywheel/testcases/generation_plan.json');
const OUTPUT_DIR = path.join(__dirname, '../../data/flywheel/testcases/samples');

async function executeSample() {
  if (!fs.existsSync(PLAN_PATH)) {
    console.error("Plan file not found:", PLAN_PATH);
    process.exit(1);
  }

  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  
  // Find Batch 1
  const batch1 = plan.batches.find((b: any) => b.batch_index === 1);
  if (!batch1) {
    console.error("Batch 1 not found in plan.");
    process.exit(1);
  }

  // Take top 5 scenarios from Batch 1
  const sampleScenarios = batch1.scenarios.slice(0, 5);

  console.log(`Regenerating first ${sampleScenarios.length} cases from Batch 1...`);
  console.log("Scenarios to generate:");
  sampleScenarios.forEach((s: string) => console.log(` - ${s}`));

  await runGenerator({
    concern_id: 'I25',
    archetype: 'Sample_Context_Rich',
    scenarios: sampleScenarios,
    output_dir: OUTPUT_DIR,
    batch_size: 5, // Keep batch size at 5 for LLM calls
    plan_only: false 
  });
}

executeSample().catch(console.error);