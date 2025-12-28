import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { I25BatchRunner } from './runner';
import { AggregateReport } from './types';

program
  .name('batch-runner')
  .description('Run I25 batch validation')
  .requiredOption('--concern <id>', 'Concern ID (e.g. I25)')
  .requiredOption('--plan <path>', 'Path to generation_plan.json')
  .requiredOption('--glob <pattern>', 'Glob pattern for batch files (actually just a folder path + prefix logic currently)')
  .requiredOption('--output <path>', 'Path to output JSON report')
  .option('--markdown <path>', 'Path to output Markdown report')
  .action(async (options) => {
    try {
      // Hack: 'glob' in our simple runner expects a directory and we filter for I25_batch_*.json
      // So if user passes ./dir/I25_batch_*.json, we extract ./dir
      const dir = path.dirname(options.glob);
      
      const runner = new I25BatchRunner(options.concern, options.plan, dir);
      const report = await runner.run();

      // Write JSON
      fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
      console.log(`JSON report written to ${options.output}`);

      // Write Markdown
      if (options.markdown) {
        const md = generateMarkdown(report);
        fs.writeFileSync(options.markdown, md);
        console.log(`Markdown report written to ${options.markdown}`);
      }

    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

function generateMarkdown(report: AggregateReport): string {
  let md = `# Prompt Refinery Report: ${report.concern_id}\n\n`;
  md += `**Total Cases:** ${report.total_cases}\n\n`;

  md += `## Archetype Performance\n\n`;
  md += `| Archetype | Cases | Structural | Signals | Summary | Follow-ups | Enrichment |\n`;
  md += `|---|---|---|---|---|---|---|
`;

  Object.entries(report.by_archetype).forEach(([arc, stats]) => {
    const p = (n: number) => (n * 100).toFixed(1) + '%';
    md += `| ${arc} | ${stats.total} | ${p(stats.structural_pass_rate)} | ${p(stats.signals_pass_rate)} | ${p(stats.summary_pass_rate)} | ${p(stats.followups_pass_rate)} | ${p(stats.enrichment_pass_rate)} |\n`;
  });

  md += `\n## Top Failure Clusters\n\n`;
  // Sort failures by count
  const sortedFailures = Object.entries(report.failures_by_type).sort((a, b) => b[1].count - a[1].count);
  
  sortedFailures.slice(0, 10).forEach(([key, data]) => {
    md += `### ${key} (${data.count} failures)\n`;
    data.sample_descriptions.forEach(desc => md += `- ${desc}\n`);
    md += `\n`;
  });

  md += `\n## Next Actions\n`;
  if (sortedFailures.length > 0) {
    const topFail = sortedFailures[0][0];
    if (topFail.includes('signals')) md += `- Tighten signal extraction prompt to address: ${topFail.split(':')[1] || 'missing signals'}.\n`;
    if (topFail.includes('followups')) md += `- Review follow-up question generation logic for: ${topFail.split(':')[1] || 'missing themes'}.\n`;
  } else {
    md += `- No major failures found. Ready for next batch.\n`;
  }

  return md;
}

program.parse(process.argv);
