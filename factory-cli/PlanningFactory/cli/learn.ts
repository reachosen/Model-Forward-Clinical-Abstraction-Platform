#!/usr/bin/env node
/**
 * Learning CLI
 *
 * Human-triggered learning loop for continuous improvement.
 * Processes rejected configs from the learning queue and proposes patches.
 *
 * Usage:
 *   npm run learn              # Process all pending items
 *   npm run learn -- --status  # Show queue summary
 *   npm run learn -- --mock    # Use mock mode instead of LLM
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadLearningQueue,
  getItemsByStatus,
  updateLearningItem,
  getQueueSummary,
} from '../planner/learningQueueStorage';
import { proposeLearningPatch } from '../planner/learningAgent';
import { LearningQueueItem, LearningPatch } from '../../models/LearningQueue';

// Parse CLI arguments
const args = process.argv.slice(2);
const showStatus = args.includes('--status') || args.includes('-s');
const useMock = args.includes('--mock') || args.includes('-m');
const dryRun = args.includes('--dry-run') || args.includes('-d');
const itemId = args.find(arg => arg.startsWith('--id='))?.split('=')[1];

// Paths
const DRAFTS_DIR = path.join(__dirname, '..', 'learning_drafts');

/**
 * Ensure learning drafts directory exists
 */
function ensureDraftsDirectory(): void {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

/**
 * Save a learning patch to drafts directory
 */
function savePatchToDrafts(patch: LearningPatch): string {
  ensureDraftsDirectory();
  const filename = `${patch.source_queue_item_id}.json`;
  const filepath = path.join(DRAFTS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(patch, null, 2), 'utf-8');
  return filepath;
}

/**
 * Display queue summary
 */
function displayQueueSummary(): void {
  const summary = getQueueSummary();

  console.log(`\n📊 Learning Queue Summary\n`);
  console.log(`Total Items: ${summary.total}`);
  console.log(``);
  console.log(`By Status:`);
  console.log(`  Pending:        ${summary.by_status.pending || 0}`);
  console.log(`  Draft Proposed: ${summary.by_status.draft_proposed || 0}`);
  console.log(`  Patched:        ${summary.by_status.patched || 0}`);
  console.log(`  Discarded:      ${summary.by_status.discarded || 0}`);
  console.log(``);

  if (Object.keys(summary.by_archetype).length > 0) {
    console.log(`By Archetype:`);
    Object.entries(summary.by_archetype)
      .sort((a, b) => b[1] - a[1])
      .forEach(([archetype, count]) => {
        console.log(`  ${archetype}: ${count}`);
      });
  }
}

/**
 * Process a single learning queue item
 */
async function processItem(item: LearningQueueItem): Promise<void> {
  console.log(`\n🔍 Processing: ${item.id}`);
  console.log(`   Archetype: ${item.archetype}`);
  console.log(`   Domain: ${item.domain}`);
  console.log(`   Review Target: ${item.review_target}`);
  console.log(`   Comment: ${item.reviewer_comment.substring(0, 100)}${item.reviewer_comment.length > 100 ? '...' : ''}`);

  // Propose patch
  const patch = await proposeLearningPatch(item, useMock);

  console.log(`   ✅ Patch proposed`);
  console.log(`      Target: ${patch.target}`);
  console.log(`      Confidence: ${(patch.confidence * 100).toFixed(0)}%`);
  console.log(`      Summary: ${patch.explanation_summary}`);

  if (!dryRun) {
    // Save patch to drafts
    const filepath = savePatchToDrafts(patch);
    console.log(`      Saved to: ${filepath}`);

    // Update item status
    item.status = 'draft_proposed';
    updateLearningItem(item);
    console.log(`      Status updated: pending → draft_proposed`);
  } else {
    console.log(`      [DRY RUN] Would save patch and update status`);
  }
}

/**
 * Main learning loop
 */
async function main(): Promise<void> {
  console.log(`\n🧠 Clinical Abstraction Planner - Learning Loop\n`);

  // Show status and exit
  if (showStatus) {
    displayQueueSummary();
    return;
  }

  // Process specific item
  if (itemId) {
    const queue = loadLearningQueue();
    const item = queue.find(i => i.id === itemId);

    if (!item) {
      console.error(`❌ Learning queue item not found: ${itemId}`);
      process.exit(1);
    }

    await processItem(item);
    return;
  }

  // Load pending items
  const pendingItems = getItemsByStatus('pending');

  if (pendingItems.length === 0) {
    console.log(`✅ No pending items in learning queue`);
    console.log(`\nRun with --status to see queue summary`);
    return;
  }

  console.log(`Found ${pendingItems.length} pending item(s) in learning queue`);

  if (useMock) {
    console.log(`⚠️  Using MOCK mode (LLM not called)`);
  }

  if (dryRun) {
    console.log(`⚠️  DRY RUN mode (no changes will be saved)`);
  }

  // Process each item
  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    console.log(`\n[${i + 1}/${pendingItems.length}]`);
    await processItem(item);
  }

  // Summary
  console.log(`\n✅ Learning loop complete`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review proposed patches in: ${DRAFTS_DIR}`);
  console.log(`  2. Apply relevant patches to:`);
  console.log(`     - signal_library/*.json`);
  console.log(`     - hac_rules/index.ts`);
  console.log(`     - USNWR question templates`);
  console.log(`     - planner prompts`);
  console.log(`  3. Test updated configs with example inputs`);
  console.log(`  4. Mark applied items as "patched" or "discarded"`);
}

// Run
main().catch(error => {
  console.error(`\n❌ Learning loop failed:`, error);
  process.exit(1);
});
