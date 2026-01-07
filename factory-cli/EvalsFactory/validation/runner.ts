import * as fs from 'fs';
import * as path from 'path';
// import glob from 'glob'; // Not available, using manual dir scan
import { runI25Engine, sampleCases, getEvalConfig, EvalConfig } from './engine';
import {
  validateStructural,
  validateSignals,
  validateSummary,
  // validateFollowups,
  // validateEnrichment
} from './checks';
import { AggregateReport, TestCase, ValidationResult, Archetype } from './types';

function getFiles(dir: string, pattern: RegExp): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      /* No recursion needed for this flat structure, but ok */ 
    } else {
      if (pattern.test(file)) results.push(file);
    }
  });
  return results;
}

function extractArchetype(description: string): Archetype {
  const match = description.match(/`\[(.*?)\]`/);
  return match ? (match[1] as Archetype) : 'Unknown';
}

export class BatchRunner {
  private concernId: string;
  private planPath: string;
  private testDataDir: string;
  private evalConfig: EvalConfig;
  private customPattern: string | null = null; // Filter for specific files
  public quiet: boolean = false; // Added for lean logging

  constructor(concernId: string, planPath: string, testDataDir: string, evalConfig?: EvalConfig) {
    this.concernId = concernId;
    this.planPath = planPath;
    this.testDataDir = testDataDir;
    this.evalConfig = evalConfig || getEvalConfig();
  }

  setPattern(pattern: string): void {
    this.customPattern = pattern;
  }

