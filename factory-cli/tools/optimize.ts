import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { BatchRunner } from '../EvalsFactory/validation/runner';
import { AggregateReport } from '../EvalsFactory/validation/types';
import { Command } from 'commander';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';
import { detectDomain } from '../utils/domainDetection';
import { Observation } from '../EvalsFactory/refinery/observation/ObservationRecorder';
import { getSignalEnrichmentVariables } from '../shared/context_builders/signalEnrichment';
import { getEventSummaryVariables } from '../shared/context_builders/eventSummary';
import { getFollowupQuestionsVariables } from '../shared/context_builders/followupQuestions';
import { getClinicalReviewPlanVariables } from '../shared/context_builders/clinicalReviewPlan';
import { buildDynamicRoleName, buildMetricFramedPrompt, buildMetricContextString } from '../PlanningFactory/utils/promptBuilder';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const program = new Command();

program
  .name('optimize')
  .description('Run the Prompt Refinery Flywheel to improve prompt performance')
  .requiredOption('-c, --concern <id>', 'Concern ID (e.g., I32a)')
  .option('-t, --task <name>', 'Task type to optimize (signal_enrichment, event_summary, etc.)', 'signal_enrichment')
  .option('-d, --domain <name>', 'Domain name (optional, auto-detected)')
  .option('-l, --loops <n>', 'Number of optimization loops', '3')
  .option('-p, --pattern <regex>', 'Batch file pattern filter (e.g., golden_set)', '.*')
  .option('--api-key <key>', 'OpenAI API key')
  .action(async (options) => {
    const concernId = options.concern;
    const domain = options.domain || detectDomain(concernId);
    const loops = parseInt(options.loops, 10);
    const task = options.task;
    const pattern = options.pattern;
    
    // Authoritatively mute observation logs
    Observation.mute();
    
    await runFlywheel(concernId, domain, task, loops, pattern, options.apiKey);
  });

// C12: Configuration from .env
const OPTIMIZER_MODEL = process.env.OPTIMIZER_MODEL || 'gpt-4o-mini';
const OPTIMIZER_FALLBACK_MODEL = process.env.OPTIMIZER_FALLBACK_MODEL || 'gpt-4o';
const OPTIMIZER_MAX_TOKENS = parseInt(process.env.OPTIMIZER_MAX_TOKENS || '2000', 10);
const MAX_EVIDENCE_TOKENS = parseInt(process.env.OPTIMIZER_MAX_EVIDENCE_TOKENS || '600', 10);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function hydratePrompt(template: string, packet: any, metricId: string, domain: string, task: string): string {
    const metric = packet.metrics[metricId];
    if (!metric) return template;

    // 1. Prepare Prompt Context (Model-Forward Specification)
    const promptContext = {
        domain,
        archetype: metric.primary_archetype || 'Process_Auditor',
        archetypes: metric.archetypes || [metric.primary_archetype || 'Process_Auditor'],
        ortho_context: packet,
        ranking_context: null,
        skeleton: null,
    };

    // 2. Build Variables using Production Builders
    let variables: Record<string, string> = {};
    if (task === 'signal_enrichment') {
        variables = getSignalEnrichmentVariables(promptContext);
    } else if (task === 'event_summary') {
        variables = getEventSummaryVariables(promptContext);
    } else if (task === 'followup_questions') {
        variables = getFollowupQuestionsVariables(promptContext);
    } else if (task === 'clinical_review_plan') {
        variables = getClinicalReviewPlanVariables(promptContext);
    }

    // 3. Interpolate Handlebars
    let hydrated = template;
    for (const [key, value] of Object.entries(variables)) {
        hydrated = hydrated.split(`{{${key}}}`).join(value);
    }

    // 4. Wrap in PRODUCTION SYSTEM CONTEXT & ROLE
    const systemContext = [
        'SYSTEM CONTEXT:',
        'You have access to a shared metric_context JSON object (provided separately) and patient_payload.',
        '',
        'Safety & Guardrails:',
        '- Use ONLY patient_payload for evidence; do not speculate or invent.',
        '- Do NOT teach or generalize; stay on-task.',
        '- Emit strictly valid JSON per the task schema.',
        '- Stay aligned to metric_context; do not introduce other metrics.',
        '- Assume metric_context is available to every task; do not restate it.',
    ].join('\n');

    const metricContextString = buildMetricContextString(packet);
    const roleName = buildDynamicRoleName(task, domain, metric.metric_name, promptContext.archetypes);
    
    const framed = buildMetricFramedPrompt({
        roleName,
        coreBody: hydrated,
        metricContext: metricContextString
    });

    return `${systemContext}\n\n${framed}`;
}

