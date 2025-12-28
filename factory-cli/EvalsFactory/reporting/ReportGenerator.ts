import * as fs from 'fs/promises';
import * as path from 'path';

export interface EvalReport {
  metadata: {
    metric: string;
    batch: string;
    mode: string;
    timestamp: string;
    model: string;
  };
  summary: {
    total_cases: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    avg_scores: Record<string, number>;
  };
  results: any[];
}

/**
 * E8: ReportGenerator
 */
export class ReportGenerator {
  static generate(evalReport: EvalReport): string {
    // Generate simple console summary
    const { metadata, summary } = evalReport;
    let report = `
📊 EVALUATION REPORT: ${metadata.metric} / ${metadata.batch}
`;
    report += `   Mode: ${metadata.mode} | Model: ${metadata.model}
`;
    report += `   -------------------------------------------
`;
    report += `   Total Cases: ${summary.total_cases}
`;
    report += `   Pass Rate:   ${(summary.pass_rate * 100).toFixed(1)}%
`;
    report += `   Avg Scores:
`;
    for (const [criterion, score] of Object.entries(summary.avg_scores)) {
      report += `     - ${criterion}: ${score.toFixed(2)}
`;
    }
    report += `   -------------------------------------------
`;
    
    return report;
  }

  static async save(evalReport: EvalReport, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Save JSON
    await fs.writeFile(outputPath, JSON.stringify(evalReport, null, 2));

    // Save CSV (simple version)
    const csvPath = outputPath.replace('.json', '.csv');
    let csv = 'test_id,concern_id,label,composite_score\n';
    for (const result of evalReport.results) {
      csv += `${result.test_id},${result.concern_id},${result.label},${result.composite_score}\n`;
    }
    await fs.writeFile(csvPath, csv);
  }
}
