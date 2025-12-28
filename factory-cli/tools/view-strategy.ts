/**
 * Strategy Viewer Tool
 * 
 * Renders a BatchStrategy JSON in a beautiful, human-readable CLI format.
 * 
 * Usage:
 *   npx ts-node tools/view-strategy.ts --metric <metric_id>
 */

import { loadBatchStrategy, getAllBatchStrategies, BatchStrategy } from '../EvalsFactory/dataset/BatchStrategy';

function printHeader(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log(`${'='.repeat(60)}`);
}

function printSection(title: string) {
  console.log(`\n🔹 ${title.toUpperCase()}`);
  console.log(`${'-'.repeat(30)}`);
}

function viewStrategy(strategy: BatchStrategy) {
  printHeader(`STRATEGY: ${strategy.metric_id}`);
  
  console.log(`   📂 Domain:    ${strategy.domain}`);
  console.log(`   🎯 Tasks:     ${strategy.task_ids.join(', ')}`);
  
  if (strategy.global_duet) {
    console.log(`   🧠 Global Duet: ${strategy.global_duet.persona} (Source: ${strategy.global_duet.knowledge_source_id})`);
  }

  printSection(`SCENARIOS (${strategy.scenarios.length})`);

  strategy.scenarios.forEach((s, i) => {
    console.log(`\n   ${i + 1}. [${s.archetype}]`);
    console.log(`      📝 "${s.description}"`);
    
    if (s.duet) {
      console.log(`      🧠 Duet: ${s.duet.persona}`);
    }

    if (s.doubt && s.doubt.length > 0) {
      console.log(`      ⚔️  DOUBT (Adversarial):`);
      s.doubt.forEach(d => {
        console.log(`         - [${d.type.toUpperCase()}] ${d.instruction}`);
      });
    } else {
      console.log(`      ✨ Happy Path (No perturbations)`);
    }
  });
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const metricArgIndex = args.indexOf('--metric');
  
  if (metricArgIndex !== -1) {
    const metricId = args[metricArgIndex + 1];
    try {
      const strategy = loadBatchStrategy(metricId);
      viewStrategy(strategy);
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('Available strategies:');
    const strategies = getAllBatchStrategies();
    strategies.forEach(s => console.log(` - ${s.metric_id} (${s.domain})`));
    console.log('\nUsage: npx ts-node tools/view-strategy.ts --metric <id>');
  }
}

main();
