
import {
    execSync
} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
    Paths,
    resolveMetricPath
} from '../utils/pathConfig';

/**
 * Eval Roundtrip Orchestrator
 * 
 * Chains: 
 * 1. derive-strategy (Balanced 50)
 * 2. generate (Stage 1 LLM)
 * 3. accountant (Stage 2 Audit)
 */

async function main() {
    const metricId = process.argv[2];
    if (!metricId) {
        console.error("Usage: ts-node eval-roundtrip.ts <metricId>");
        process.exit(1);
    }

    console.log(`
🚀 Starting Eval Roundtrip for ${metricId}...`);

    // 1. Resolve Plan Path
    const metricPath = resolveMetricPath(metricId);
    const cliRoot = Paths.cliRoot();
    const planPath = path.join(cliRoot, 'output', `${metricId.toLowerCase()}-${metricPath.specialty?.toLowerCase()}`, 'plan.json');
    
    if (!fs.existsSync(planPath)) {
        console.error(`❌ Plan not found: ${planPath}. Run 'plan:generate' first.`);
        process.exit(1);
    }

    try {
        // Step 1: Derive Strategy
        console.log(`
--- [1/3] Deriving Balanced 50 Strategy ---`);
        execSync(`npx ts-node tools/derive-strategy.ts --metric ${metricId} --plan "${planPath}" --auto-derive`, { stdio: 'inherit', cwd: cliRoot });

        // Step 2: Generate Raw Cases
        console.log(`
--- [2/3] Generating Raw Test Cases (Stage 1 LLM) ---`);
        execSync(`npx ts-node EvalsFactory/dataset/generate.ts run ${metricId} --resume`, { stdio: 'inherit', cwd: cliRoot });

        // Step 3: Run Accountant
        console.log(`
--- [3/3] Running Accountant Audit (Stage 2 Verification) ---`);
        const testcasesDir = Paths.metricTestcases(metricPath);
        const batchFiles = fs.readdirSync(testcasesDir).filter(f => f.includes(`${metricId}_batch_`) && f.endsWith('.json'));
        
        if (batchFiles.length === 0) {
            throw new Error(`No batch files found in ${testcasesDir}`);
        }

        // Consolidate all batches into a single raw suite for the Accountant
        const allCases: any[] = [];
        console.log(`   Consolidating ${batchFiles.length} batches...`);
        batchFiles.forEach(f => {
            const content = JSON.parse(fs.readFileSync(path.join(testcasesDir, f), 'utf-8'));
            if (content.test_cases) {
                // Map archetype from scenario to test case
                const scenarios = content.batch_strategy?.scenarios || [];
                const mappedCases = content.test_cases.map((tc: any, idx: number) => ({
                    ...tc,
                    archetype: scenarios[idx]?.archetype || 'Preventability_Detective'
                }));
                allCases.push(...mappedCases);
            }
        });

        const rawSuitePath = path.join(testcasesDir, 'raw_suite.json');
        fs.writeFileSync(rawSuitePath, JSON.stringify(allCases, null, 2));

        // Run Accountant on the consolidated suite
        execSync(`npx ts-node tools/accountant.ts "${rawSuitePath}" ${metricId}`, { stdio: 'inherit', cwd: cliRoot });

        console.log(`
✅ Roundtrip Complete for ${metricId}!`);
        console.log(`   Artifacts ready in: ${testcasesDir}`);
        console.log(`   Run scorecard with: npx ts-node bin/planner.ts safe:score -c ${metricId} -b golden_set_v2`);

    } catch (error: any) {
        console.error(`
❌ Roundtrip Failed:`, error.message);
        process.exit(1);
    }
}

main().catch(console.error);
