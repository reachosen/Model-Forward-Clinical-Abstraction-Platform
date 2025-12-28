/**
 * safe:score CLI Command
 *
 * Run SAFE v0 evaluation on test batches.
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

    // Build archetype map from batch_plan if available
    const archetypeMap = new Map<string, string>();
    if (data.batch_plan?.scenarios) {
      // Map test_id to archetype based on position
      data.test_cases.forEach((tc, index) => {
        if (data.batch_plan!.scenarios[index]) {
          archetypeMap.set(tc.test_id, data.batch_plan!.scenarios[index].archetype);
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
  testCase: TestCase
): Promise<EngineOutput> {
  try {
    const engine = await getEngine();
    const output = await engine({
      concern_id: testCase.concern_id,
      patient_payload: testCase.patient_payload,
      metadata: { test_id: testCase.test_id },
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
}): Promise<number> {
  const { concern, batch, output, format, strictAh, verbose, testDir } = options;

  console.log(`\nSAFE v0 Evaluation`);
  console.log(`  Concern: ${concern}`);
  console.log(`  Batch Pattern: ${batch}`);
  console.log(`  Test Directory: ${testDir}`);
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

  const totalCases = batches.reduce((sum, b) => sum + b.testCases.length, 0);
  console.log(`  Found ${totalCases} test cases across ${batches.length} batch file(s)\n`);

  // Score all test cases
  const allScorecards: SAFEv0Scorecard[] = [];
  let processedCount = 0;

  for (const { batchId, testCases, archetypeMap } of batches) {
    console.log(`Processing batch: ${batchId}`);

    for (const testCase of testCases) {
      processedCount++;
      process.stdout.write(`  [${processedCount}/${totalCases}] ${testCase.test_id}...`);

      // Run engine
      const engineOutput = await runEngineForTestCase(testCase);

      // Score the case
      const scoreOptions: ScoreCaseOptions = {
        strictAH: strictAh,
        batchId,
        archetype: archetypeMap.get(testCase.test_id) || null,
      };

      const scorecard = scoreCase(testCase, engineOutput, scoreOptions);
      allScorecards.push(scorecard);

      console.log(` ${scorecard.label} (CR=${scorecard.scores.CR.score.toFixed(2)}, AH=${scorecard.scores.AH.score.toFixed(2)}, AC=${scorecard.scores.AC.score.toFixed(2)})`);
    }
    console.log('');
  }

  // Generate batch report
  const combinedBatchId = batches.length === 1 ? batches[0].batchId : `${concern}_combined`;
  const report = generateBatchReport(combinedBatchId, concern, allScorecards);

  // Output report
  const formatLower = format.toLowerCase() as ReportFormat;

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

      const exitCode = await runSafeScore({
        concern: options.concern,
        batch: options.batch,
        output: options.output,
        format: options.format,
        strictAh: options.strictAh || false,
        verbose: options.verbose || false,
        testDir,
      });
      process.exit(exitCode);
    } catch (error: any) {
      console.error(`\nError: ${error.message}\n`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(3);
    }
  });
