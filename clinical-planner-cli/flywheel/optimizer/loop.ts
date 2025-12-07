import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { I25BatchRunner } from '../validation/runner';
import { AggregateReport } from '../validation/types';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Configuration
const CONCERN_ID = 'I25';
// Using Golden Set for efficient testing
const TEST_DATA_DIR = path.join(__dirname, '../../data/flywheel/testcases');
const PLAN_PATH = path.join(TEST_DATA_DIR, 'golden_set.json');
const REPORT_DIR = path.join(__dirname, '../../data/flywheel/reports/refinery');
const PROMPT_HISTORY_DIR = path.join(__dirname, '../../data/flywheel/prompts');
const HISTORY_FILE = path.join(PROMPT_HISTORY_DIR, 'prompt_history_lean.json');
const SIGNALS_PATH = path.join(__dirname, '../../data/orthopedics/signals.json');

// Ensure dirs
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
if (!fs.existsSync(PROMPT_HISTORY_DIR)) fs.mkdirSync(PROMPT_HISTORY_DIR, { recursive: true });

// Load Signals for Dynamic Prompting
let SIGNAL_CONTEXT = "";
if (fs.existsSync(SIGNALS_PATH)) {
  const signals = JSON.parse(fs.readFileSync(SIGNALS_PATH, 'utf-8'));
  SIGNAL_CONTEXT = Object.entries(signals)
    .map(([category, items]) => `${category.toUpperCase()}:\n- ${(items as string[]).join('\n- ')}`)
    .join('\n\n');
} else {
  console.warn("⚠️ Signals file not found. Using empty context.");
}

// Initial Prompt (Baseline) - Lean & Focused
const BASELINE_PROMPT = `Role: Pediatric Clinical Signal Extractor

Task:
Given the encounter context below, generate ONLY clinical signals.
Do NOT generate criteria, surveillance logic, summaries, ranking, metadata, or follow-up questions.

OUTPUT FORMAT (JSON):
{
  "signal_groups": [
    {
      "group_id": "rule_in | rule_out | delay_drivers | preventability | documentation_gaps",
      "signals": [
        {
          "signal_id": "<string>",
          "description": "<short clinical description>",
          "provenance": "<exact text snippet that supports this signal>"
        }
      ]
    }
  ]
}

Rules:
- Every signal MUST have provenance.
- Use only domain-relevant signals (I25 Supracondylar Humerus Fracture).
- No hallucinated timestamps.
- No criteria, no plan metadata, no classification.
`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runFlywheel(maxLoops: number = 3) {
  console.log(`🏎️  Starting Prompt Refinery Flywheel for ${CONCERN_ID}`);
  console.log(`   Max Loops: ${maxLoops}`);

  let currentPrompt = BASELINE_PROMPT;
  let version = 1;
  let lastRecall = 0; // Track previous score
  
  // Resume from history if exists
  let history: any[] = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      console.log(`   Resuming from history version v${lastEntry.version} (${lastEntry.timestamp})`);
      currentPrompt = lastEntry.prompt_text;
      version = lastEntry.version + 1;
      lastRecall = lastEntry.metrics?.signal_recall || 0;
    }
  } else {
    // Seed history with baseline
    appendToHistory({
        version: 1,
        timestamp: new Date().toISOString(),
        prompt_text: BASELINE_PROMPT,
        analysis: "Initial baseline",
        changes: "N/A",
        metrics: { signal_recall: 0 }
    });
  }

  for (let loop = 1; loop <= maxLoops; loop++) {
    const currentLoopVersion = version + loop - 1;
    console.log(`
🔄 Loop ${loop}/${maxLoops} (Version v${currentLoopVersion})`);
    
    console.log(`   💰 Estimated cost: $0.03. Proceeding...`);

    // 2. Run Validation
    const runner = new I25BatchRunner(CONCERN_ID, PLAN_PATH, TEST_DATA_DIR);
    console.log(`   🏃 Running Batch Validation...`);
    
    const report = await runner.run(currentPrompt);
    
    // Save Report
    const reportPath = path.join(REPORT_DIR, `report_v${currentLoopVersion}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   📊 Report saved to ${reportPath}`);

    // 3. Analyze Score
    const totalSignals = report.raw_results.reduce((sum, r) => sum + (r.scores.signals_recall || 0), 0);
    const avgRecall = totalSignals / report.total_cases;
    console.log(`   🎯 Average Signal Recall: ${(avgRecall * 100).toFixed(1)}%`);

    // Calculate Delta
    const scoreDelta = avgRecall - lastRecall;
    if (loop > 1 || (version > 1 && loop === 1)) {
        const direction = scoreDelta >= 0 ? "📈 Improved/Stable" : "📉 REGRESSION";
        console.log(`   ${direction} by ${(scoreDelta * 100).toFixed(1)}%`);
    }

    // Update history with metrics for CURRENT prompt
    updateHistoryMetrics(currentLoopVersion, { signal_recall: avgRecall });

    if (avgRecall > 0.95) {
      console.log(`   🎉 Target Accuracy Reached! Stopping.`);
      break;
    }

    if (loop === maxLoops) {
      console.log(`   🛑 Max loops reached.`);
      break;
    }

    // 4. Auto-Suggest Next Prompt (The Refinery)
    console.log(`   🧠 Analyzing failures and refining prompt...`);
    
    // Pass context for turbo-charged optimization
    const refinement = await optimizePrompt(currentPrompt, report, scoreDelta, lastRecall > 0);
    
    console.log(`   💡 Analysis: ${refinement.analysis}`);
    console.log(`   🔧 Proposed Changes: ${refinement.expected_improvements}`);
    const newPrompt = refinement.new_prompt;

    // Append NEW prompt to history
    appendToHistory({
        version: currentLoopVersion + 1,
        timestamp: new Date().toISOString(),
        prompt_text: newPrompt,
        analysis: refinement.analysis,
        changes: refinement.expected_improvements,
        metrics: {} // To be filled in next loop
    });

    currentPrompt = newPrompt;
    lastRecall = avgRecall;
    console.log(`   💾 History updated with v${currentLoopVersion + 1}`);
  }
}

