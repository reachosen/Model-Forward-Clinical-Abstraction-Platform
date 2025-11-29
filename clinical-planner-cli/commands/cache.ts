/**
 * Cache Management Commands
 */

import { ResearchOrchestrator } from '../research/researchOrchestrator';

export async function listCache(options: any) {
  console.log(`\n📦 Research Cache\n`);

  const orchestrator = new ResearchOrchestrator();
  const cache = orchestrator.getCacheManager();

  const entries = await cache.list();

  if (entries.length === 0) {
    console.log(`   (empty)\n`);
    return;
  }

  // Group by concern
  const byConcern: Record<string, any[]> = {};
  entries.forEach(entry => {
    if (!byConcern[entry.concern_id]) {
      byConcern[entry.concern_id] = [];
    }
    byConcern[entry.concern_id].push(entry);
  });

  Object.entries(byConcern).forEach(([concern, concernEntries]) => {
    console.log(`   ${concern}:`);
    concernEntries.forEach(entry => {
      const cachedDate = new Date(entry.cached_date).toLocaleDateString();
      console.log(`      • ${entry.authority} (${entry.version}) - cached ${cachedDate}`);
    });
    console.log();
  });

  // Stats
  const stats = await cache.stats();
  console.log(`📊 Cache Statistics:`);
  console.log(`   Total Entries: ${stats.total_entries}`);
  console.log(`   Cache Size: ${stats.cache_size_mb.toFixed(2)} MB`);
  console.log(`   Concerns: ${stats.concerns.join(', ')}`);
  if (stats.oldest_cache) {
    console.log(`   Oldest Cache: ${new Date(stats.oldest_cache).toLocaleDateString()}`);
  }
  console.log();
}

export async function refreshCache(options: any) {
  const { concern } = options;

  if (!concern) {
    console.error('❌ Error: --concern is required');
    process.exit(1);
  }

  console.log(`\n🔄 Refreshing cache for ${concern}...`);

  const orchestrator = new ResearchOrchestrator();

  // Force refresh
  const research = await orchestrator.research(concern, undefined, {
    forceRefresh: true
  });

  console.log(`\n✅ Cache refreshed`);
  console.log(`   Sources: ${research.coverage.sources_successful}/${research.coverage.sources_attempted} updated\n`);
}

export async function clearCache(options: any) {
  const { confirm } = options;

  if (!confirm) {
    console.log(`\n⚠️  This will delete all cached research data.`);
    console.log(`   Run with --confirm to proceed.\n`);
    return;
  }

  console.log(`\n🗑️  Clearing cache...`);

  const orchestrator = new ResearchOrchestrator();
  const cache = orchestrator.getCacheManager();

  await cache.clear();

  console.log(`✅ Cache cleared\n`);
}
