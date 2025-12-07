import * as fs from 'fs';
import * as path from 'path';

const BATCH_DIR = path.join(__dirname, '../../data/flywheel/testcases/batch1_full');
const REPORT_PATH = path.join(__dirname, '../../data/flywheel/reports/I25_batch1_full.signalval.json');
const OUTPUT_PATH = path.join(__dirname, '../../data/flywheel/testcases/golden_set.json');

function getBatchFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('I25_batch_') && f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

async function createGoldenSet() {
  console.log("🌟 Creating Golden Set from failures...");

  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(`Report not found: ${REPORT_PATH}`);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  const failures = report.raw_results.filter((r: any) => 
    !r.semantic.signals_ok || !r.semantic.summary_ok || !r.semantic.followups_ok
  );

  console.log(`   Found ${failures.length} failed cases out of ${report.total_cases}.`);

  // Strategy: Pick up to 2 failures per archetype to ensure diversity
  const goldenIds = new Set<string>();
  const archetypeCounts: Record<string, number> = {};
  
  failures.forEach((f: any) => {
    const arc = f.archetype || 'Unknown';
    if (!archetypeCounts[arc]) archetypeCounts[arc] = 0;
    
    if (archetypeCounts[arc] < 2) {
      goldenIds.add(f.test_id);
      archetypeCounts[arc]++;
    }
  });

  // Fill up to 10 with random other failures if needed
  if (goldenIds.size < 10 && failures.length > 10) {
    failures.forEach((f: any) => {
      if (goldenIds.size < 10) goldenIds.add(f.test_id);
    });
  }

  console.log(`   Selected ${goldenIds.size} cases for Golden Set:`, Array.from(goldenIds));

  // Hydrate cases from batch files
  const goldenCases = [];
  const batchFiles = getBatchFiles(BATCH_DIR);

  for (const file of batchFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const tc of data.test_cases) {
      if (goldenIds.has(tc.test_id)) {
        goldenCases.push(tc);
      }
    }
  }

  // Save Golden Set
  const output = {
    batch_plan: {
      batch_index: 0,
      scenario_count: goldenCases.length,
      scenarios: goldenCases.map(c => c.description)
    },
    test_cases: goldenCases
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Golden Set saved to ${OUTPUT_PATH} (${goldenCases.length} cases)`);
}

createGoldenSet().catch(console.error);
