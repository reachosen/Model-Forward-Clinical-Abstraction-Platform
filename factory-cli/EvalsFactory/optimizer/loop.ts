import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { BatchRunner } from '../validation/runner';
import { AggregateReport } from '../validation/types';
import { resolveMetricPath } from '../../utils/pathConfig';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const args = process.argv.slice(2);
const metricFlagIdx = args.indexOf('--metric');
const CONCERN_ID = metricFlagIdx !== -1 ? args[metricFlagIdx + 1] : 'I32a';

console.log(`🚀 Optimizer Loop for: ${CONCERN_ID}`);

const metricPath = resolveMetricPath(CONCERN_ID);
const TEST_DATA_DIR = path.join(__dirname, `../../domains_registry/${metricPath.framework}/${metricPath.specialty}/metrics/${CONCERN_ID}/tests/testcases`);
const planDirName = `${CONCERN_ID.toLowerCase()}-${(metricPath.specialty || 'General').toLowerCase()}`;
const PLAN_PATH = path.join(__dirname, `../../output/${planDirName}/lean_plan.json`);

const REPORT_DIR = path.join(__dirname, '../../data/flywheel/reports/refinery');
const PROMPT_HISTORY_DIR = path.join(__dirname, '../../data/flywheel/prompts');
const HISTORY_FILE = path.join(PROMPT_HISTORY_DIR, `prompt_history_${CONCERN_ID}.json`);
const SIGNALS_PATH = path.join(__dirname, `../../domains_registry/${metricPath.framework}/${metricPath.specialty}/metrics/${CONCERN_ID}/definitions/signal_groups.json`);

// Ensure dirs
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
if (!fs.existsSync(PROMPT_HISTORY_DIR)) fs.mkdirSync(PROMPT_HISTORY_DIR, { recursive: true });

// Load Signals for Dynamic Prompting
let SIGNAL_CONTEXT = "";
if (fs.existsSync(SIGNALS_PATH)) {
  const signals = JSON.parse(fs.readFileSync(SIGNALS_PATH, 'utf-8'));
  const signalGroups = signals.signal_groups || signals;
  SIGNAL_CONTEXT = Object.entries(signalGroups)
    .map(([category, items]: [string, any]) => {
        const signalList = Array.isArray(items) ? items : (items.signals || []);
        return `${category.toUpperCase()}:\n- ${signalList.map((s: any) => s.description || s).join('\n- ')}`;
    })
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
- Use only domain-relevant signals.
- No hallucinated timestamps.
- No criteria, no plan metadata, no classification.
`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OPTIMIZER_MODEL = process.env.OPTIMIZER_MODEL || 'gpt-4o-mini';
const OPTIMIZER_FALLBACK_MODEL = process.env.OPTIMIZER_FALLBACK_MODEL || 'gpt-4o';
const OPTIMIZER_MAX_TOKENS = parseInt(process.env.OPTIMIZER_MAX_TOKENS || '2000', 10);
const MAX_EVIDENCE_TOKENS = parseInt(process.env.OPTIMIZER_MAX_EVIDENCE_TOKENS || '600', 10);

function summarizeFailureEvidence(
  topFailures: [string, { count: number; sample_test_ids: string[] }][],
  report: AggregateReport
): string {
  let evidenceBlock = "";
  let currentTokenEstimate = 0;
  const limitedFailures = topFailures.slice(0, 2);

  limitedFailures.forEach(([failType, data]) => {
    if (currentTokenEstimate >= MAX_EVIDENCE_TOKENS) return;
    evidenceBlock += `\nFAILURE: ${failType} (x${data.count})\n`;
    currentTokenEstimate += 15;
    const caseId = data.sample_test_ids[0];
    const result = report.raw_results.find(r => r.test_id === caseId);
    if (result) {
      const truncatedText = result.engine_output.raw_input.slice(0, 150).replace(/\n/g, ' ');
      evidenceBlock += `  Case: ${caseId}\n`;
      evidenceBlock += `  Text: "...${truncatedText}..."\n`;
      currentTokenEstimate += 50;
    }
  });
  return evidenceBlock;
}

async function runFlywheel(maxLoops: number = 3) {
  console.log(`🏎️  Starting Prompt Refinery Flywheel for ${CONCERN_ID}`);
  let currentPrompt = BASELINE_PROMPT;
  let version = 1;
  let lastRecall = 0; 
  
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
    
    const runner = new BatchRunner(CONCERN_ID, PLAN_PATH, TEST_DATA_DIR);
    console.log(`   🏃 Running Batch Validation...`);
    const report = await runner.run(currentPrompt);
    
    const reportPath = path.join(REPORT_DIR, `report_${CONCERN_ID}_v${currentLoopVersion}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   📊 Report saved to ${reportPath}`);

    const totalSignals = report.raw_results.reduce((sum: number, r: any) => sum + (r.scores.signals_recall || 0), 0);
    const avgRecall = totalSignals / report.total_cases;
    console.log(`   🎯 Average Signal Recall: ${(avgRecall * 100).toFixed(1)}%`);

    const scoreDelta = avgRecall - lastRecall;
    if (loop > 1 || (version > 1 && loop === 1)) {
        const direction = scoreDelta >= 0 ? "📈 Improved/Stable" : "📉 REGRESSION";
        console.log(`   ${direction} by ${(scoreDelta * 100).toFixed(1)}%`);
    }

    updateHistoryMetrics(currentLoopVersion, { signal_recall: avgRecall });

    if (avgRecall > 0.95) {
      console.log(`   🎉 Target Accuracy Reached! Stopping.`);
      break;
    }
    if (loop === maxLoops) {
      console.log(`   🛑 Max loops reached.`);
      break;
    }

    console.log(`   🧠 Analyzing failures and refining prompt...`);
    const refinement = await optimizePrompt(currentPrompt, report, scoreDelta, lastRecall > 0);
    console.log(`   💡 Analysis: ${refinement.analysis}`);
    const newPrompt = refinement.new_prompt;

    appendToHistory({
        version: currentLoopVersion + 1,
        timestamp: new Date().toISOString(),
        prompt_text: newPrompt,
        analysis: refinement.analysis,
        changes: refinement.expected_improvements,
        metrics: {} 
    });

    currentPrompt = newPrompt;
    lastRecall = avgRecall;
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

async function optimizePrompt(currentPrompt: string, report: AggregateReport, scoreDelta: number, hasHistory: boolean, useFallbackModel: boolean = false): Promise<any> {
  const topFailures = Object.entries(report.failures_by_type).sort((a, b) => b[1].count - a[1].count).slice(0, 2);
  const evidenceBlock = summarizeFailureEvidence(topFailures, report);
  let dynamicInstruction = "";
  if (hasHistory && scoreDelta < -0.02) {
    dynamicInstruction = `\n🚨 REGRESSION DETECTED! \nThe previous prompt performed BETTER.\n1. ANALYZE regression.\n2. Revert bad changes.\n3. Try new approach.\n`;
  } else {
    dynamicInstruction = `\n1. Analyze FAILURE EVIDENCE.\n2. Fix gaps.\n3. Generate NEW System Prompt.\n`;
  }

  const metaPrompt = `Expert Prompt Engineer mode. Improving prompt for ${CONCERN_ID}.\n\nSIGNALS:\n${SIGNAL_CONTEXT}\n\nCURRENT:\n${currentPrompt}\n\nFAILURES:\n${evidenceBlock}\n\nGOAL: Improve signal recall.\n${dynamicInstruction}\nOutput JSON with