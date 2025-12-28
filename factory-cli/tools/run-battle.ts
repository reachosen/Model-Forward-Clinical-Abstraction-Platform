import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { PlannerPlan } from '../models/PlannerPlan';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../../../.env'), // Root
  path.resolve(__dirname, '../../.env'), // CLI Root
];

envPaths.forEach(p => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    // console.log(`Loaded env from ${p}`);
  }
});

const argv = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const PLAN_PATH = getArg('--plan');
const TEST_CASES_PATH = getArg('--testcases');
const OUT_PATH = getArg('--out');

if (!PLAN_PATH || !TEST_CASES_PATH || !OUT_PATH) {
  console.error('Usage: ts-node tools/run-battle.ts --plan <path> --testcases <path> --out <path>');
  process.exit(1);
}

// Simple types matching EvalsFactory
interface TestCase {
  test_id: string;
  patient_payload: string;
  expectations: any;
}

interface EvalResult {
  test_id: string;
  score: number;
  label: 'Pass' | 'Fail';
  reason?: string;
}

async function runBattle() {
  const plan: PlannerPlan = JSON.parse(fs.readFileSync(PLAN_PATH!, 'utf-8'));
  const testCases: TestCase[] = JSON.parse(fs.readFileSync(TEST_CASES_PATH!, 'utf-8'));

  // Get Prompt
  const sysPrompt = plan.clinical_config.prompts.system_prompt;
  const taskPrompt = plan.clinical_config.prompts.task_prompts['eval_main']?.instruction;

  if (!taskPrompt) {
    throw new Error('Plan missing "eval_main" task prompt');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment variables.');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });
  const results: EvalResult[] = [];

  console.log(`Running Battle on ${testCases.length} cases using ${process.env.MODEL || 'gpt-4o-mini'}...`);

  for (const tc of testCases) {
    process.stdout.write(`   Testing ${tc.test_id}... `);

    try {
      const response = await client.chat.completions.create({
        model: process.env.MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: `Task: ${taskPrompt}\n\nPatient Case:\n${tc.patient_payload}` }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      });

      const outputRaw = response.choices[0].message.content || '{}';
      const output = JSON.parse(outputRaw);

      // Scoring Logic
      const expectedSignals = tc.expectations?.signal_generation?.must_find_signals || [];
      const outputText = JSON.stringify(output).toLowerCase();
      
      let foundCount = 0;
      expectedSignals.forEach((sig: string) => {
        if (outputText.includes(sig.toLowerCase())) foundCount++;
      });

      const recall = expectedSignals.length > 0 ? (foundCount / expectedSignals.length) : 1.0;
      
      const passed = recall >= 0.8;

      results.push({
        test_id: tc.test_id,
        score: recall,
        label: passed ? 'Pass' : 'Fail'
      });

      console.log(passed ? '✅ Pass' : `❌ Fail (${recall.toFixed(2)})`);

    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ test_id: tc.test_id, score: 0, label: 'Fail', reason: err.message });
    }
  }

  // Generate Report
  const passCount = results.filter(r => r.label === 'Pass').length;
  const report = {
    metadata: { timestamp: new Date().toISOString(), model: process.env.MODEL || 'gpt-4o-mini' },
    summary: {
      total_cases: results.length,
      pass_count: passCount,
      pass_rate: passCount / results.length
    },
    results
  };

  fs.writeFileSync(OUT_PATH!, JSON.stringify(report, null, 2));
  console.log(`\n✅ Battle Complete. Pass Rate: ${(report.summary.pass_rate * 100).toFixed(1)}%`);
  
  if (report.summary.pass_rate < 0.0) {
    console.log('Pass rate below threshold.');
    process.exit(1);
  }
}

runBattle().catch(err => {
  console.error(err);
  process.exit(1);
});