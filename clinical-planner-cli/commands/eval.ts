import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InputAdapter } from '../eval/adapters/InputAdapter';
import { generatePlan, executePromptPlan, generatePromptPlan } from '../planner/planGen';
import { SignalGrader } from '../eval/graders/SignalGrader';
import { SummaryGrader } from '../eval/graders/SummaryGrader';
import { SafetyGrader } from '../eval/graders/SafetyGrader';
import { SchemaGrader } from '../eval/graders/SchemaGrader';
import { ReportGenerator, EvalReport } from '../eval/reporting/ReportGenerator';
import { TestCase } from '../flywheel/validation/types';

/**
 * E1: eval CLI command
 */
export const evalCommand = new Command('eval')
  .description('Run evaluations on test batches')
  .requiredOption('-m, --metric <id>', 'Metric ID (e.g., I25)')
  .requiredOption('-b, --batch <id>', 'Batch ID (e.g., batch1)')
  .option('--mode <mode>', 'Execution mode: fast | full', 'fast')
  .option('-o, --output <path>', 'Output path for report')
  .option('--test-dir <path>', 'Test data directory', './data/flywheel/testcases')
  .action(async (options) => {
    try {
      const { metric, batch, mode, output, testDir } = options;
      
      console.log(`\n🚀 Starting Evaluation`);
      console.log(`   Metric: ${metric}`);
      console.log(`   Batch:  ${batch}`);
      console.log(`   Mode:   ${mode}\n`);

      // 1. Load test cases
      const batchFile = path.join(testDir, `${batch}.json`);
      let data;
      try {
        const content = await fs.readFile(batchFile, 'utf-8');
        data = JSON.parse(content);
      } catch (err) {
        // Try metric-specific subdirectory
        try {
          const altPath = path.join(testDir, metric, `${batch}.json`);
          const content = await fs.readFile(altPath, 'utf-8');
          data = JSON.parse(content);
        } catch (err2) {
          throw new Error(`Could not find batch file for ${batch} in ${testDir} or ${path.join(testDir, metric)}`);
        }
      }

      const testCases: TestCase[] = data.test_cases || [];
      if (testCases.length === 0) {
        throw new Error(`No test cases found in batch ${batch}`);
      }

      console.log(`   Found ${testCases.length} test cases.\n`);

      const signalGrader = new SignalGrader();
      const summaryGrader = new SummaryGrader();
      const safetyGrader = new SafetyGrader();
      const schemaGrader = new SchemaGrader();
      
      const results = [];
      let totalPass = 0;
      const scoreSums: Record<string, number> = {
        SignalRecall: 0,
        SummaryCoverage: 0,
        AvoidsHarm: 0,
        SchemaCompliance: 0
      };

      // 2. Run cases
      for (const tc of testCases) {
        process.stdout.write(`   [${results.length + 1}/${testCases.length}] ${tc.test_id}...`);
        
        const startTime = Date.now();
        const input = InputAdapter.adapt(tc);
        
        let plan;
        let engineOutput;
        try {
          plan = await generatePlan(input, {
            model: process.env.MODEL || 'gpt-4o-mini'
          });
          
          engineOutput = {
            summary: plan.clinical_config.summary_config?.event_summary || plan.rationale.summary,
            signals: (plan.clinical_config.signals.signal_groups || []).flatMap(g => g.signals.map((s: any) => s.description || s.name)),
            followup_questions: (plan.clinical_config.questions.metric_questions || []).map(q => q.text),
            latency_ms: Date.now() - startTime
          };
        } catch (err: any) {
          console.log(` ❌ Error: ${err.message}`);
          results.push({
            test_id: tc.test_id,
            concern_id: tc.concern_id,
            label: 'Fail',
            error: err.message
          });
          continue;
        }

        // 3. Grade
        const gSignal = signalGrader.grade(tc, engineOutput);
        const gSummary = summaryGrader.grade(tc, engineOutput);
        const gSafety = safetyGrader.grade(tc, engineOutput);
        const gSchema = schemaGrader.grade(tc, plan);

        const compositeScore = (gSignal.score + gSummary.score + gSafety.score + gSchema.score) / 4;
        const label = (gSignal.flagged || gSummary.flagged || gSafety.flagged || gSchema.flagged) ? 'Review' : 'Pass';
        if (label === 'Pass') totalPass++;

        scoreSums.SignalRecall += gSignal.score;
        scoreSums.SummaryCoverage += gSummary.score;
        scoreSums.AvoidsHarm += gSafety.score;
        scoreSums.SchemaCompliance += gSchema.score;

        console.log(` ${label} (${compositeScore.toFixed(2)})`);

        results.push({
          test_id: tc.test_id,
          concern_id: tc.concern_id,
          label,
          composite_score: compositeScore,
          scores: {
            SignalRecall: gSignal.score,
            SummaryCoverage: gSummary.score,
            AvoidsHarm: gSafety.score,
            SchemaCompliance: gSchema.score
          },
          engine_output: engineOutput,
          grading_details: {
            SignalRecall: gSignal.details,
            SummaryCoverage: gSummary.details,
            AvoidsHarm: gSafety.details,
            SchemaCompliance: gSchema.details
          }
        });
      }

      // 4. Generate Report
      const evalReport: EvalReport = {
        metadata: {
          metric,
          batch,
          mode,
          timestamp: new Date().toISOString(),
          model: process.env.MODEL || 'gpt-4o-mini'
        },
        summary: {
          total_cases: testCases.length,
          pass_count: totalPass,
          fail_count: testCases.length - totalPass,
          pass_rate: totalPass / testCases.length,
          avg_scores: {
            SignalRecall: scoreSums.SignalRecall / testCases.length,
            SummaryCoverage: scoreSums.SummaryCoverage / testCases.length,
            AvoidsHarm: scoreSums.AvoidsHarm / testCases.length,
            SchemaCompliance: scoreSums.SchemaCompliance / testCases.length
          }
        },
        results
      };

      const consoleReport = ReportGenerator.generate(evalReport);
      console.log(consoleReport);

      const reportPath = output || path.join('output', 'eval', `${metric}_${batch}_${Date.now()}.json`);
      await ReportGenerator.save(evalReport, reportPath);
      console.log(`✅ Report saved to: ${reportPath}\n`);

      process.exit(evalReport.summary.fail_count > 0 ? 1 : 0);

    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });
