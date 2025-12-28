/**
 * Strategy Validator Tool
 * 
 * Analyzes the Quality of a BatchStrategy.
 * Checks for:
 * - Scenario Count (Statistical significance)
 * - Archetype Diversity (Coverage)
 * - Adversarial Hardness (Doubt modifiers)
 * - Specificity (Description length)
 * 
 * Usage:
 *   npx ts-node tools/validate-strategy.ts --metric <metric_id>
 */

import { loadBatchStrategy, getAllBatchStrategies, BatchStrategy } from '../EvalsFactory/dataset/BatchStrategy';

const MIN_SCENARIOS_WARNING = 5;
const MIN_DOUBT_RATIO = 0.3; // 30% of cases should have doubt modifiers

function analyzeStrategy(strategy: BatchStrategy) {
  console.log(`
🧐 Analyzing Strategy: ${strategy.metric_id} (${strategy.domain})`);
  console.log(`   Tasks: ${strategy.task_ids.join(', ')}`);
  
  const scenarios = strategy.scenarios;
  const count = scenarios.length;
  
  // 1. Count Check
  console.log(`
📊 1. VOLUME Check`);
  if (count < MIN_SCENARIOS_WARNING) {
    console.log(`   ⚠️  WARNING: Only ${count} scenarios. Recommended: ${MIN_SCENARIOS_WARNING}+ for reliable signal.`);
  } else {
    console.log(`   ✅ PASS: ${count} scenarios.`);
  }

  // 2. Archetype Diversity
  console.log(`
🎨 2. DIVERSITY Check (Archetypes)`);
  const archetypes = new Set(scenarios.map(s => s.archetype));
  console.log(`   Found: ${Array.from(archetypes).join(', ')}`);
  if (archetypes.size < 2) {
    console.log(`   ⚠️  WARNING: Low diversity. Only ${archetypes.size} archetype(s). Consider adding more perspectives.`);
  } else {
    console.log(`   ✅ PASS: Good diversity (${archetypes.size} archetypes).`);
  }

  // 3. Adversarial Hardness
  console.log(`
⚔️  3. HARDNESS Check (Doubt/Perturbations)`);
  const doubtCount = scenarios.filter(s => s.doubt && s.doubt.length > 0).length;
  const doubtRatio = doubtCount / count;
  console.log(`   Adversarial Scenarios: ${doubtCount}/${count} (${(doubtRatio * 100).toFixed(0)}%)`);
  
  if (doubtRatio < MIN_DOUBT_RATIO) {
    console.log(`   ⚠️  WARNING: Strategy is too "Happy Path". Add more 'doubt' modifiers (ambiguity, conflict).`);
  } else {
    console.log(`   ✅ PASS: Sufficiently adversarial.`);
  }

  // 4. Clarity Check
  console.log(`
📝 4. CLARITY Check`);
  const shortDescriptions = scenarios.filter(s => s.description.length < 20);
  if (shortDescriptions.length > 0) {
    console.log(`   ⚠️  WARNING: ${shortDescriptions.length} descriptions are very short (<20 chars). The LLM might hallucinate context.`);
    shortDescriptions.forEach(s => console.log(`      - "${s.description}"`));
  } else {
    console.log(`   ✅ PASS: Descriptions look detailed.`);
  }

  console.log(`
🏁 Overall Quality Assessment:`);
  const passedChecks = [
    count >= MIN_SCENARIOS_WARNING,
    archetypes.size >= 2,
    doubtRatio >= MIN_DOUBT_RATIO,
    shortDescriptions.length === 0
  ].filter(x => x).length;

  const score = passedChecks / 4;
  if (score === 1) console.log(`   ⭐⭐⭐⭐ EXCELLENT STRATEGY`);
  else if (score >= 0.75) console.log(`   ⭐⭐⭐ GOOD STRATEGY`);
  else if (score >= 0.5) console.log(`   ⭐⭐ WEAK STRATEGY`);
  else console.log(`   ⭐ POOR STRATEGY - Needs Work`);
}

function main() {
  const args = process.argv.slice(2);
  const metricArgIndex = args.indexOf('--metric');
  
  if (metricArgIndex !== -1) {
    const metricId = args[metricArgIndex + 1];
    try {
      const strategy = loadBatchStrategy(metricId);
      analyzeStrategy(strategy);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('Validating ALL strategies...');
    const strategies = getAllBatchStrategies();
    strategies.forEach(s => analyzeStrategy(s));
  }
}

main();
