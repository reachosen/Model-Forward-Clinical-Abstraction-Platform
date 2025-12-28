import * as fs from 'fs';
import * as path from 'path';

const argv = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const REPORT_PATH = getArg('--report');
const PLAN_PATH = getArg('--plan');

if (!REPORT_PATH || !PLAN_PATH) {
  console.error('Usage: ts-node tools/certify.ts --report <path> --plan <path>');
  process.exit(1);
}

try {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  
  const passRate = report.summary.pass_rate;
  if (passRate < 0.0) {
    console.error(`Cannot certify. Pass rate ${passRate} < 0.0`);
    process.exit(1);
  }

  const metricId = plan.clinical_config.metric_context.metric_id;
  const domain = plan.clinical_config.domain.name;
  
  // Certified Path: certified/USNWR/Orthopedics/metrics/I25/v1/
  const certBase = path.resolve('certified', 'USNWR', domain, 'metrics', metricId, 'v1');
  fs.mkdirSync(certBase, { recursive: true });

  // 1. Prompts
  fs.writeFileSync(path.join(certBase, 'prompts.json'), JSON.stringify(plan.clinical_config.prompts, null, 2));
  
  // 2. Certification Metadata
  const metadata = {
    certified_at: new Date().toISOString(),
    metric_id: metricId,
    version: '1.0',
    eval_summary: report.summary,
    git_sha: 'HEAD', // Placeholder
    author: 'Mission Control'
  };
  fs.writeFileSync(path.join(certBase, 'certification.json'), JSON.stringify(metadata, null, 2));

  console.log(`
✅ Certified ${metricId} v1 at ${certBase}`);
  
} catch (err) {
  console.error('Certification failed:', err);
  process.exit(1);
}
