/**
 * PromptOptimizerLoop (Refinement Agent)
 * 
 * Analyzes an EvalReport and generates an improved prompt.
 * 
 * Usage:
 *   npx ts-node tools/refine.ts --report <path_to_report.json> --task <task_id>
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { getOpenAIClientOptions } from '../utils/envConfig';
import * as dotenv from 'dotenv';
import { EvalReport } from '../EvalsFactory/reporting/ReportGenerator';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new OpenAI(getOpenAIClientOptions());

const OPTIMIZER_MODEL = process.env.OPTIMIZER_MODEL || 'gpt-4o';
const OPTIMIZER_MAX_TOKENS = 2000;

function summarizeFailures(report: EvalReport): string {
  let evidence = "FAILURE EVIDENCE:\n";
  
  // Filter for failed cases
  const failures = report.results.filter(r => r.label !== 'Pass');
  
  // Take top 3 failures to keep context light
  const topFailures = failures.slice(0, 3);

  topFailures.forEach((r, i) => {
    evidence += `\n--- CASE ${i + 1}: ${r.test_id} ---\n`;
    // We assume engine_output has raw_input (added in our previous patch)
    const rawInput = (r.engine_output as any).raw_input || "(Patient narrative unavailable)";
    evidence += `NARRATIVE Snippet: "${rawInput.slice(0, 200)}"...\n`;
    
    // Grading details
    if (r.grading_details?.SignalRecall?.missing?.length) {
      evidence += `MISSED SIGNALS: ${r.grading_details.SignalRecall.missing.join(', ')}\n`;
    }
    if (r.grading_details?.AvoidsHarm?.violations?.length) {
      evidence += `SAFETY VIOLATIONS: ${r.grading_details.AvoidsHarm.violations.join(', ')}\n`;
    }
    if (r.error) {
      evidence += `SYSTEM ERROR: ${r.error}\n`;
    }
  });

  return evidence;
}

async function optimizePrompt(report: EvalReport, taskPrompt: string, taskDescription: string) {
  console.log(`🧠 Analyzing ${report.summary.fail_count} failures...`);
  
  const evidence = summarizeFailures(report);
  const passRate = (report.summary.pass_rate * 100).toFixed(1);

  const metaPrompt = `You are an expert Prompt Engineer for Clinical AI.
Your goal is to improve a System Prompt based on concrete failure evidence.

TASK: ${taskDescription}
CURRENT PASS RATE: ${passRate}%

CURRENT PROMPT:
${taskPrompt}

${evidence}

INSTRUCTIONS:
1. Analyze the FAILURE EVIDENCE. Why did the current prompt miss these signals or fail safety checks?
2. Identify 1-2 specific improvements (e.g., "Add instruction to capture implied NPO violations").
3. Rewrite the PROMPT to fix these gaps without breaking existing functionality.

OUTPUT JSON:
{
  "analysis": "Detailed diagnosis of why it failed.",
  "new_prompt": "The full, updated prompt text.",
  "expected_improvements": "What this fix achieves."
}
`;

  console.log(`🤖 generating optimization via ${OPTIMIZER_MODEL}...`);

  const response = await client.chat.completions.create({
    model: OPTIMIZER_MODEL,
    messages: [{ role: 'user', content: metaPrompt }],
    max_tokens: OPTIMIZER_MAX_TOKENS,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

async function main() {
  const args = process.argv.slice(2);
  const reportArgIndex = args.indexOf('--report');
  const taskArgIndex = args.indexOf('--task');

  if (reportArgIndex === -1) {
    console.error('Usage: tools/refine.ts --report <path> [--task <task_id>]');
    process.exit(1);
  }

  const reportPath = args[reportArgIndex + 1];
  const taskId = taskArgIndex !== -1 ? args[taskArgIndex + 1] : 'signal_enrichment'; // Default

  if (!fs.existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    process.exit(1);
  }

  const report: EvalReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // TODO: Load actual prompt from file. For now, we use a placeholder or read from S4 config if possible.
  // In a real implementation, we would read: factory-cli/orchestrator/prompts/${taskId}.ts
  // For the prototype, we'll ask the LLM to "Infer" the prompt if we can't find it, or assume the user passes it.
  
  // Mocking the "Current Prompt" for the prototype since we don't have easy file access to the generated S4 prompt string without running the engine.
  // In the real flow, 'planner generate' should save the USED prompts to a file alongside the plan.
  const mockCurrentPrompt = `Extract clinical signals from the text.`; 

  const result = await optimizePrompt(report, mockCurrentPrompt, taskId);

  console.log(`\n💡 ANALYSIS: ${result.analysis}`);
  console.log(`\n✨ OPTIMIZED PROMPT:\n${result.new_prompt}`);
  
  // In the future: Write this back to the prompt registry.
  const outPath = path.join(path.dirname(reportPath), 'optimized_prompt.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Saved to: ${outPath}`);
}

main().catch(console.error);
