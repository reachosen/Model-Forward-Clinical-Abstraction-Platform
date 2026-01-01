/**
 * safe:score CLI Command
 *
 * Run SAFE v0.1 evaluation on test batches.
 * Now includes DR (Doubt Recognition) metric for doubt scenarios.
 *
 * Usage:
 *   npx ts-node bin/planner.ts safe:score --concern I25 --batch "I25_batch_*"
 *
 * Exit Codes:
 *   0: All cases Pass
 *   1: At least one Fail
 *   2: No Fails, but at least one Review
 *   3: Configuration/runtime error
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';

import { TestCase, EngineOutput, Archetype } from '../validation/types';
import {
  scoreCase,
  generateBatchReport,
  ScoreCaseOptions,
} from '../validation/safeScorer';

// Lazy import to avoid loading prompts.json at CLI startup
let runI25Engine: ((input: {
  concern_id: string;
  patient_payload: string;
  metadata?: Record<string, any>;
  systemPrompt?: string;
  debug?: boolean;
}) => Promise<EngineOutput>) | null = null;

async function getEngine() {
  if (!runI25Engine) {
    const engine = await import('../validation/engine');
    runI25Engine = engine.runI25Engine;
  }
  return runI25Engine;
}
import {
  printReport,
  writeReport,
  ReportFormat,
} from '../validation/safeReporter';
import { SAFEv0Scorecard } from '../../types/safety';
import { Paths, resolveMetricPath } from '../../utils/pathConfig';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';

// ============================================
// Live Pattern Detection
// ============================================

interface FailurePattern {
  type: 'CR' | 'AH' | 'AC' | 'DR';
  item: string;
  count: number;
  caseIds: string[];
}

class PatternTracker {
  private patterns: Map<string, FailurePattern> = new Map();
  private emittedPatterns: Set<string> = new Set();
  private threshold: number = 3;

  trackFailure(scorecard: SAFEv0Scorecard): string[] {
    const newPatterns: string[] = [];

    // Track CR failures (missing signals)
    const crDetails = scorecard.scores.CR?.details;
    if ((scorecard.scores.CR?.score ?? 0) < 0.8 && crDetails?.missing) {
      for (const signal of crDetails.missing) {
        const key = `CR:${signal}`;
        this.addToPattern(key, 'CR', signal, scorecard.test_id);
        const pattern = this.patterns.get(key)!;
        if (pattern.count >= this.threshold && !this.emittedPatterns.has(key)) {
          this.emittedPatterns.add(key);
          newPatterns.push(`⚠️ Pattern: "${signal}" missing (${pattern.count} cases)`);
        }
      }
    }

    // Track AH failures (violations)
    const ahDetails = scorecard.scores.AH?.details;
    if ((scorecard.scores.AH?.score ?? 0) < 1.0 && ahDetails?.violations) {
      for (const term of ahDetails.violations) {
        const key = `AH:${term}`;
        this.addToPattern(key, 'AH', term, scorecard.test_id);
        const pattern = this.patterns.get(key)!;
        if (pattern.count >= this.threshold && !this.emittedPatterns.has(key)) {
          this.emittedPatterns.add(key);
          newPatterns.push(`⚠️ Pattern: forbidden term "${term}" (${pattern.count} cases)`);
        }
      }
    }

    // Track AC failures (missing phrases)
    const acDetails = scorecard.scores.AC?.details;
    if ((scorecard.scores.AC?.score ?? 0) < 0.8 && acDetails?.missing) {
      for (const phrase of acDetails.missing) {
        const key = `AC:${phrase}`;
        this.addToPattern(key, 'AC', phrase, scorecard.test_id);
        const pattern = this.patterns.get(key)!;
        if (pattern.count >= this.threshold && !this.emittedPatterns.has(key)) {
          this.emittedPatterns.add(key);
          newPatterns.push(`⚠️ Pattern: phrase "${phrase}" missing (${pattern.count} cases)`);
        }
      }
    }

    // Track DR failures (doubt scenario escalation issues)
    if (scorecard.scenario_type === 'doubt' && scorecard.scores.DR) {
      const drDetails = scorecard.scores.DR.details;
      if (scorecard.scores.DR.score < 1.0) {
        const reason = drDetails?.escalated === false
          ? 'failed to escalate doubt'
          : drDetails?.probed_ambiguity === false
            ? 'failed to probe ambiguity'
            : 'DR check failed';
        const key = `DR:${reason}`;
        this.addToPattern(key, 'DR', reason, scorecard.test_id);
        const pattern = this.patterns.get(key)!;
        if (pattern.count >= this.threshold && !this.emittedPatterns.has(key)) {
          this.emittedPatterns.add(key);
          newPatterns.push(`⚠️ Pattern: "${reason}" (${pattern.count} doubt cases)`);
        }
      }
    }

    return newPatterns;
  }

  private addToPattern(key: string, type: 'CR' | 'AH' | 'AC' | 'DR', item: string, caseId: string): void {
    if (!this.patterns.has(key)) {
      this.patterns.set(key, { type, item, count: 0, caseIds: [] });
    }
    const pattern = this.patterns.get(key)!;
    pattern.count++;
    pattern.caseIds.push(caseId);
  }

  getSummary(): FailurePattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count);
  }
}

// ============================================
// Batch File Loader
// ============================================

interface BatchFile {
  batch_plan?: {
    batch_index: number;
    scenario_count: number;
    scenarios: Array<{
      description: string;
      archetype: Archetype | string;
      doubt?: any[];
    }>;
  };
  test_cases: TestCase[];
}

/**
 * Convert simple glob pattern to regex
 * Supports: * (any chars except path sep), ? (single char)
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '[^/\\\\]*')           // * matches any chars except path sep
    .replace(/\?/g, '.');                  // ? matches single char
  return new RegExp(`^${escaped}$`, 'i');
}

async function loadBatchFiles(
  concernId: string,
  batchPattern: string,
  testDir: string
): Promise<{ batchId: string; testCases: TestCase[]; archetypeMap: Map<string, string> }[]> {
  const batches: { batchId: string; testCases: TestCase[]; archetypeMap: Map<string, string> }[] = [];

  // Read directory and filter by pattern
  let allFiles: string[];
  try {
    allFiles = await fs.readdir(testDir);
  } catch (error) {
    throw new Error(`Cannot read test directory: ${testDir}`);
  }

  // Filter JSON files matching the pattern
  const patternWithExt = batchPattern.endsWith('.json') ? batchPattern : `${batchPattern}.json`;
  const regex = patternToRegex(patternWithExt);
  const matchingFiles = allFiles.filter(f => f.endsWith('.json') && regex.test(f));

  // Also try exact match if no glob match found
  if (matchingFiles.length === 0) {
    const exactName = `${batchPattern}.json`;
    if (allFiles.includes(exactName)) {
      matchingFiles.push(exactName);
    }
  }

  if (matchingFiles.length === 0) {
    throw new Error(`No test files found matching pattern: ${batchPattern} in ${testDir}`);
  }

  for (const fileName of matchingFiles) {
    const filePath = path.join(testDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    const data: BatchFile = JSON.parse(content);

    // Extract batch ID from filename
    const batchId = path.basename(fileName, '.json');

    // Build archetype map from batch_plan OR batch_strategy if available
    const archetypeMap = new Map<string, string>();
    const planData = data.batch_plan || (data as any).batch_strategy;
    
    if (planData?.scenarios) {
      // Map test_id to archetype based on position
      data.test_cases.forEach((tc, index) => {
        if (planData.scenarios[index]) {
          archetypeMap.set(tc.test_id, planData.scenarios[index].archetype);
        }
      });
    }

    // Filter by concern_id if specified
    const testCases = data.test_cases.filter(tc =>
      tc.concern_id.toUpperCase() === concernId.toUpperCase()
    );

    if (testCases.length > 0) {
      batches.push({ batchId, testCases, archetypeMap });
    }
  }

  return batches;
}

// ============================================
// Engine Runner
// ============================================

async function runEngineForTestCase(
  testCase: TestCase,
  debug: boolean = false
): Promise<EngineOutput> {
  try {
    const engine = await getEngine();
    const output = await engine({
      concern_id: testCase.concern_id,
      patient_payload: testCase.patient_payload,
      metadata: { test_id: testCase.test_id },
      debug,
    });
    return output;
  } catch (error: any) {
    // Return a minimal output on error
    console.error(`  Warning: Engine error for ${testCase.test_id}: ${error.message}`);
    return {
      raw_input: testCase.patient_payload,
      summary: '',
      signals: [],
      followup_questions: [],
    };
  }
}

// ============================================
// Main Command Handler
// ============================================

async function runSafeScore(options: {
  concern: string;
  batch: string;
  output?: string;
  format: string;
  strictAh: boolean;
  verbose: boolean;
  testDir: string;
  cases?: string;
  autoHeal?: boolean;
}): Promise<number> {
  const { concern, batch, output, format, strictAh, verbose, testDir, cases, autoHeal } = options;

  // Parse case filter if provided
  const caseFilter = cases ? new Set(cases.split(',').map(c => c.trim())) : null;

  console.log(`\nSAFE v0 Evaluation`);
  console.log(`  Concern: ${concern}`);
  console.log(`  Batch Pattern: ${batch}`);
  console.log(`  Test Directory: ${testDir}`);
  if (caseFilter) {
    console.log(`  Case Filter: ${cases} (${caseFilter.size} cases)`);
  }
  if (strictAh) {
    console.log(`  Mode: STRICT AH`);
  }
  console.log('');

  // Load test cases
  let batches;
  try {
    batches = await loadBatchFiles(concern, batch, testDir);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    return 3; // Configuration error
  }

  if (batches.length === 0) {
    console.error(`Error: No test cases found for concern ${concern}`);
    return 3;
  }

  // Apply case filter if provided
  if (caseFilter) {
    for (const batch of batches) {
      batch.testCases = batch.testCases.filter(tc => caseFilter.has(tc.test_id));
    }
    // Remove empty batches
    batches = batches.filter(b => b.testCases.length > 0);
  }

  const totalCases = batches.reduce((sum, b) => sum + b.testCases.length, 0);
  console.log(`  Found ${totalCases} test cases across ${batches.length} batch file(s)\n`);

  if (totalCases === 0) {
    console.error(`Error: No test cases to run${caseFilter ? ' (check --cases filter)' : ''}`);
    return 3;
  }

  // Initialize pattern tracker for live detection
  const patternTracker = new PatternTracker();

  // Score all test cases
  const allScorecards: SAFEv0Scorecard[] = [];
  let processedCount = 0;

  for (const { batchId, testCases, archetypeMap } of batches) {
    console.log(`Processing batch: ${batchId}`);
    
    let retryCount = 0;
    const MAX_RETRIES = 2;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      processedCount++;
      process.stdout.write(`  [${processedCount}/${totalCases}] ${testCase.test_id}...`);

      // Run engine
      const engineOutput = await runEngineForTestCase(testCase, verbose);

      // Score the case
      const scoreOptions: ScoreCaseOptions = {
        strictAH: strictAh,
        batchId,
        archetype: archetypeMap.get(testCase.test_id) || null,
      };

      const scorecard = scoreCase(testCase, engineOutput, scoreOptions);
      allScorecards.push(scorecard);

      // Output result
      const labelColor = scorecard.label === 'Pass' ? '\x1b[32m' :
                         scorecard.label === 'Review' ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';

      // Build score string with optional DR for doubt scenarios
      const crScore = scorecard.scores.CR?.score ?? 0;
      const ahScore = scorecard.scores.AH?.score ?? 0;
      const acScore = scorecard.scores.AC?.score ?? 0;
      let scoreStr = `CR=${crScore.toFixed(2)}, AH=${ahScore.toFixed(2)}, AC=${acScore.toFixed(2)}`;

      if (scorecard.scenario_type === 'doubt' && scorecard.scores.DR) {
        const drScore = scorecard.scores.DR.score;
        const drColor = drScore >= 1.0 ? '\x1b[32m' : drScore >= 0.5 ? '\x1b[33m' : '\x1b[31m';
        scoreStr += `, ${drColor}DR=${drScore.toFixed(2)}${reset}`;
      }

      console.log(` ${labelColor}${scorecard.label}${reset} (${scoreStr})`);

      // Track patterns and emit if threshold reached
      const newPatterns = patternTracker.trackFailure(scorecard);
      for (const pattern of newPatterns) {
        console.log(`         ${pattern}`);
      }

      // INCREMENTAL AUTO-HEAL (Every 10 cases)
      if (autoHeal && processedCount % 10 === 0) {
          const recentChunk = allScorecards.slice(-10);
          const recentFailures = recentChunk.filter(sc => sc.label === 'Fail').length;
          
          if (recentFailures > 0 && retryCount < MAX_RETRIES) {
              console.log(`\n🚑 Incremental Auto-Heal triggered (${processedCount} cases processed, ${recentFailures} recent fails)...`);
              
              const partialReport = generateBatchReport(`${batchId}_partial_${processedCount}`, concern, allScorecards);
              const partialPath = path.join(process.cwd(), 'validation_report_partial.json');
              await fs.writeFile(partialPath, JSON.stringify(partialReport, null, 2), 'utf-8');

              try {
                  const { execSync } = require('child_process');
                  const autoHealPath = path.resolve(__dirname, '../../tools/auto-heal.ts');
                  execSync(`npx ts-node "${autoHealPath}" "${partialPath}"`, { stdio: 'inherit' });
                  
                  // CLEAR CACHE so next run sees the new config
                  SemanticPacketLoader.getInstance().clearCache();
                  
                  console.log(`✅ Incremental heal complete. RETRYING previous 10 cases to verify fix (Retry ${retryCount + 1}/${MAX_RETRIES})...\n`);
                  
                  // Reset counters to re-run the current 10-case chunk
                  allScorecards.splice(-10); // Remove the failed scores
                  i -= 10;                  // Rewind the loop
                  processedCount -= 10;     // Rewind processed count
                  retryCount++;             // Increment retry for this block
                  
              } catch (healErr) {
                  console.warn(`⚠️ Incremental heal failed (continuing):`, healErr);
              }
          } else if (recentFailures > 0) {
              console.log(`\n⚠️  Max retries reached for this chunk. Continuing to next batch.`);
              retryCount = 0; // Reset for next chunk
          } else {
              retryCount = 0; // Reset for next chunk
          }
      }
    }
    console.log('');
  }

  // Show pattern summary if any
  const patternSummary = patternTracker.getSummary();
  if (patternSummary.length > 0) {
    console.log('FAILURE PATTERNS DETECTED:');
    console.log('─'.repeat(50));
    for (const p of patternSummary.slice(0, 10)) {
      const typeLabel = p.type === 'CR' ? 'Missing signal' :
                       p.type === 'AH' ? 'Forbidden term' :
                       p.type === 'DR' ? 'Doubt Recognition' : 'Missing phrase';
      console.log(`  ${typeLabel}: "${p.item}" (${p.count} cases: ${p.caseIds.slice(0, 3).join(', ')}${p.caseIds.length > 3 ? '...' : ''})`);
    }
    console.log('');
  }

  // Generate batch report
  const combinedBatchId = batches.length === 1 ? batches[0].batchId : `${concern}_combined`;
  const report = generateBatchReport(combinedBatchId, concern, allScorecards);

  // Output report
  const formatLower = format.toLowerCase() as ReportFormat;

  // Append to eval_journal.md (Audit Trail)
  try {
    const journalPath = path.join(testDir, '../../_shared/eval_journal.md');
    const journalDir = path.dirname(journalPath);
    await fs.mkdir(journalDir, { recursive: true });

    const summary = report.summary;
    const mean = summary.mean_scores;
    const drScore = mean.DR !== undefined ? `, DR: ${mean.DR.toFixed(2)}` : '';
    
    const journalEntry = `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} | ${batch} | SAFE v0 | Pass: ${summary.pass_count}, Review: ${summary.review_count}, Fail: ${summary.fail_count} | CR: ${mean.CR.toFixed(2)}, AH: ${mean.AH.toFixed(2)}, AC: ${mean.AC.toFixed(2)}${drScore}\n`;
    
    await fs.appendFile(journalPath, journalEntry);
    console.log(`\n✅ Results appended to journal: ${journalPath}`);
  } catch (err) {
    console.warn(`  ⚠️  Failed to update journal: ${err}`);
  }

  if (output) {
    // Write to file(s)
    if (formatLower === 'all') {
      const basePath = output.replace(/\.[^.]+$/, '');
      await writeReport(report, `${basePath}.json`, 'json');
      await writeReport(report, `${basePath}.md`, 'markdown');
      printReport(report, 'console', verbose, strictAh);
      console.log(`\nReports written to:`);
      console.log(`  JSON: ${basePath}.json`);
      console.log(`  Markdown: ${basePath}.md`);
    } else if (formatLower === 'json') {
      await writeReport(report, output, 'json');
      console.log(`\nReport written to: ${output}`);
    } else if (formatLower === 'markdown') {
      await writeReport(report, output, 'markdown');
      console.log(`\nReport written to: ${output}`);
    } else {
      // Console format with output path - write JSON
      await writeReport(report, output, 'json');
      printReport(report, 'console', verbose, strictAh);
      console.log(`\nReport written to: ${output}`);
    }
  } else {
    // Print to stdout
    if (formatLower === 'all') {
      printReport(report, 'console', verbose, strictAh);
    } else if (formatLower === 'json' || formatLower === 'markdown') {
      printReport(report, formatLower, verbose, strictAh);
    } else {
      printReport(report, 'console', verbose, strictAh);
    }
  }

  // Determine exit code
  if (report.summary.fail_count > 0) {
    return 1; // At least one Fail
  } else if (report.summary.review_count > 0) {
    return 2; // No Fails, but at least one Review
  }
  return 0; // All Pass
}

// ============================================
// Command Definition
// ============================================

export const safeScore = new Command('safe:score')
  .description('Run SAFE v0 evaluation on test batches')
  .requiredOption('-c, --concern <id>', 'Concern ID (e.g., I25)')
  .requiredOption('-b, --batch <pattern>', 'Batch file pattern (e.g., "I25_batch_*" or "golden_set")')
  .option('-o, --output <path>', 'Output file path for report')
  .option('-f, --format <format>', 'Output format: json, console, markdown, all', 'console')
  .option('--strict-ah', 'Use strict AH scoring (any violation = fail)')
  .option('-v, --verbose', 'Show detailed per-case output')
  .option('-t, --test-dir <path>', 'Test data directory (defaults to domain path for concern)')
  .option('--cases <ids>', 'Run only specific test case IDs (comma-separated)')
  .option('--auto-heal', 'Automatically generate learning patches on failure')
  .action(async (options) => {
    try {
      // Resolve test directory: use provided path or derive from concern
      let testDir = options.testDir;
      if (!testDir) {
        try {
          const metricPath = resolveMetricPath(options.concern);
          testDir = Paths.metricTestcases(metricPath);
        } catch {
          // Fallback to legacy path
          testDir = Paths.legacy.testcases();
        }
      }

      // Force output path if auto-heal is enabled but no output specified
      let outputPath = options.output;
      if (options.autoHeal && !outputPath) {
         outputPath = path.join(process.cwd(), 'validation_report.json');
      }

      const exitCode = await runSafeScore({
        concern: options.concern,
        batch: options.batch,
        output: outputPath,
        format: options.format,
        strictAh: options.strictAh || false,
        verbose: options.verbose || false,
        testDir,
        cases: options.cases,
        autoHeal: options.autoHeal || false,
      });

      if (options.autoHeal && exitCode !== 0) {
          console.log(`\n🚑 Auto-Heal: Validation failed (Exit Code ${exitCode}). Consulting Learning Agent...`);
          try {
             // Lazy load execSync to avoid top-level node deps if possible
             const { execSync } = require('child_process');
             const autoHealPath = path.resolve(__dirname, '../../tools/auto-heal.ts');
             
             // Run auto-heal tool
             execSync(`npx ts-node "${autoHealPath}" "${outputPath}"`, { stdio: 'inherit' });
             
             console.log(`\n✅ Auto-Heal analysis complete. Check 'factory-cli/learning_drafts/' for patches.`);
          } catch (healErr) {
             console.error(`❌ Auto-Heal failed to execute:`, healErr);
          }
      }

      process.exit(exitCode);
    } catch (error: any) {
      console.error(`\nError: ${error.message}\n`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(3);
    }
  });
