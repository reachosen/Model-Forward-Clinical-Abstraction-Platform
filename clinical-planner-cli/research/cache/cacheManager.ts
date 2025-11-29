/**
 * Cache Manager
 *
 * Manages persistent storage of research data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ResearchSource, CacheEntry } from '../../models/ResearchBundle';

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.cwd(), '.research-cache');
  }

  /**
   * Get cached research source
   */
  async get(
    concernId: string,
    authority: string
  ): Promise<ResearchSource | null> {
    const cacheKey = this.getCacheKey(concernId, authority);
    const cachePath = path.join(this.cacheDir, cacheKey);

    try {
      const cached = await fs.readFile(cachePath, 'utf-8');
      const source: ResearchSource = JSON.parse(cached);

      // Note: Checksum validation is disabled as checksums are not being generated on save
      // If checksum validation is needed in the future, implement checksum generation in the set() method

      // Mark as cached and preserve original cached_date
      return {
        ...source,
        cache_status: 'cached',
        cached_date: source.cached_date || source.fetched_at
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // Cache miss
      }
      throw error;
    }
  }

  /**
   * Store research source in cache
   */
  async set(
    concernId: string,
    authority: string,
    source: ResearchSource
  ): Promise<void> {
    const cacheKey = this.getCacheKey(concernId, authority);
    const cachePath = path.join(this.cacheDir, cacheKey);

    // Ensure cache directory exists
    await fs.mkdir(this.cacheDir, { recursive: true });

    // Mark as cached and set cached_date
    const cachedSource: ResearchSource = {
      ...source,
      cache_status: 'cached',
      cached_date: new Date().toISOString()
    };

    // Write to cache
    await fs.writeFile(cachePath, JSON.stringify(cachedSource, null, 2));
  }

  /**
   * Delete cached research source
   */
  async delete(concernId: string, authority: string): Promise<void> {
    const cacheKey = this.getCacheKey(concernId, authority);
    const cachePath = path.join(this.cacheDir, cacheKey);

    try {
      await fs.unlink(cachePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all cached entries
   */
  async list(): Promise<CacheEntry[]> {
    const entries: CacheEntry[] = [];

    try {
      await fs.access(this.cacheDir);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // Cache directory doesn't exist yet
      }
      throw error;
    }

    const files = await fs.readdir(this.cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(this.cacheDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const source: ResearchSource = JSON.parse(content);

        entries.push({
          concern_id: this.extractConcernFromKey(file),
          authority: source.authority,
          version: source.version,
          cached_date: source.cached_date || source.fetched_at,
          cache_path: filePath
        });
      } catch (error) {
        console.warn(`   Skipping corrupted cache file: ${file}`);
      }
    }

    return entries;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{
    total_entries: number;
    cache_size_mb: number;
    concerns: string[];
    oldest_cache?: string;
  }> {
    const entries = await this.list();

    let totalSize = 0;
    const concerns = new Set<string>();
    let oldest: Date | null = null;

    for (const entry of entries) {
      concerns.add(entry.concern_id);

      try {
        const stats = await fs.stat(entry.cache_path);
        totalSize += stats.size;

        const cachedDate = new Date(entry.cached_date);
        if (!oldest || cachedDate < oldest) {
          oldest = cachedDate;
        }
      } catch (error) {
        // Ignore
      }
    }

    return {
      total_entries: entries.length,
      cache_size_mb: totalSize / (1024 * 1024),
      concerns: Array.from(concerns),
      oldest_cache: oldest?.toISOString()
    };
  }

  /**
   * Generate cache key from concern and authority
   */
  private getCacheKey(concernId: string, authority: string): string {
    const cleanAuthority = authority
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    return `${concernId.toLowerCase()}-${cleanAuthority}.json`;
  }

  /**
   * Extract concern ID from cache key
   */
  private extractConcernFromKey(filename: string): string {
    const match = filename.match(/^([^-]+)/);
    return match ? match[1].toUpperCase() : '';
  }

  // Note: Checksum validation functions removed as they were not being used
  // If checksum validation is needed in the future, implement:
  // 1. generateChecksum() when saving in set()
  // 2. validateChecksum() when loading in get()
}
