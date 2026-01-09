import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { ClinicalEvalEngine } from '../validation/runner';
import { AggregateReport } from '../validation/types';
import { loadEnv, getOpenAIClientOptions } from '../../utils/envConfig';
import { resolveMetricPath, Paths } from '../../utils/pathConfig';

loadEnv();

const args = process.argv.slice(2);
const metricFlagIdx = args.indexOf('--metric');
const CONCERN_ID = metricFlagIdx !== -1 ? args[metricFlagIdx + 1] : 'I32a';

const loopsFlagIdx = args.indexOf('--loops');
const loopArg = loopsFlagIdx !== -1 ? args[loopsFlagIdx + 1] : null;
const MAX_LOOPS = loopArg ? parseInt(loopArg, 10) : 3;

const taskFlagIdx = args.indexOf('--task');
const TASK_TYPE = taskFlagIdx !== -1 ? args[taskFlagIdx + 1] : 'signal_enrichment';

console.log(`🚀 Optimizer Loop for: ${CONCERN_ID} | Task: ${TASK_TYPE} | Max Loops: ${MAX_LOOPS}`);

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

// Initial Prompt (Baseline) - Load from Registry using standard path utilities
const templateFile = path.join(Paths.sharedPrompts(metricPath.framework, metricPath.specialty || undefined), `${TASK_TYPE}.md`);

let BASELINE_PROMPT = `Analyze the encounter context and extract clinical signals.`;
if (fs.existsSync(templateFile)) {
    console.log(`   Loaded Baseline from Registry: ${templateFile}`);
    BASELINE_PROMPT = fs.readFileSync(templateFile, 'utf-8');
} else {
    console.warn(`⚠️  Baseline template not found at ${templateFile}. Using generic fallback.`);
}

const client = new OpenAI(getOpenAIClientOptions());

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
    
    const runner = new ClinicalEvalEngine(CONCERN_ID, PLAN_PATH, TEST_DATA_DIR);
    console.log(`   🚀 In the mission of improving your ${TASK_TYPE} prompt by testing against generated testcases...`);
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

        

        // Display Failure Analysis Matrix

        const topFailures = Object.entries(report.failures_by_type)

            .sort((a, b) => b[1].count - a[1].count)

            .slice(0, 3);

        

        if (topFailures.length > 0) {

            console.log(`\n   🔍 FAILURE ANALYSIS MATRIX:`);

            topFailures.forEach(([pattern, data], idx) => {

                const char = idx === topFailures.length - 1 ? '└─' : '├─';

                // Clean up pattern name

                const cleanPattern = pattern.replace('signals:', '').replace('summary:', '').slice(0, 50);

                console.log(`   ${char} Pattern: "${cleanPattern}" (x${data.count})`);

            });

        }

    

        const refinement = await optimizePrompt(currentPrompt, report, scoreDelta, lastRecall > 0);
        
        const analysisText = String(refinement.analysis || 'No analysis provided');
        const improvementsText = String(refinement.expected_improvements || 'None provided');

        console.log(`\n   💡 AI STRATEGY: ${analysisText.slice(0, 150)}...`);
        console.log(`   🔧 PRESCRIPTION: ${improvementsText}`);
        const newPrompt = refinement.new_prompt;

        appendToHistory({
            version: currentLoopVersion + 1,
            timestamp: new Date().toISOString(),
            prompt_text: newPrompt,
            analysis: analysisText,
            changes: improvementsText,
            metrics: {} 
        });

    currentPrompt = newPrompt;
    lastRecall = avgRecall;
  }

  // ============================================
  // FINAL VISUAL SUMMARY
  // ============================================
  if (fs.existsSync(HISTORY_FILE)) {
    const finalHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    const v0 = finalHistory[0];
    const current = finalHistory[finalHistory.length - 1];
    const previous = finalHistory.length > 1 ? finalHistory[finalHistory.length - 2] : null;

    console.log(`\n======================================================================`);
    console.log(`🚀 FINAL PROMPT EVOLUTION: ${CONCERN_ID} | ${TASK_TYPE}`);
    console.log(`======================================================================`);

    console.log(`\n[V0 BASELINE] Score: ${(v0.metrics?.signal_recall * 100 || 0).toFixed(1)}%`);
    console.log(`──────────────────────────────────────────────────────────────────────`);
    console.log(v0.prompt_text);

    if (previous && previous.version !== v0.version) {
        console.log(`\n[LAST VERSION v${previous.version}] Score: ${(previous.metrics?.signal_recall * 100 || 0).toFixed(1)}%`);
        console.log(`──────────────────────────────────────────────────────────────────────`);
        console.log(previous.prompt_text);
    }

    console.log(`\n[CURRENT IMPROVED v${current.version}] Score: ${(current.metrics?.signal_recall * 100 || 0).toFixed(1)}%`);
    console.log(`──────────────────────────────────────────────────────────────────────`);
    console.log(current.prompt_text);
    
    console.log(`\n✅ Summary Complete. Best candidate is version v${current.version}.`);
    console.log(`======================================================================\n`);
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

  const metaPrompt = `Expert Prompt Engineer mode. Improving prompt for ${CONCERN_ID}.\n\nSIGNALS:\n${SIGNAL_CONTEXT}\n\nCURRENT:\n${currentPrompt}\n\nFAILURES:\n${evidenceBlock}\n\nGOAL: Improve signal recall.\n${dynamicInstruction}\nOutput JSON with "analysis", "new_prompt", "expected_improvements".`;
  
  const modelToUse = useFallbackModel ? OPTIMIZER_FALLBACK_MODEL : OPTIMIZER_MODEL;
  
  const response = await client.chat.completions.create({
    model: modelToUse, 
    messages: [{ role: 'user', content: metaPrompt }], 
    max_tokens: OPTIMIZER_MAX_TOKENS,
    response_format: { type: 'json_object' } 
  });
  
  return JSON.parse(response.choices[0].message.content || "{}");
}

runFlywheel(MAX_LOOPS).catch(console.error);
