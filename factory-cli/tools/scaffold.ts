import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Metric Scaffolding Tool (Command Center)
 * 
 * Purpose: One-click onboarding and roundtrip validation for a new metric.
 * Performs: Prompt Scaffolding -> Semantic Derivation -> Plan Generation -> Case Simulation -> SAFE Score.
 */

const program = new Command();

program
  .name('scaffold')
  .description('Scaffold and validate a new metric with a full roundtrip')
  .requiredOption('-d, --domain <name>', 'Domain name (e.g. Cardiology)')
  .requiredOption('-m, --metric <id>', 'Metric ID (e.g. C01)')
  .option('-s, --source <name>', 'Source domain for prompt templates', 'Orthopedics')
  .option('--skip-prompts', 'Skip prompt template scaffolding', false)
  .option('--skip-definitions', 'Skip definition derivation', false)
  .option('--skip-plan', 'Skip plan generation', false)
  .option('--skip-strategy', 'Skip test strategy derivation', false)
  .option('--skip-cases', 'Skip test case simulation', false)
  .option('--skip-score', 'Skip SAFE scoring', false)
  .option('--force', 'Force overwrite of existing definitions and cases', false)
  .action(async (options) => {
    const { domain, metric, source, skipPrompts, skipDefinitions, skipPlan, skipStrategy, skipCases, skipScore, force } = options;
    const startTime = Date.now();

        console.log(`\n🏗️  Scaffolding Metric: ${metric} (${domain})`);

        if (force) console.log('FORCE MODE: Overwriting existing artifacts.');

        console.log('═'.repeat(50));

    

        const run = (cmd: string, desc: string, step: number) => {

            console.log(`\n[Step ${step}/7] ▶️  ${desc}...`);

            try {

                execSync(cmd, { stdio: 'inherit' });

                console.log(`✅ ${desc} complete.`);

            } catch (err) {

                console.error(`❌ ${desc} failed. Stopping scaffold.`);

                process.exit(1);

            }

        };

    

        // Phase 1: Registry Check & Prompt Initialization

        const registryRoot = path.join(__dirname, '../domains_registry/USNWR');

        const domainPath = path.join(registryRoot, domain);

        const sharedPath = path.join(domainPath, '_shared');

        const promptsPath = path.join(sharedPath, 'prompts');

    

        console.log(`\n[Step 1/7] ▶️  Initializing Registry & Prompts...`);

        if (!fs.existsSync(sharedPath)) {

            console.error(`Error: Domain Registry not found at ${sharedPath}`);

            console.log("Please place your 'metrics.json', 'signals.json', and 'priority.json' there first.");

            process.exit(1);

        }

    

        if (!fs.existsSync(promptsPath) && !skipPrompts) {

            console.log('Initializing prompts from ' + source + '...');

            const sourcePrompts = path.join(registryRoot, source, '_shared/prompts');

            if (!fs.existsSync(sourcePrompts)) {

                console.error(`Error: Source prompts not found at ${sourcePrompts}`);

                process.exit(1);

            }

    

            if (!fs.existsSync(promptsPath)) fs.mkdirSync(promptsPath, { recursive: true });

            const files = fs.readdirSync(sourcePrompts);

            files.forEach(file => {

                if (file.endsWith('.md')) {

                    let content = fs.readFileSync(path.join(sourcePrompts, file), 'utf8');

                    const transformed = content.split(source).join(domain);

                    fs.writeFileSync(path.join(promptsPath, file), transformed);

                    console.log(`   📄 Scaffolded: ${file}`);

                }

            });

            console.log(`✅ Prompt initialization complete.`);

        } else if (skipPrompts) {

            console.log('⏭️  Skipping Prompt Scaffolding.');

        }

    

        // Phase 2: Derive Definitions

        if (skipDefinitions) {

            console.log('\n[Step 2/7] ⏭️  Skipping Deriving Definitions.');

        } else {

            const forceFlag = force ? ' --force' : '';

            run('npx ts-node tools/derive-definitions.ts --metric ' + metric + ' --domain ' + domain + forceFlag, 'Deriving Definitions', 2);

        }

    

            // Phase 3: Generate Plan

    

            const planPath = 'output/' + metric.toLowerCase() + '-' + domain + '/plan.json';

    

            if (skipPlan) {

    

                console.log('\n[Step 3/7] ⏭️  Skipping Plan Generation.');

    

            } else if (fs.existsSync(planPath) && !force) {

    

                console.log(`\n[Step 3/7] ⏭️  Plan already exists at ${planPath}. Skipping generation (Use --force to overwrite).`);

    

            } else {

    

                run('npx ts-node bin/planner.ts generate --concern ' + metric + ' --domain ' + domain, 'Generating plan.json', 3);

    

            }

    

        // Phase 4: Derive Test Plan

        const strategyPath = 'temp_strategy_' + metric + '.json';

        if (skipStrategy) {

            console.log('\n[Step 4/7] ⏭️  Skipping Test Plan derivation.');

        } else if (fs.existsSync(strategyPath) && !force) {

            console.log('\n[Step 4/7] ⏭️  Test Plan strategy already exists. Skipping derivation.');

        } else {

            run('npx ts-node tools/derive-strategy.ts --metric ' + metric + ' --plan ' + planPath + ' --auto-derive --out ' + strategyPath, 'Generating Test Plan', 4);

        }

    

            // Phase 5: Generate Test Cases

    

            const casesPath = 'domains_registry/USNWR/' + domain + '/metrics/' + metric + '/tests/testcases/batch_1.json';

    

            const goldenPath = 'domains_registry/USNWR/' + domain + '/metrics/' + metric + '/tests/testcases/golden_set.json';

    

            const casesDir = path.dirname(casesPath);

    

            if (!fs.existsSync(casesDir)) fs.mkdirSync(casesDir, { recursive: true });

        

        let currentCaseCount = 0;

        if (fs.existsSync(casesPath)) {

            try {

                const existingCases = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

                currentCaseCount = existingCases.test_cases?.length || 0;

            } catch (e) {}

        }

    

        let targetCount = 0;

        if (fs.existsSync(strategyPath)) {

            const strategy = JSON.parse(fs.readFileSync(strategyPath, 'utf-8'));

            targetCount = strategy.scenarios?.length || 0;

        }

    

        if (skipCases) {

            console.log('\n[Step 5/7] ⏭️  Skipping Test Case simulation.');

        } else if (currentCaseCount >= targetCount && targetCount > 0 && !force) {

            console.log(`\n[Step 5/7] ⏭️  Test Cases already complete (${currentCaseCount}/${targetCount}). Skipping simulation.`);

        }

        else {

            console.log(`\n[Step 5/7] ▶️  Simulating Test Cases (Incremental: ${currentCaseCount} existing)...`);

            const forceFlag = force ? ' --force' : '';

            run('npx ts-node tools/generate-cases.ts --strategy ' + strategyPath + ' --out ' + casesPath + ' --batch-size 2' + forceFlag, 'Simulating Test Cases', 5);

            

            // AUTO-GOLDEN: Extract hard cases immediately

            run('npx ts-node tools/create-golden.ts --metric ' + metric + ' --max-cases 10', 'Extracting Golden Set', 5);

        }

    

        // Phase 6: Run SAFE Score

        if (skipScore) {

            console.log('\n[Step 6/7] ⏭️  Skipping SAFE Validation.');

        } else {
            const reportPath = 'validation_report.json';
            // Use --format console to keep stdout pretty, but -o will force JSON file creation
            const cmd = `npx ts-node bin/planner.ts safe:score -c ${metric} -b batch_1 --test-dir ${casesDir} -o ${reportPath} --format console`;

            console.log(`\n[Step 6/7] ▶️  SAFE Roundtrip Validation...`);

            try {
                execSync(cmd, { stdio: 'inherit' });
                console.log(`✅ SAFE Roundtrip Validation complete.`);
            } catch (err) {
                console.error(`\n❌ SAFE Validation failed.`);
                console.log(`\n🚑 Initiating Auto-Heal Protocol...`);

                try {
                    execSync(`npx ts-node tools/auto-heal.ts ${reportPath}`, { stdio: 'inherit' });
                    console.log(`\n✅ Auto-Heal complete. Check 'factory-cli/learning_drafts/' for proposed patches.`);
                    console.log(`   👉 Action: Review the patch, apply it to your configuration, and re-run scaffold.`);
                } catch (healErr) {
                    console.error(`❌ Auto-Heal failed:`, healErr);
                }

                process.exit(1);
            }
        }

    

        // Phase 7: Final Status

        run('npx ts-node bin/planner.ts eval:status --metric ' + metric, 'Final QA Scorecard', 7);

    // Cleanup
    console.log('\nCleaning up temporary files...');
    if (fs.existsSync(strategyPath)) {
        fs.unlinkSync(strategyPath);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nSuccess: Inception complete for ${metric} in ${duration}s!`);
    console.log(`Review your artifacts:`);
    console.log(`- Plan: ${planPath}`);
    console.log(`- Tests: ${casesPath}`);
    console.log(`- Golden Set: ${goldenPath} (High-density)`);
  });

program.parse(process.argv);
