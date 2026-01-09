
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

    const metricPath = resolveMetricPath(metricId);
    const cliRoot = Paths.cliRoot();
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Check for API Key flag
    const apiKeyIdx = process.argv.indexOf('--api-key');
    const apiKey = apiKeyIdx !== -1 ? process.argv[apiKeyIdx + 1] : undefined;
    const apiKeyFlag = apiKey ? `--api-key ${apiKey}` : '';
    
    console.log(`\n🚀 eval:roundtrip metric=${metricId} run=${now}`);
    console.log(`\n  paths`);
    console.log(`  ├─ defs : ${path.join(Paths.metric(metricPath), 'definitions')}`);
    console.log(`  └─ out  : ${Paths.metricTestcases(metricPath)}\n`);

    // 1. Resolve Plan Path
    let planPath = path.join(cliRoot, 'output', `${metricId.toLowerCase()}-${metricPath.specialty?.toLowerCase()}`, 'plan.json');
    
    if (!fs.existsSync(planPath)) {
        // Try lean_plan.json
        const leanPath = path.join(cliRoot, 'output', `${metricId.toLowerCase()}-${metricPath.specialty?.toLowerCase()}`, 'lean_plan.json');
        if (fs.existsSync(leanPath)) {
            planPath = leanPath;
        } else {
            console.error(`❌ Plan not found: ${planPath} (or lean_plan.json). Run 'plan:generate' first.`);
            process.exit(1);
        }
    }

    try {
        // Step 1: Derive Strategy
        console.log(`
--- [1/3] Deriving Balanced 50 Per Task Strategy ---`);
        execSync(`npx ts-node tools/derive-strategy.ts --metric ${metricId} --plan "${planPath}" --auto-derive`, { stdio: 'inherit', cwd: cliRoot });

        // Step 2: Generate Raw Cases
        console.log(`
--- [2/3] Generating Raw Test Cases (Stage 1 LLM) ---`);
        execSync(`npx ts-node EvalsFactory/dataset/generate.ts run ${metricId} --resume ${apiKeyFlag}`, { stdio: 'inherit', cwd: cliRoot });

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

        // Step 4: Display Samples for Review
        const goldenPath = path.join(testcasesDir, 'golden_set_v2.json');
        const isVerbose = process.argv.includes('--verbose');

        if (fs.existsSync(goldenPath)) {
            const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
            const cases = golden.test_cases || [];
            if (cases.length > 0) {
                console.log(`\n  sample generated testcases (random 5 from golden_set_v2)`);
                console.log(`  └─ constraints.global=[EF]`);
                const shuffled = cases.sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, 5);
                
                const RUBRIC: Record<string, any> = {
                    'KNOWLEDGE': { code: 'CR', label: 'Recall', role: 'positive / coverage' },
                    'AMBIGUITY': { code: 'AH', label: 'Ambiguity Handling', role: 'ambiguity' },
                    'SAFETY':    { code: 'AC-NEG', label: 'Attribution Control', role: 'hard_negative' },
                    'SYNTHESIS': { code: 'AC', label: 'Context & Attribution', role: 'synthesis / causal' }
                };

                selected.forEach((c: any, i: number) => {
                    const char = i === selected.length - 1 ? '└─' : '├─';
                    const intent = c.metadata?.intent || 'KNOWLEDGE';
                    const dim = RUBRIC[intent] || RUBRIC['KNOWLEDGE'];
                    
                    // 1-Line Summary
                    console.log(`  ${char} ${c.test_id} | ${dim.code} | ${c.description}`);

                    // 2. [EXPECT] Block (Always visible)
                    const expectedSignals = c.contract?.expected_signals?.map((s: any) => s.signal_id).join(', ');
                    
                    if (dim.code === 'CR') {
                        console.log(`     └─ EXPECT required : must_find: [${expectedSignals}]`);
                    } else if (dim.code === 'AC') {
                        console.log(`     ├─ EXPECT required : must_find: [${expectedSignals}] (multi-signal chain)`);
                        console.log(`     └─ EXPECT forbidden: must_not_find: incorrect_cause`);
                    } else if (dim.code === 'AH') {
                        console.log(`     ├─ EXPECT required : must_surface: contradiction`);
                        console.log(`     └─ EXPECT forbidden: must_resolve_without_evidence`);
                    } else if (dim.code === 'AC-NEG') {
                        console.log(`     ├─ EXPECT required : must_find: unplanned_admission`);
                        console.log(`     └─ EXPECT forbidden: must_not_find: metric_related_complication`);
                    }

                    if (isVerbose) {
                        // 1. [META] Block
                        console.log(`     [META]`);
                        console.log(`       code        : ${dim.code}`);
                        console.log(`       dim         : ${dim.label}`);
                        console.log(`       role        : ${dim.role}`);
                        console.log(`       constraints : [EF]`);

                        // 2. [EXPECT] Block
                        console.log(`\n     [EXPECT]`);
                        const expectedSignals = c.contract?.expected_signals?.map((s: any) => s.signal_id).join(', ');
                        
                        if (dim.code === 'CR') {
                            console.log(`       required  : must_find: [${expectedSignals}]`);
                        } else if (dim.code === 'AC') {
                            console.log(`       required  : must_find: [${expectedSignals}] (multi-signal chain)`);
                            console.log(`       forbidden : must_not_find: incorrect_cause`);
                        } else if (dim.code === 'AH') {
                            console.log(`       required  : must_surface: contradiction`);
                            console.log(`       forbidden : must_resolve_without_evidence`);
                        } else if (dim.code === 'AC-NEG') {
                            console.log(`       required  : must_find: unplanned_admission`);
                            console.log(`       forbidden : must_not_find: metric_related_complication`);
                        }
                        
                        console.log(`       fidelity  : must_cite: verbatim_provenance`);
                        console.log(`                   forbidden: hallucination`);

                        // 3. [TEXT] Block
                        console.log(`\n     [TEXT]`);
                        const lines = c.patient_payload.split('\n');
                        lines.forEach((line: string) => {
                            console.log(`       ${line}`);
                        });
                        console.log(`\n`); 
                    }
                });
            }
        }

        console.log(`\n✔ eval:roundtrip complete metric=${metricId}`);
        console.log(`\n  next →`);
        console.log(`  npx ts-node bin/planner.ts safe:score -c ${metricId} -b golden_set_v2\n`);

    } catch (error: any) {
        console.error(`
❌ Roundtrip Failed:`, error.message);
        process.exit(1);
    }
}

main().catch(console.error);
