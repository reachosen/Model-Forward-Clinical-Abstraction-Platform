
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POC Auto-Heal Loop Runner
 * Enforces: Frozen Eval, One Knob, Hard Stop, Best-so-far
 */

const CONCERN = 'I32a';
const BATCH = 'single_fail_test';
const MAX_ITERS = 10;
const NO_IMPROVE_LIMIT = 3;
const REPORT_PATH = path.join(process.cwd(), 'validation_report.json');
const PROMPT_PATH = path.join(__dirname, '../domains_registry/USNWR/Orthopedics/_shared/prompts/signal_enrichment.md');

interface State {
    iteration: number;
    bestScore: number;
    bestPrompt: string;
    noImproveCount: number;
    history: Array<{ iteration: number, score: number, delta: number }>;
}

function getScore(): number {
    if (!fs.existsSync(REPORT_PATH)) return 0;
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    return report.summary.mean_scores.composite || 0;
}

async function run() {
    console.log(`
🚀 Starting POC Auto-Heal Loop for ${CONCERN}...`);
    
    const initialState: State = {
        iteration: 0,
        bestScore: -1,
        bestPrompt: fs.readFileSync(PROMPT_PATH, 'utf-8'),
        noImproveCount: 0,
        history: []
    };

    let state = initialState;

    while (state.iteration < MAX_ITERS) {
        state.iteration++;
        console.log(`
--- Iteration #${state.iteration} ---`);

        // 1. Run Eval
        console.log(`📊 Running evaluation...`);
        try {
            execSync(`npx ts-node factory-cli/bin/planner.ts safe:score --concern ${CONCERN} --batch ${BATCH} --output "${REPORT_PATH}" --format json`, { stdio: 'inherit' });
        } catch (e) {
            console.log(`⚠️  Eval command returned non-zero (expected if failing).`);
        }

        const score = getScore();
        const delta = score - state.bestScore;
        console.log(`📈 Score: ${score.toFixed(4)} (Delta: ${delta >= 0 ? '+' : ''}${delta.toFixed(4)})`);

        // 2. Best-so-far & Regression Check
        if (score > state.bestScore) {
            console.log(`🌟 NEW BEST! Saving prompt version.`);
            state.bestScore = score;
            state.bestPrompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
            state.noImproveCount = 0;
        } else {
            state.noImproveCount++;
            console.log(`📉 No improvement (${state.noImproveCount}/${NO_IMPROVE_LIMIT}).`);
            
            if (score < state.bestScore) {
                console.log(`⏪ REGRESSION detected. Rolling back to best-so-far.`);
                fs.writeFileSync(PROMPT_PATH, state.bestPrompt, 'utf-8');
            }
        }

        state.history.push({ iteration: state.iteration, score, delta });

        // 3. Stop Conditions
        if (score >= 1.0) {
            console.log(`
✅ PERFECT SCORE REACHED. Stopping.`);
            break;
        }

        if (state.noImproveCount >= NO_IMPROVE_LIMIT) {
            console.log(`
🛑 HARD STOP: No improvement for ${NO_IMPROVE_LIMIT} iterations.`);
            break;
        }

        // 4. Heal (The "One Knob")
        console.log(`🚑 Triggering Auto-Heal...`);
        try {
            execSync(`npx ts-node factory-cli/tools/auto-heal.ts "${REPORT_PATH}"`, { stdio: 'inherit' });
        } catch (e) {
            console.error(`❌ Auto-Heal failed:`, e);
            break;
        }
    }

    console.log(`
🏁 POC Loop Finished.`);
    console.log(`Final Best Score: ${state.bestScore.toFixed(4)}`);
    console.log(`Total Iterations: ${state.iteration}`);
}

run().catch(console.error);