function saveToHistory(file: string, entry: any) {
    let history: any[] = [];
    if (fs.existsSync(file)) {
        history = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    history.push(entry);
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

function updateHistoryMetrics(file: string, version: number, metrics: any) {
    if (!fs.existsSync(file)) return;
    const history = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const entryIndex = history.findIndex((h: any) => h.version === version);
    if (entryIndex !== -1) {
        history[entryIndex].metrics = metrics;
        fs.writeFileSync(file, JSON.stringify(history, null, 2));
    }
}

function generateStrategy(recall: number, delta: number, version: number): string {
    if (recall >= 0.90) {
        return `✅ HIGH PERFORMANCE. v${version} is ready for certification. Run 'npm run plan:certify'.`;
    }
    if (Math.abs(delta) < 0.02) {
        return `⚠️ PLATEAU. The AI is stable but needs new failure evidence. Check if Test Cases match the specialized BIOS.`;
    }
    if (delta < -0.05) {
        return `🔄 CORRECTION CYCLE. A regression occurred, triggering the 'Revert & Simplify' logic. Run one more loop to see the Leapforward.`;
    }
    return `📈 IMPROVING. v${version} is gaining ground. Continue the flywheel to reach > 90%.`;
}

async function runFlywheel(concernId: string, domain: string, task: string, maxLoops: number, pattern: string, apiKey?: string) {
  console.log(`\n🏎️  Starting Prompt Refinery Flywheel`);
  console.log(`   Metric: ${concernId} (${domain})`);
  console.log(`   Task:   ${task.toUpperCase()}`);
  console.log(`   Filter: ${pattern}`);
  console.log(`   Max Loops: ${maxLoops}`);

  const registryRoot = path.resolve(__dirname, '../domains_registry/USNWR');
  const specialty = domain.replace(/ /g, '_');
  const metricDir = path.join(registryRoot, specialty, 'metrics', concernId);
  const refineryDir = path.join(metricDir, 'refinery');
  const historyFile = path.join(refineryDir, `history_${task}.json`);
  const testDataDir = path.join(metricDir, 'tests/testcases');
  const planPath = path.join(__dirname, `../output/${concernId.toLowerCase()}-${specialty}/plan.json`);

  if (!fs.existsSync(refineryDir)) fs.mkdirSync(refineryDir, { recursive: true });

  const loader = SemanticPacketLoader.getInstance();
  const packet = loader.load(domain, concernId);
  if (!packet) {
      console.error(`❌ Could not load semantic packet for ${domain}. Run scaffold first.`);
      process.exit(1);
  }

  let baselinePrompt = "";
  const registryPromptPath = path.join(registryRoot, specialty, '_shared/prompts', `${task}.md`);
  if (fs.existsSync(registryPromptPath)) {
      baselinePrompt = fs.readFileSync(registryPromptPath, 'utf-8');
      console.log(`✅ Loaded initial baseline from registry: ${registryPromptPath}`);
  } else {
      console.warn(`⚠️  Prompt template not found. Using minimal fallback.`);
      baselinePrompt = `Role: Clinical AI for ${task}\nTask: Perform ${task} for ${concernId}.\nOutput must be valid JSON.`;
  }

  let currentPrompt = baselinePrompt;
  let version = 1;
  let lastRecall = 0;
  
  if (fs.existsSync(historyFile)) {
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      console.log(`   Resuming from history version v${lastEntry.version} (${lastEntry.timestamp})`);
      currentPrompt = lastEntry.prompt_text;
      version = lastEntry.version + 1;
      lastRecall = lastEntry.metrics?.signal_recall || 0;
    }
  } else {
    saveToHistory(historyFile, {
        version: 1,
        timestamp: new Date().toISOString(),
        prompt_text: baselinePrompt,
        analysis: "Initial baseline",
        changes: "N/A",
        metrics: { signal_recall: 0 }
    });
  }

  for (let loop = 1; loop <= maxLoops; loop++) {
    const currentLoopVersion = version + loop - 1;
    const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    
    console.log(`\nRUN ${concernId} | ${task.toUpperCase()} | Loop ${loop} | v${currentLoopVersion}`);

    const runner = new BatchRunner(concernId, planPath, testDataDir);
    runner.quiet = true;
    runner.setPattern(pattern); // We need to add this method to BatchRunner
    
    const hydratedPrompt = hydratePrompt(currentPrompt, packet, concernId, domain, task);
    const report = await runner.run(hydratedPrompt);
    
    // 3. Analyze Score based on Task
    let totalScore = 0;
    const metricKey = task === 'event_summary' ? 'summary_coverage' : 'signals_recall';
    const metricLabel = task === 'event_summary' ? 'Summary Coverage' : 'Signal Recall';

    report.raw_results.forEach((r: any) => {
        totalScore += (r.scores[metricKey] || 0);
    });
    
    const avgScore = totalScore / (report.total_cases || 1);
    
    // 3. Aggregate Errors
    const errorsByType: Record<string, number> = {};
    report.raw_results.forEach((r: any) => {
        if (r.error_type) errorsByType[r.error_type] = (errorsByType[r.error_type] || 0) + 1;
    });

    if (Object.keys(errorsByType).length > 0) {
        Object.entries(errorsByType).forEach(([type, count]) => {
            console.log(`ERROR ${type}: ${count}/${report.total_cases} cases affected`);
        });
    } else {
        console.log(`ERROR: None detected (Clean Run)`);
    }

    const scoreDelta = avgScore - lastRecall;
    let trendIcon = "Stable";
    if (loop > 1 || (version > 1 && loop === 1)) {
        trendIcon = scoreDelta >= 0 ? `📈 +${(scoreDelta * 100).toFixed(1)}%` : `📉 ${(scoreDelta * 100).toFixed(1)}%`;
    }

    console.log(`METRICS: ${metricLabel}: ${(avgScore * 100).toFixed(1)}% | Trend: ${trendIcon} | Cases: ${report.total_cases}`);

    if (report.total_cases === 0) {
        console.error("❌ ERROR: No test cases found.");
        break;
    }

        updateHistoryMetrics(historyFile, currentLoopVersion, { signal_recall: avgScore });

    

        if (avgScore > 0.95) {

          console.log(`🎉 TARGET REACHED: v${currentLoopVersion} is optimal.`);

          break;

        }

    

        // Get current loop's changes if any

        const signalContext = Object.entries(packet.signals)

            .map(([cat, items]) => `${cat.toUpperCase()}:\n- ${items.join('\n- ')}`)

            .join('\n\n');

    

        const currentEntry = historyData.find((h: any) => h.version === currentLoopVersion);

        if (currentEntry && currentEntry.changes && currentEntry.changes !== "N/A") {

            console.log(`IMPROVEMENT: ${currentEntry.changes}`);

        }

    

        const refinement = await optimizePrompt(concernId, signalContext, currentPrompt, report, scoreDelta, lastRecall > 0);

        console.log(`DIAGNOSIS:   ${refinement.analysis.slice(0, 150)}${refinement.analysis.length > 150 ? '...' : ''}`);

        console.log(`PROPOSED:    ${refinement.expected_improvements}`);

    

        if (loop === maxLoops) {

          console.log(`\n🛑 MAX LOOPS: Optimization cycle finished.`);

          const finalStrategy = generateStrategy(avgScore, scoreDelta, currentLoopVersion);

          console.log(`STRATEGY:    ${finalStrategy}`);

          break;

        }

        

        const newPrompt = refinement.new_prompt;

        saveToHistory(historyFile, {

            version: currentLoopVersion + 1,

            timestamp: new Date().toISOString(),

            prompt_text: newPrompt,

            analysis: refinement.analysis,

            changes: refinement.expected_improvements,

            metrics: {}

        });

    

        currentPrompt = newPrompt;

        lastRecall = avgScore;

      }

    }

async function optimizePrompt(
  metricId: string,
  signalContext: string,
  currentPrompt: string,
  report: AggregateReport,
  scoreDelta: number,
  hasHistory: boolean
): Promise<any> {

  const misses: Record<string, number> = {};
  report.raw_results.forEach((r: any) => {
      if (r.semantic?.errors) {
          r.semantic.errors.forEach((err: string) => {
              if (err.startsWith('Missing:')) {
                  const signal = err.replace('Missing: ', '');
                  misses[signal] = (misses[signal] || 0) + 1;
              }
          });
      }
  });

  const topMisses = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topFailures = Object.entries(report.failures_by_type).sort((a, b) => b[1].count - a[1].count).slice(0, 2);

    let evidenceBlock = "TOP RECALL MISSES:\n";
    if (topMisses.length > 0) {
        topMisses.forEach(([sig, count]) => { evidenceBlock += `- "${sig}" (${count} cases)\n`; });
    } else {
        evidenceBlock += "- None\n";
    }
  
    evidenceBlock += "\nSTRUCTURAL ERRORS:\n";
    let evidenceCharCount = 0;
    topFailures.forEach(([failType, data]) => {
      // Basic heuristic: limit evidence based on MAX_EVIDENCE_TOKENS (approx 4 chars per token)
      if (evidenceCharCount > MAX_EVIDENCE_TOKENS * 4) return;
  
      if (failType.startsWith('Missing:')) return;
      evidenceBlock += `- ${failType} (x${data.count})\n`;
      const caseId = data.sample_test_ids[0];
      const result = report.raw_results.find(r => r.test_id === caseId);
      if (result) {
        const truncatedText = result.engine_output.raw_input.slice(0, 200);
        evidenceBlock += `  Case: ${caseId}\n  Text: "...${truncatedText}..."\n`;
        evidenceCharCount += truncatedText.length;
      }
    });
  
  const metaPrompt = `You are a Senior Clinical Prompt Engineer.
Optimize the System Prompt for ${metricId} signal extraction to achieve 100% Correct Recall (CR).

REFERENCE SIGNALS (GROUND TRUTH):
${signalContext}

FAILURE EVIDENCE (THE KEY PROBLEM):
${evidenceBlock}

INSTRUCTIONS:
1. Direct Focus: Look at the "TOP RECALL MISSES". These exact phrases are present in the patient record but the AI is failing to extract them.
2. Refinement: Update the "CURRENT PROMPT" to be more explicit about finding these specific clinical concepts.
3. Strict Verbatim: Reiterate that the AI must capture the EXACT verbatim text for these signals.
4. JSON Safety: You must include the word "JSON" and keep the flat array structure: { "signals": ["..."] }.

CURRENT PROMPT TO IMPROVE:
${currentPrompt}

OUTPUT JSON:
{
  "analysis": "Explain why the TOP MISSES occurred (e.g. prompt was too focused on risk instead of compliance) and how you fixed it.",
  "new_prompt": "The full updated system prompt.",
  "expected_improvements": "Specific focus: Capture misses like [list top 2 misses here]."
}
`;
  
    const response = await client.chat.completions.create({
      model: scoreDelta < -0.1 ? OPTIMIZER_FALLBACK_MODEL : OPTIMIZER_MODEL,
      messages: [{ role: 'user', content: metaPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: OPTIMIZER_MAX_TOKENS
    });
  return JSON.parse(response.choices[0].message.content || "{}");
}

program.parse(process.argv);