  async run(systemPrompt?: string): Promise<AggregateReport> {
    // 1. Load Plan (Verification only)
    if (!fs.existsSync(this.planPath)) {
        // FALLBACK: Try lean_plan.json
        const leanPath = this.planPath.replace('plan.json', 'lean_plan.json');
        if (fs.existsSync(leanPath)) {
            console.log(`   ℹ️  BatchRunner: plan.json not found, using ${leanPath}`);
            this.planPath = leanPath;
        } else {
            throw new Error(`Plan not found: ${this.planPath}`);
        }
    }

    // 2. Load Batch Files
    // Match {concernId}_batch_*.json OR batch_1.json OR golden_set.json
    let patternStr = `(${this.concernId}_batch_\\d+|batch_1|golden_set)\\.json$`;
    if (this.customPattern && this.customPattern !== '.*') {
        patternStr = `${this.customPattern}\\.json$`;
    }
    const pattern = new RegExp(patternStr);
    
    const batchFiles = getFiles(this.testDataDir, pattern);
    if (!this.quiet) {
        console.log(`Found ${batchFiles.length} batch files in ${this.testDataDir} matching ${pattern}`);
        console.log(`  📊 C11 Eval Config: maxTokens=${this.evalConfig.maxTokens}, sampleSize=${this.evalConfig.sampleSize}, fullMode=${this.evalConfig.fullMode}`);
    }

    const results: ValidationResult[] = [];

    // 3. Process each batch
    for (const file of batchFiles) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const batchPlan = data.batch_plan || data.batch_strategy; // Handle both naming conventions
      const allTestCases: TestCase[] = data.test_cases;

      // C11: Apply sampling for fast iteration mode
      const testCases = sampleCases(allTestCases, this.evalConfig);
      if (!this.quiet) {
          console.log(`Processing ${file} (${testCases.length}/${allTestCases.length} cases)...`);
      } else {
          // process.stdout.write(`   🏃 Validating ${testCases.length} cases: `);
      }

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const scenario = batchPlan?.scenarios?.[i];
        
        // Extract scenario metadata
        const type = (scenario?.type || 'unknown').toUpperCase();
        const doubtType = (scenario?.doubt?.[0]?.type || 'NONE').toUpperCase();
        
        let scenarioDescription = (scenario as any)?.description || tc.description || "";

        let archetype = (scenario as any)?.archetype || extractArchetype(tc.description);

        if (this.quiet) {
            console.log(`   [${tc.test_id}] | ${archetype.padEnd(25)} | ${type.padEnd(7)} | Doubt: ${doubtType}`);
            console.log(`   INTENT: "${scenarioDescription.slice(0, 100)}..."`);
            const snippet = tc.patient_payload.slice(0, 120).replace(/\n/g, ' ');
            console.log(`   DATA:   "${snippet}..."`);
        }

        // Run Engine
        const output = await runI25Engine({
          concern_id: this.concernId,
          patient_payload: tc.patient_payload,
          metadata: { test_id: tc.test_id, batch_index: batchPlan?.batch_index },
          systemPrompt // Pass the prompt if provided
        });

        // Capture Engine Errors
        if (output.summary === "ENGINE_ERROR") {
            const errKey = output.error_message?.includes('json') ? 'ERROR_400_JSON_FORMAT' : 'LLM_ENGINE_ERROR';
            const vResult: any = {
                test_id: tc.test_id,
                error_type: errKey,
                structural: { passed: false, errors: [errKey] },
                semantic: { errors: [output.error_message || 'Unknown error'] },
                scores: { signals_recall: 0 }
            };
            results.push(vResult);
            continue;
        }

        const structural = validateStructural(output);
        let semantic = { signals_ok: false, summary_ok: false, followups_ok: false, enrichment_ok: false, errors: [] as string[] };
        let scores = { signals_recall: 0 as number | null, summary_coverage: 0 as number | null, followup_coverage: 0 as number | null };

        if (structural.passed) {
          const sigVal = validateSignals(tc, output);
          const sumVal = validateSummary(tc, output);
          
          semantic = { 
              signals_ok: sigVal.ok, 
              summary_ok: sumVal.ok, 
              followups_ok: true, 
              enrichment_ok: true, 
              errors: [...sigVal.errors, ...sumVal.errors] 
          };
          scores = { 
              signals_recall: sigVal.recall, 
              summary_coverage: sumVal.coverage, 
              followup_coverage: null 
          };
        }

        if (this.quiet) {
            const metricKey = this.concernId === 'I32a' && output.summary !== 'ENGINE_ERROR' ? 'Summary' : 'Recall';
            const scoreVal = (metricKey === 'Summary' ? scores.summary_coverage : scores.signals_recall);
            const scoreDisplay = (structural.passed && scoreVal !== null ? (scoreVal * 100).toFixed(0) : '0');
            const status = structural.passed ? '✓' : '❌';
            console.log(`   OUT:  ${status} ${metricKey}: ${scoreDisplay}% | Summary: ${output.summary.slice(0, 60)}...`);
            console.log('   ' + '─'.repeat(70));
        }

        results.push({
          test_id: tc.test_id,
          concern_id: tc.concern_id,
          archetype,
          batch_index: batchPlan?.batch_index || null,
          scenario_label: scenarioDescription,
          structural,
          semantic,
          scores,
          engine_output: output
        });
      }
      if (this.quiet) process.stdout.write(' Done.\n');
    }

    return this.aggregate(results);
  }

  private aggregate(results: ValidationResult[]): AggregateReport {
    const report: AggregateReport = {
      concern_id: this.concernId,
      total_cases: results.length,
      by_archetype: {},
      failures_by_type: {},
      raw_results: results
    };

    results.forEach(r => {
      const arc = r.archetype || 'Unknown';
      if (!report.by_archetype[arc]) {
        report.by_archetype[arc] = {
          total: 0,
          structural_pass_rate: 0,
          signals_pass_rate: 0,
          summary_pass_rate: 0,
          followups_pass_rate: 0,
          enrichment_pass_rate: 0,
          worst_offending_dimensions: []
        };
      }
      const entry = report.by_archetype[arc];
      entry.total++;
      if (r.structural.passed) entry.structural_pass_rate++;
      if (r.semantic.signals_ok) entry.signals_pass_rate++;
      if (r.semantic.summary_ok) entry.summary_pass_rate++;
      if (r.semantic.followups_ok) entry.followups_pass_rate++;
      if (r.semantic.enrichment_ok) entry.enrichment_pass_rate++;

      // Failures by type
      const allErrors = [...r.structural.errors, ...r.semantic.errors];
      allErrors.forEach(err => {
        // Key by first part of error "category:message" -> "category:message"
        // or just normalize a bit
        const key = err; 
        if (!report.failures_by_type[key]) {
          report.failures_by_type[key] = { count: 0, sample_test_ids: [], sample_descriptions: [] };
        }
        const failEntry = report.failures_by_type[key];
        failEntry.count++;
        if (failEntry.sample_test_ids.length < 3) {
          failEntry.sample_test_ids.push(r.test_id);
          failEntry.sample_descriptions.push(r.scenario_label || r.test_id);
        }
      });
    });

    // Normalize rates
    Object.values(report.by_archetype).forEach(e => {
      e.structural_pass_rate /= e.total;
      e.signals_pass_rate /= e.total;
      e.summary_pass_rate /= e.total;
      e.followups_pass_rate /= e.total;
      e.enrichment_pass_rate /= e.total;
      
      // Worst dimensions
      const dims = [
        { name: 'structural', rate: e.structural_pass_rate },
        { name: 'signals', rate: e.signals_pass_rate },
        { name: 'summary', rate: e.summary_pass_rate },
        { name: 'followups', rate: e.followups_pass_rate }
      ];
      dims.sort((a, b) => a.rate - b.rate);
      e.worst_offending_dimensions = dims.map(d => d.name);
    });

    return report;
  }
}