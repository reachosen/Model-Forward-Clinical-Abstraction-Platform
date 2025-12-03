#!/usr/bin/env node
/**
 * Interactive Batch Runner for CPPO Pipeline
 *
 * Allows selecting metrics by domain and running them through S0-S6.
 * Features:
 * - Interactive domain/metric selection
 * - Single or batch execution
 * - Real-time progress tracking
 * - Summary reports
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { S0_InputNormalizationStage } from './stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from './stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from './stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from './stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from './stages/S4_PromptPlanGeneration';
import { S5_TaskExecutionStage } from './stages/S5_TaskExecution';
import { S6_PlanAssemblyStage } from './stages/S6_PlanAssembly';
import { getAllDomains, getConcernsByDomain, getConcernMetadata } from '../config/concernRegistry';

// ============================================================================
// ANSI Colors for Terminal
// ============================================================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Interactive Prompt Utilities
// ============================================================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// ============================================================================
// Metric Catalog
// ============================================================================
interface MetricInfo {
  concernId: string;
  domain: string;
  archetype: string;
  description: string;
}

function getAvailableMetrics(): Map<string, MetricInfo[]> {
  const domains = getAllDomains();
  const catalog = new Map<string, MetricInfo[]>();

  for (const domain of domains) {
    const concerns = getConcernsByDomain(domain);
    const metrics: MetricInfo[] = [];

    for (const concernId of concerns) {
      const metadata = getConcernMetadata(concernId);
      if (metadata) {
        metrics.push({
          concernId,
          domain: metadata.domain,
          archetype: metadata.archetype,
          description: metadata.description,
        });
      }
    }

    if (metrics.length > 0) {
      catalog.set(domain, metrics);
    }
  }

  return catalog;
}

// ============================================================================
// Main Menu
// ============================================================================
async function showMainMenu(): Promise<void> {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║       CPPO Pipeline - Interactive Batch Runner               ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  log('');
  log('Select an option:', 'cyan');
  log('  1. Run single metric', 'blue');
  log('  2. Run multiple metrics (batch)', 'blue');
  log('  3. Run all metrics in a domain', 'blue');
  log('  4. View metric catalog', 'blue');
  log('  5. Exit', 'dim');
  log('');

  const choice = await question('Enter choice (1-5): ');

  switch (choice.trim()) {
    case '1':
      await runSingleMetric();
      break;
    case '2':
      await runBatch();
      break;
    case '3':
      await runDomainBatch();
      break;
    case '4':
      await viewCatalog();
      break;
    case '5':
      log('\nGoodbye! 👋\n', 'green');
      rl.close();
      process.exit(0);
      break;
    default:
      log('Invalid choice. Please try again.', 'red');
      await question('Press Enter to continue...');
      await showMainMenu();
  }
}

// ============================================================================
// View Catalog
// ============================================================================
async function viewCatalog(): Promise<void> {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║                    Metric Catalog                             ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  log('');

  const catalog = getAvailableMetrics();

  for (const [domain, metrics] of catalog.entries()) {
    log(`\n${domain} (${metrics.length} metrics):`, 'cyan');
    log('─'.repeat(60), 'dim');

    metrics.slice(0, 5).forEach((metric, idx) => {
      log(`  ${idx + 1}. ${metric.concernId.padEnd(10)} - ${metric.description}`, 'blue');
      log(`     Archetype: ${metric.archetype}`, 'dim');
    });

    if (metrics.length > 5) {
      log(`  ... and ${metrics.length - 5} more`, 'dim');
    }
  }

  log('');
  await question('Press Enter to return to main menu...');
  await showMainMenu();
}

// ============================================================================
// Run Single Metric
// ============================================================================
async function runSingleMetric(): Promise<void> {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║                  Run Single Metric                            ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  log('');

  // Select domain
  const domains = getAllDomains();
  log('Available domains:', 'cyan');
  domains.forEach((domain, idx) => {
    const count = getConcernsByDomain(domain).length;
    log(`  ${idx + 1}. ${domain} (${count} metrics)`, 'blue');
  });
  log('');

  const domainChoice = await question('Select domain (1-' + domains.length + '): ');
  const domainIdx = parseInt(domainChoice.trim()) - 1;

  if (domainIdx < 0 || domainIdx >= domains.length) {
    log('Invalid selection.', 'red');
    await question('Press Enter to continue...');
    await showMainMenu();
    return;
  }

  const selectedDomain = domains[domainIdx];
  const concerns = getConcernsByDomain(selectedDomain);

  // Select metric
  log(`\nMetrics in ${selectedDomain}:`, 'cyan');
  concerns.forEach((concern, idx) => {
    const meta = getConcernMetadata(concern);
    log(`  ${idx + 1}. ${concern.padEnd(10)} - ${meta?.description || ''}`, 'blue');
  });
  log('');

  const metricChoice = await question('Select metric (1-' + concerns.length + '): ');
  const metricIdx = parseInt(metricChoice.trim()) - 1;

  if (metricIdx < 0 || metricIdx >= concerns.length) {
    log('Invalid selection.', 'red');
    await question('Press Enter to continue...');
    await showMainMenu();
    return;
  }

  const selectedConcern = concerns[metricIdx];

  // Confirm and run
  log('');
  log(`You selected: ${selectedConcern} (${selectedDomain})`, 'green');
  const confirm = await question('Run this metric? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    await executePipeline([selectedConcern]);
  }

  await question('\nPress Enter to return to main menu...');
  await showMainMenu();
}

// ============================================================================
// Run Batch (Multiple Metrics)
// ============================================================================
async function runBatch(): Promise<void> {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║                  Run Batch (Multiple Metrics)                 ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  log('');

  log('Enter concern IDs separated by commas (e.g., I25,I26,I32b):', 'cyan');
  const input = await question('Concern IDs: ');

  const concernIds = input.split(',').map(id => id.trim()).filter(id => id.length > 0);

  if (concernIds.length === 0) {
    log('No valid concern IDs entered.', 'red');
    await question('Press Enter to continue...');
    await showMainMenu();
    return;
  }

  log('');
  log(`You entered ${concernIds.length} metrics:`, 'green');
  concernIds.forEach(id => log(`  - ${id}`, 'blue'));
  log('');

  const confirm = await question('Run these metrics? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    await executePipeline(concernIds);
  }

  await question('\nPress Enter to return to main menu...');
  await showMainMenu();
}

// ============================================================================
// Run Domain Batch (All Metrics in Domain)
// ============================================================================
async function runDomainBatch(): Promise<void> {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║                  Run All Metrics in Domain                    ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  log('');

  const domains = getAllDomains();
  log('Available domains:', 'cyan');
  domains.forEach((domain, idx) => {
    const count = getConcernsByDomain(domain).length;
    log(`  ${idx + 1}. ${domain} (${count} metrics)`, 'blue');
  });
  log('');

  const choice = await question('Select domain (1-' + domains.length + '): ');
  const domainIdx = parseInt(choice.trim()) - 1;

  if (domainIdx < 0 || domainIdx >= domains.length) {
    log('Invalid selection.', 'red');
    await question('Press Enter to continue...');
    await showMainMenu();
    return;
  }

  const selectedDomain = domains[domainIdx];
  const concerns = getConcernsByDomain(selectedDomain);

  log('');
  log(`This will run ${concerns.length} metrics from ${selectedDomain}:`, 'yellow');
  concerns.slice(0, 10).forEach(id => log(`  - ${id}`, 'dim'));
  if (concerns.length > 10) {
    log(`  ... and ${concerns.length - 10} more`, 'dim');
  }
  log('');

  const confirm = await question('Proceed? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    await executePipeline(concerns);
  }

  await question('\nPress Enter to return to main menu...');
  await showMainMenu();
}

// ============================================================================
// Execute Pipeline
// ============================================================================
interface ExecutionResult {
  concernId: string;
  success: boolean;
  planId?: string;
  error?: string;
  duration: number;
}

async function executePipeline(concernIds: string[]): Promise<void> {
  log('');
  log('═'.repeat(65), 'bright');
  log('Starting Pipeline Execution', 'bright');
  log('═'.repeat(65), 'bright');
  log('');

  const results: ExecutionResult[] = [];
  const outputDir = path.join(__dirname, '..', 'output', 'batch-runs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < concernIds.length; i++) {
    const concernId = concernIds[i];
    const startTime = Date.now();

    log(`\n[${ i + 1 }/${concernIds.length}] Processing: ${concernId}`, 'cyan');
    log('─'.repeat(60), 'dim');

    try {
      // Initialize stages
      const s0 = new S0_InputNormalizationStage();
      const s1 = new S1_DomainResolutionStage();
      const s2 = new S2_StructuralSkeletonStage();
      const s3 = new S3_TaskGraphIdentificationStage();
      const s4 = new S4_PromptPlanGenerationStage();
      const s5 = new S5_TaskExecutionStage();
      const s6 = new S6_PlanAssemblyStage();

      // Build input
      const input = {
        planning_input_id: `batch_${concernId}_${Date.now()}`,
        concern: `${concernId} quality review`,
        concern_id: concernId,
        intent: 'quality_reporting',
        target_population: 'pediatric',
      };

      // Execute pipeline
      log('  S0: Input Normalization...', 'blue');
      const routed = await s0.execute(input);

      log('  S1: Domain Resolution...', 'blue');
      const domain = await s1.execute(routed);

      log('  S2: Structural Skeleton...', 'blue');
      const skeleton = await s2.execute(routed, domain);

      log('  S3: Task Graph...', 'blue');
      const graph = await s3.execute(routed, domain, skeleton);

      log('  S4: Prompt Plan...', 'blue');
      const prompts = await s4.execute(graph, domain);

      log('  S5: Task Execution (LLM calls)...', 'blue');
      const taskResults = await s5.execute(prompts, graph, skeleton, domain);

      log('  S6: Plan Assembly...', 'blue');
      const plan = await s6.execute(skeleton, taskResults, domain);

      // Save plan
      const filename = `plan_${concernId}_${Date.now()}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(plan, null, 2));

      const duration = Date.now() - startTime;
      log(`  ✅ Success! Plan ID: ${plan.plan_metadata.plan_id}`, 'green');
      log(`  📁 Saved: ${filename}`, 'dim');
      log(`  ⏱️  Duration: ${(duration / 1000).toFixed(1)}s`, 'dim');

      results.push({
        concernId,
        success: true,
        planId: plan.plan_metadata.plan_id,
        duration,
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      log(`  ❌ Failed: ${error.message}`, 'red');

      results.push({
        concernId,
        success: false,
        error: error.message,
        duration,
      });
    }
  }

  // Summary
  log('');
  log('═'.repeat(65), 'bright');
  log('Execution Summary', 'bright');
  log('═'.repeat(65), 'bright');
  log('');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  log(`Total: ${results.length} metrics`, 'cyan');
  log(`✅ Successful: ${successful}`, successful > 0 ? 'green' : 'dim');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'dim');
  log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`, 'dim');
  log('');

  if (failed > 0) {
    log('Failed metrics:', 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`  - ${r.concernId}: ${r.error}`, 'dim');
    });
    log('');
  }

  log(`📁 Plans saved to: ${outputDir}`, 'cyan');
}

// ============================================================================
// Main Entry Point
// ============================================================================
async function main() {
  try {
    await showMainMenu();
  } catch (error: any) {
    log(`\nError: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
