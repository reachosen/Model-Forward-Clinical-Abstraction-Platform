import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Paths, resolveMetricPath, MetricPath } from '../utils/pathConfig';

/**
 * plan:golden Tool
 * 
 * Purpose: Extract the 'Hardest' cases (failures) from recent runs 
 * and consolidate them into a high-density Golden Set for fast iteration.
 */

const program = new Command();

program
  .name('golden')
  .description('Create a high-density Golden Set from recent failures')
  .requiredOption('-m, --metric <id>', 'Metric ID (e.g., I32a)')
  .option('-d, --domain <name>', 'Domain name (optional)')
  .option('--max-cases <n>', 'Maximum cases to include', '10')
  .action(async (options) => {
    const { metric, domain: domainOverride, maxCases } = options;
    const limit = parseInt(maxCases, 10);

    let metricPath: MetricPath;
    try {
        metricPath = resolveMetricPath(metric);
    } catch {
        metricPath = { framework: 'USNWR', specialty: domainOverride || 'Orthopedics', metric };
    }

    const casesDir = Paths.metricTestcases(metricPath);
    const goldenPath = path.join(casesDir, 'golden_set.json');

    console.log(`\n🌟 Initializing Golden Set Creation for ${metric}`);
    console.log(`   Source Directory: ${casesDir}`);

    // 1. Identify Failures from Journal or Batch Results
    // We scan batch_1.json and identify cases that often fail (for now we pick a diverse sample)
    const batch1Path = path.join(casesDir, 'batch_1.json');
    if (!fs.existsSync(batch1Path)) {
        console.error(`❌ Error: batch_1.json not found. Run scaffold first.`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(batch1Path, 'utf-8'));
    const allCases = data.test_cases || [];
    const strategy = data.batch_strategy || data.batch_plan || { scenarios: [] };

    // Selection Strategy: Pick a mix of Doubt cases and Fail scenarios
    const selectedCases: any[] = [];
    const selectedScenarios: any[] = [];
    const archetypesTracked = new Set<string>();

    for (let i = 0; i < allCases.length; i++) {
        if (selectedCases.length >= limit) break;

        const tc = allCases[i];
        const scenario = strategy.scenarios[i];
        const archetype = scenario?.archetype || 'Unknown';

        // Priority 1: Doubt scenarios (Ambiguity is hard)
        // Priority 2: 2 cases per archetype to ensure coverage
        const isDoubt = scenario?.type === 'doubt';
        const needsArchetype = !archetypesTracked.has(archetype);

        if (isDoubt || needsArchetype) {
            selectedCases.push(tc);
            selectedScenarios.push(scenario);
            if (needsArchetype) archetypesTracked.add(archetype);
        }
    }

    // 2. Save Golden Set
    const output = {
        batch_strategy: {
            batch_index: 0,
            scenario_count: selectedCases.length,
            scenarios: selectedScenarios
        },
        test_cases: selectedCases
    };

    fs.writeFileSync(goldenPath, JSON.stringify(output, null, 2));

    console.log(`\n✅ Success: Created high-density Golden Set`);
    console.log(`   Path:  ${goldenPath}`);
    console.log(`   Size:  ${selectedCases.length} targeted scenarios`);
    console.log(`   Archetypes: ${Array.from(archetypesTracked).join(', ')}`);
    console.log(`\nNext: Run optimizer with --task to refine these specific cases.`);
  });

program.parse(process.argv);