function appendToHistory(entry: any) {
    let history: any[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
    history.push(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function updateHistoryMetrics(version: number, metrics: any) {
    if (!fs.existsSync(HISTORY_FILE)) return;
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    const entryIndex = history.findIndex((h: any) => h.version === version);
    if (entryIndex !== -1) {
        history[entryIndex].metrics = metrics;
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    }
}

async function optimizePrompt(
  currentPrompt: string, 
  report: AggregateReport, 
  scoreDelta: number,
  hasHistory: boolean
): Promise<any> {
  
  // Turbo-Charge: Extract detailed failure examples
  const topFailures = Object.entries(report.failures_by_type)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3); // Top 3 failure types

  let evidenceBlock = "";
  
  topFailures.forEach(([failType, data]) => {
    evidenceBlock += `\nFAILURE TYPE: ${failType} (Count: ${data.count})\n`;
    // Find a specific case for this failure
    const caseId = data.sample_test_ids[0];
    const result = report.raw_results.find(r => r.test_id === caseId);
    
    if (result) {
      evidenceBlock += `  - Example Case: ${caseId}\n`;
      // evidenceBlock += `  - Context: ${result.scenario_label || "N/A"}\n`;
      evidenceBlock += `  - Patient Text Snippet: "...${result.engine_output.raw_input.slice(0, 300).replace(/\n/g, ' ')}..."\n`;
      evidenceBlock += `  - Validator Error: ${failType}\n`;
    }
  });

  // Dynamic Instructions based on Regression
  let dynamicInstruction = "";
  if (hasHistory && scoreDelta < -0.02) { // Regression > 2%
    dynamicInstruction = `
🚨 REGRESSION DETECTED! 
The previous prompt performed BETTER. The score dropped by ${(Math.abs(scoreDelta) * 100).toFixed(1)}%.
1. CRITICALLY ANALYZE why your last change hurt performance.
2. Revert the specific language that caused this confusion.
3. Try a different, gentler approach to fix the remaining errors.
`;
  } else {
    dynamicInstruction = `
1. Analyze the "FAILURE EVIDENCE" above. Look at the Text Snippet vs the Error.
2. Why did the current prompt miss this? (Is it looking for the wrong keywords? Is the instruction too vague?)
3. Generate a NEW System Prompt that fixes these specific gaps.
`;
  }

  const metaPrompt = `You are an expert Prompt Engineer for Clinical AI.
Your goal is to improve a System Prompt based on concrete failure evidence.

TARGET CONCERN: I25 (Supracondylar Humerus Fracture)

REFERENCE SIGNALS (Ground Truth):
${SIGNAL_CONTEXT}

CURRENT PROMPT:
${currentPrompt}

FAILURE EVIDENCE (Real cases where extraction failed):
${evidenceBlock}

INSTRUCTIONS:
${dynamicInstruction}
4. Output strictly valid JSON.

OUTPUT JSON:
{
  "analysis": "Detailed thought process on why failures occurred (and why regression happened, if applicable).",
  "new_prompt": "The full updated prompt text.",
  "expected_improvements": "What specific errors this should fix."
}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: metaPrompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

runFlywheel(3).catch(console.error);
