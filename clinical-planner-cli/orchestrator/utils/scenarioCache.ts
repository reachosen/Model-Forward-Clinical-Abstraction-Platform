/**
 * C9: Scenario List Cache
 *
 * Simple in-memory + file-based cache for scenario lists.
 * Keyed by concern_id/metric + domain to avoid regeneration across runs.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface ScenarioCacheEntry {
  scenarios: string[];
  created_at: string;
  seed?: string;
}

export interface ScenarioCacheOptions {
  cacheDir?: string;
  ttlMs?: number; // Time-to-live in milliseconds (default: 24 hours)
}

const DEFAULT_CACHE_DIR = path.join(__dirname, '../../data/cache/scenarios');
const CACHE_TTL_HOURS = parseInt(process.env.SCENARIO_CACHE_TTL_HOURS || '24', 10);
const DEFAULT_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

// In-memory cache for fast lookups
const memoryCache: Map<string, ScenarioCacheEntry> = new Map();

/**
 * Generate a cache key from concern_id, metric, and domain
 */
export function generateCacheKey(
  concernId: string,
  metric: string,
  domain: string
): string {
  const keyData = `${concernId}:${metric}:${domain}`;
  return crypto.createHash('md5').update(keyData).digest('hex');
}

/**
 * Get cache file path for a given key
 */
function getCacheFilePath(key: string, cacheDir: string): string {
  return path.join(cacheDir, `scenario_${key}.json`);
}

/**
 * Check if a cache entry is still valid (not expired)
 */
function isEntryValid(entry: ScenarioCacheEntry, ttlMs: number): boolean {
  const createdAt = new Date(entry.created_at).getTime();
  const now = Date.now();
  return now - createdAt < ttlMs;
}

/**
 * C9: Get cached scenarios if available
 * Returns null if cache miss or expired
 */
export function getScenarioCache(
  concernId: string,
  metric: string,
  domain: string,
  options: ScenarioCacheOptions = {}
): ScenarioCacheEntry | null {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  const key = generateCacheKey(concernId, metric, domain);

  // Check memory cache first
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key)!;
    if (isEntryValid(entry, ttlMs)) {
      console.log(`  📦 C9 Cache HIT (memory): ${concernId}/${metric}/${domain}`);
      return entry;
    }
    memoryCache.delete(key);
  }

  // Check file cache
  const filePath = getCacheFilePath(key, cacheDir);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const entry: ScenarioCacheEntry = JSON.parse(data);

      if (isEntryValid(entry, ttlMs)) {
        // Populate memory cache
        memoryCache.set(key, entry);
        console.log(`  📦 C9 Cache HIT (file): ${concernId}/${metric}/${domain}`);
        return entry;
      }
      // Expired, remove file
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`  ⚠️  C9 Cache read error: ${error}`);
    }
  }

  console.log(`  📦 C9 Cache MISS: ${concernId}/${metric}/${domain}`);
  return null;
}

/**
 * C9: Store scenarios in cache
 */
export function setScenarioCache(
  concernId: string,
  metric: string,
  domain: string,
  scenarios: string[],
  seed?: string,
  options: ScenarioCacheOptions = {}
): void {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  const key = generateCacheKey(concernId, metric, domain);

  const entry: ScenarioCacheEntry = {
    scenarios,
    created_at: new Date().toISOString(),
    seed,
  };

  // Store in memory
  memoryCache.set(key, entry);

  // Store in file
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filePath = getCacheFilePath(key, cacheDir);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
    console.log(`  💾 C9 Cache SET: ${concernId}/${metric}/${domain} (${scenarios.length} scenarios)`);
  } catch (error) {
    console.warn(`  ⚠️  C9 Cache write error: ${error}`);
  }
}

/**
 * C9: Invalidate cache entry (force regeneration)
 */
export function invalidateScenarioCache(
  concernId: string,
  metric: string,
  domain: string,
  options: ScenarioCacheOptions = {}
): void {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  const key = generateCacheKey(concernId, metric, domain);

  // Remove from memory
  memoryCache.delete(key);

  // Remove file
  const filePath = getCacheFilePath(key, cacheDir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  🗑️  C9 Cache INVALIDATED: ${concernId}/${metric}/${domain}`);
  }
}

/**
 * C9: Check if scenarios should be regenerated
 * Returns true if:
 * - forceRegenerate flag is set
 * - seed has changed from cached version
 * - cache is empty/expired
 */
export function shouldRegenerateScenarios(
  concernId: string,
  metric: string,
  domain: string,
  currentSeed?: string,
  forceRegenerate: boolean = false,
  options: ScenarioCacheOptions = {}
): boolean {
  if (forceRegenerate) {
    console.log(`  🔄 C9: Force regenerate flag set`);
    return true;
  }

  const cached = getScenarioCache(concernId, metric, domain, options);
  if (!cached) {
    return true;
  }

  // Check if seed changed
  if (currentSeed && cached.seed && currentSeed !== cached.seed) {
    console.log(`  🔄 C9: Seed changed (${cached.seed} -> ${currentSeed})`);
    return true;
  }

  return false;
}

/**
 * C9: Clear all scenario caches
 */
export function clearAllScenarioCaches(options: ScenarioCacheOptions = {}): void {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;

  // Clear memory cache
  memoryCache.clear();

  // Clear file cache
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir).filter(f => f.startsWith('scenario_'));
    files.forEach(f => fs.unlinkSync(path.join(cacheDir, f)));
    console.log(`  🗑️  C9: Cleared ${files.length} cached scenario files`);
  }
}
