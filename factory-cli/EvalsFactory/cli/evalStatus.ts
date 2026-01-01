/**
 * eval:status CLI Command - QA Scorecard
 *
 * Shows the current state of eval workflow for a metric to help QA
 * understand what exists and where to resume.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  Paths,
  resolveMetricPath,
  MetricPath,
} from '../../utils/pathConfig';
import { BatchStrategy } from '../dataset/BatchStrategy';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';

// ============================================ 
// Types
// ============================================ 

interface StageStatus {
  exists: boolean;
  details: string[];
  lastModified?: Date;
  count?: number;
}

interface SemanticStatus {
  exists: boolean;
  isSpecialized: boolean;
  metric?: any;
  coverage: {
    signalGroupsCovered: string[];
    signalGroupsMissing: string[];
    archetypesCovered: string[];
    archetypesMissing: string[];
  };
}

interface MetricStatus {
  metric: string;
  framework: string;
  specialty?: string;
  semantic: SemanticStatus;
  stages: {
    strategy: StageStatus;
    testCases: StageStatus & { fileDetails?: string[] };
    evalRuns: StageStatus;
    prompts: StageStatus;
    journal: StageStatus;
  };
}

// ============================================ 
// Helpers
// ============================================ 

function getFileStats(filePath: string): { exists: boolean; mtime?: Date } {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, mtime: stats.mtime };
  } catch {
    return { exists: false };
  }
}

function loadBatchStrategy(metricId: string): BatchStrategy | undefined {
  const registryPath = path.join(Paths.cliRoot(), 'EvalsFactory/dataset/batch_strategies.metadata.json');
  try {
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      return registry.strategies?.find((s: any) => s.metric_id === metricId);
    }
  } catch {}
  return undefined;
}

function getSemanticStatus(metricId: string, metricPath: MetricPath, strategy?: BatchStrategy): SemanticStatus {
  const domain = metricPath.specialty || metricPath.framework;
  const loader = SemanticPacketLoader.getInstance();
  const packet = loader.load(domain, metricId);
  
  const registryPath = path.join(__dirname, '../../domains_registry/USNWR');
  const usnwrSpecialty = domain.replace(/ /g, '_');
  const defPath = path.join(registryPath, usnwrSpecialty, 'metrics', metricId, 'definitions', 'signal_groups.json');
  const isSpecialized = fs.existsSync(defPath);

  if (!packet || !packet.metrics[metricId]) {
    return { exists: false, isSpecialized: false, coverage: { signalGroupsCovered: [], signalGroupsMissing: [], archetypesCovered: [], archetypesMissing: [] } };
  }

  const metric = packet.metrics[metricId];
  const expectedArchetypes = metric.archetypes || [];
  const expectedSignals = metric.signal_groups || [];

  const strategyArchetypes = new Set<string>();
  if (strategy?.task_scenarios) {
    for (const config of Object.values(strategy.task_scenarios)) {
      for (const s of config.scenarios) { if (s.archetype) strategyArchetypes.add(s.archetype); }
    }
  }

  const archetypesCovered = expectedArchetypes.filter(a => strategyArchetypes.has(a));
  const archetypesMissing = expectedArchetypes.filter(a => !strategyArchetypes.has(a));

  // Signal Coverage Heuristic
  let allScenarios: any[] = [];
  if (strategy?.task_scenarios) {
    for (const config of Object.values(strategy.task_scenarios)) {
      allScenarios = [...allScenarios, ...(config as any).scenarios];
    }
  }
  const scenarioText = allScenarios.map(s => s.description.toLowerCase()).join(' ');
  const GROUP_ID_MAP: Record<string, string> = {
    'infection_prevention': 'infection_risks',
    'surgical_bundle_compliance': 'bundle_compliance',
    'outcome_monitoring': 'outcome_risks',
    'readmission_prevention': 'readmission_risks'
  };

  const signalGroupsCovered = expectedSignals.filter((sg: string) => {
    const normalized = sg.toLowerCase();
    const matches = allScenarios.some(s => {
        const sId = s.description.toLowerCase().replace(/\s+/g, '_');
        return sId.includes(normalized) || Object.entries(GROUP_ID_MAP).some(([alias, target]) => 
            target === normalized && s.description.toLowerCase().includes(alias.replace(/_/g, ' '))
        );
    });
    if (matches) return true;
    const parts = normalized.replace(/_/g, ' ').split(' ');
    return parts.every((p: string) => p.length > 3 && scenarioText.includes(p));
  });
  
  const signalGroupsMissing = expectedSignals.filter((sg: string) => !signalGroupsCovered.includes(sg));

  return { exists: true, isSpecialized, metric, coverage: { signalGroupsCovered, signalGroupsMissing, archetypesCovered, archetypesMissing } };
}

function getMetricStatus(metricId: string): MetricStatus {
  let metricPath: MetricPath;
  try {
    metricPath = resolveMetricPath(metricId);
  } catch {
    metricPath = { framework: 'USNWR', specialty: 'Orthopedics', metric: metricId };
  }

  const strategy = loadBatchStrategy(metricId);
  const semantic = getSemanticStatus(metricId, metricPath, strategy);
  
  const testcasesDir = Paths.metricTestcases(metricPath);
  let tcCount = 0;
  const fileDetails: string[] = [];
  let batchCount = 0;
  let goldenCount = 0;

  if (fs.existsSync(testcasesDir)) {
      const files = fs.readdirSync(testcasesDir).filter(f => f.endsWith('.json'));
      files.forEach(f => {
          try {
              const data = JSON.parse(fs.readFileSync(path.join(testcasesDir, f), 'utf-8'));
              const count = data.test_cases?.length || 0;
              tcCount += count;
              if (f.includes('batch')) batchCount++;
              if (f.includes('golden')) goldenCount++;
              fileDetails.push(`${f} (${count} cases)`);
          } catch {}
      });
  }

  const journalPath = path.join(Paths.cliRoot(), 'domains_registry', metricPath.framework === 'HAC' ? 'HAC' : `USNWR/${metricPath.specialty}`, '_shared', 'eval_journal.md');
  const journalStats = getFileStats(journalPath);
  const journalDetails: string[] = [];
  let journalCount = 0;
  if (journalStats.exists) {
      const content = fs.readFileSync(journalPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.startsWith('## '));
      journalCount = lines.length;
      if (lines.length > 0) journalDetails.push('Last entry: ' + lines[lines.length - 1]);
  }

  const tcDetails = [
      `Total: ${tcCount} cases across ${batchCount} batches`,
      goldenCount > 0 ? `Golden sets: ${goldenCount}` : 'No golden sets found'
  ];

  return {
    metric: metricId,
    framework: metricPath.framework,
    specialty: metricPath.specialty,
    semantic,
    stages: {
      strategy: { exists: !!strategy, details: [], count: strategy?.task_scenarios ? Object.keys(strategy.task_scenarios).length : 0 },
      testCases: { exists: tcCount > 0, details: tcDetails, count: tcCount, fileDetails },
      evalRuns: { exists: journalCount > 0, details: [] },
      prompts: { exists: true, details: [] },
      journal: { exists: journalStats.exists, details: journalDetails, count: journalCount }
    }
  };
}

// ============================================ 
// UI Components
// ============================================ 

function getVisualWidth(str: string): number {
    return Array.from(str).reduce((acc, char) => {
        if (/[^\x00-\x7F]/.test(char)) {
            if (/[✓✗–—]/.test(char)) return acc + 1;
            return acc + 2;
        }
        return acc + 1;
    }, 0);
}

function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    paragraphs.forEach(p => {
        const words = p.split(' ');
        let currentLine = '';
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (getVisualWidth(testLine) <= maxWidth) { currentLine = testLine; } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
                while (getVisualWidth(currentLine) > maxWidth) {
                    let fitCount = 0; let testWidth = 0;
                    for (const char of currentLine) {
                        const charWidth = getVisualWidth(char);
                        if (testWidth + charWidth > maxWidth) break;
                        testWidth += charWidth; fitCount++;
                    }
                    lines.push(currentLine.slice(0, fitCount));
                    currentLine = currentLine.slice(fitCount);
                }
            }
        });
        if (currentLine) lines.push(currentLine);
    });
    return lines;
}

function printBoxLine(content: string, indent: string = ''): void {
    const innerWidth = 80;
    if (content.includes('───')) {
        console.log(`║  ${'─'.repeat(innerWidth)}  ║`);
        return;
    }
    const wrappedLines = wrapText(content, innerWidth);
    wrappedLines.forEach((line, idx) => {
        const lineToPrint = idx > 0 ? `${indent}${line.trim()}` : line;
        const visualWidth = getVisualWidth(lineToPrint);
        const padding = Math.max(0, innerWidth - visualWidth);
        console.log(`║  ${lineToPrint}${' '.repeat(padding)}  ║`);
    });
}

function printMetricStatus(status: MetricStatus): void {
  const { metric, framework, specialty, semantic, stages } = status;
  const batchStrategy = loadBatchStrategy(metric);

  console.log('');
  console.log('╔' + '═'.repeat(84) + '╗');
  printBoxLine(`QA SCORECARD: ${metric} (${specialty || framework})`);
  console.log('╠' + '═'.repeat(84) + '╣');

  // 1. Semantic BIOS Overlay
  printBoxLine(semantic.isSpecialized ? '⭐⭐ TIER 2: SPECIALIZED (Semantic BIOS Overlay)' : '⭐ TIER 1: DOMAIN DEFAULT');
  printBoxLine('───');

  if (semantic.exists && semantic.metric) {
    printBoxLine(`✅ ${semantic.metric.metric_name}`, '      ');
    const sgCount = (semantic.metric.expected_signal_groups || semantic.metric.signal_groups || []).length;
    const arCount = (semantic.metric.archetypes || []).length;
    printBoxLine(`   Signals: ${semantic.coverage.signalGroupsCovered.length}/${sgCount} groups | Lenses: ${semantic.coverage.archetypesCovered.length}/${arCount}`);
    
    const primary = semantic.metric.primary_archetype || (semantic.metric.archetypes && semantic.metric.archetypes[0]);
    (semantic.metric.archetypes || []).forEach((arch: string) => {
        const isCovered = semantic.coverage.archetypesCovered.includes(arch);
        const icon = isCovered ? '✓' : '✗';
        const label = arch === primary ? '[Primary]' : '[Support]';
        printBoxLine(`     ${icon} ${label.padEnd(11)} ${arch}`);
    });
  } else {
    printBoxLine(`❌ NO SEMANTIC CONTEXT`);
  }

  // 2. Test Plan Matrix
  console.log('║                                                                    ║');
  printBoxLine('TEST PLAN (Intelligence Lanes)');
  printBoxLine('───');

  if (batchStrategy?.task_scenarios) {
    const taskNames: Record<string, string> = { 'signal_enrichment': 'Signal Enrichment', 'event_summary': 'Event Summary', 'followup_questions': 'Followup Questions', 'clinical_review_plan': 'Clinical Review Plan' };
    const allScenarios = Object.values(batchStrategy.task_scenarios).flatMap((ts: any) => ts.scenarios);
    const doubtCount = allScenarios.filter((s: any) => s.type === 'doubt').length;
    const actualDRPct = allScenarios.length > 0 ? Math.round((doubtCount / allScenarios.length) * 100) : 0;
    
    printBoxLine(`${allScenarios.length} Scenarios | Doubt Ratio: ${actualDRPct}%`);
    Object.keys(batchStrategy.task_scenarios).forEach((taskId) => {
        const scenarios = (batchStrategy.task_scenarios as any)[taskId].scenarios;
        const p = scenarios.filter((s: any) => s.type === 'pass').length;
        const f = scenarios.filter((s: any) => s.type === 'fail').length;
        const d = scenarios.filter((s: any) => s.type === 'doubt').length;
        printBoxLine(`   ✓ ${(taskNames[taskId] || taskId).padEnd(30)} [${p}P | ${f}F | ${d}D]`);
    });
  }

  // 3. Test Assets
  console.log('║                                                                    ║');
  printBoxLine('TEST ASSETS (Cases on Disk)');
  printBoxLine('───');
  
  const allScenarios = batchStrategy?.task_scenarios ? Object.values(batchStrategy.task_scenarios).flatMap((ts: any) => ts.scenarios) : [];
  const targetCount = allScenarios.length || 52;
  const currentCount = stages.testCases.count || 0;
  const quotaMet = currentCount >= targetCount;
  const hasGolden = stages.testCases.fileDetails?.some(f => f.includes('golden'));
  
  printBoxLine(`${quotaMet ? '✅' : '⚠️'} Case Inventory: ${currentCount} cases (${quotaMet ? '✓ Quota Met' : 'Missing ' + (targetCount - currentCount)})`);
  printBoxLine(`${hasGolden ? '🌟' : '⚪'} Golden Set: ${hasGolden ? 'ACTIVE (High-density test set present)' : 'NOT CREATED'}`);
  printBoxLine(`   Strategy Target: ${targetCount} unique scenarios`);
  
  // List details like Golden sets and total batches
  if (stages.testCases.details && stages.testCases.details.length > 0) {
      stages.testCases.details.forEach(d => {
          printBoxLine(`   ${d}`, '     ');
      });
  }

  if (stages.testCases.fileDetails && stages.testCases.fileDetails.length > 0) {
      console.log('║                                                                    ║');
      printBoxLine('Batch Inventory:');
      stages.testCases.fileDetails.forEach((detail: string) => {
          printBoxLine(`   • ${detail}`, '     ');
      });
  } else {
      printBoxLine('   ⚪ No batch files found. Run scaffold to generate.');
  }

  // 4. SAFE Performance
  console.log('║                                                                    ║');
  printBoxLine('SAFE PERFORMANCE (Clinical Journal)');
  printBoxLine('───');
  
  let lastRunDate = 'No history';
  let lastRunResult = 'Pending Evaluation';
  let safeMetrics = '';
  if (stages.journal.exists && stages.journal.details.length > 0) {
      const lastEntryRaw = stages.journal.details[0] || '';
      
      // 1. Try Modern Pipe Format (from safeScore.ts update)
      const parts = lastEntryRaw.replace('Last entry: ## ', '').split('|');
      if (parts.length >= 4) {
          lastRunDate = parts[0].trim();
          lastRunResult = parts[3].trim();
          if (parts[4]) safeMetrics = parts[4].trim();
      } else {
          // 2. Fallback to Legacy Markdown Format (Search within full journal)
          try {
              const journalPath = path.join(Paths.shared(framework, specialty), 'eval_journal.md');
              const journalContent = fs.readFileSync(journalPath, 'utf-8');
              const entries = journalContent.split('---').filter(e => e.includes('## '));
              if (entries.length > 0) {
                  const last = entries[entries.length - 1];
                  const dateMatch = last.match(/## ([\d- :]+)/);
                  const resultMatch = last.match(/\*\*Result:\*\* (.*)/);
                  const scoreMatch = last.match(/\*\*Scores:\*\* (.*)/);
                  
                  if (dateMatch) lastRunDate = dateMatch[1].trim();
                  if (resultMatch) lastRunResult = resultMatch[1].trim();
                  if (scoreMatch) safeMetrics = scoreMatch[1].trim().replace(/ \| /g, ', ');
              }
          } catch (e) {}
      }
  }

  printBoxLine(`Audit Trail: ${stages.journal.count} entries`);
  printBoxLine(`Date:  ${lastRunDate}`);
  printBoxLine(`Stats: ${lastRunResult}`);
  if (safeMetrics) {
      printBoxLine('───');
      printBoxLine(`Scores: ${safeMetrics}`);
  }

  // 4. Prompt Refinery
  console.log('║                                                                    ║');
  printBoxLine('PROMPT REFINERY (Flywheel Trends)');
  printBoxLine('───');
  const usnwrSpec = (specialty || framework).replace(/ /g, '_');
  const refineryPath = path.join(__dirname, `../../domains_registry/USNWR/${usnwrSpec}/metrics/${metric}/refinery`);
  const refineryTasks = ['signal_enrichment', 'event_summary'];
  refineryTasks.forEach(t => {
      const hPath = path.join(refineryPath, `history_${t}.json`);
      if (fs.existsSync(hPath)) {
          try {
              const hData = JSON.parse(fs.readFileSync(hPath, 'utf-8'));
              if (hData.length > 0) {
                  const curr = hData[hData.length - 1];
                  const prev = hData[hData.length - 2];
                  const best = Math.max(...hData.map((h: any) => h.metrics?.signal_recall || 0)) * 100;
                  const taskLabel = t.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
                  
                  let trend = '';
                  if (prev && curr.metrics?.signal_recall && prev.metrics?.signal_recall) {
                      const delta = (curr.metrics.signal_recall - prev.metrics.signal_recall) * 100;
                      trend = delta >= 0 ? `📈 +${delta.toFixed(1)}%` : `📉 ${delta.toFixed(1)}%`;
                  }
                  printBoxLine(`   ✓ ${taskLabel.padEnd(25)} v${curr.version.toString().padEnd(3)} Best: ${best.toFixed(1)}%  ${trend}`);
              }
          } catch (e) {}
      }
  });

  // 5. Action Center
  console.log('║                                                                    ║');
  printBoxLine('ACTION CENTER');
  printBoxLine('───');
  const crVal = parseFloat(safeMetrics.match(/CR: ([\d.]+)/)?.[1] || '0');
  const acVal = parseFloat(safeMetrics.match(/AC: ([\d.]+)/)?.[1] || '0');

  if (lastRunResult === 'Pending Evaluation') {
      printBoxLine(`NEXT: Run SAFE Roundtrip`);
      printBoxLine(`    $ npx ts-node bin/planner.ts safe:score -c ${metric} -b "batch_1"`);
  } else if (crVal < 0.85) {
      printBoxLine(`NEXT: 📈 BOTTLENECK: Signal Recall (CR: ${crVal})`);
      printBoxLine(`    $ npm run plan:optimize -- --concern ${metric} --domain "${specialty}" --task signal_enrichment`);
  } else if (acVal < 0.85) {
      printBoxLine(`NEXT: 📈 BOTTLENECK: Summary Precision (AC: ${acVal})`);
      printBoxLine(`    $ npm run plan:optimize -- --concern ${metric} --domain "${specialty}" --task event_summary`);
  } else {
      printBoxLine(`NEXT: ✅ READY FOR CERTIFICATION`);
      printBoxLine(`    $ npx ts-node SchemaFactory/cli.ts certify --plan output/${metric.toLowerCase()}-${specialty?.toLowerCase()}/plan.json`);
  }
  console.log('╚' + '═'.repeat(84) + '╝');
}

async function runEvalStatus(options: { metric: string }): Promise<void> {
  printMetricStatus(getMetricStatus(options.metric));
}

export const evalStatus = new Command('eval:status').requiredOption('-m, --metric <id>', 'Metric ID').action(async (options) => {
    try { await runEvalStatus(options as any); } catch (e: any) { console.error(e.message); process.exit(1); }
});
