/**
 * Research Orchestrator
 *
 * Coordinates research fetching, caching, and clinical tools
 */

import { CacheManager } from './cache/cacheManager';
import { BaseFetcher } from './fetchers/baseFetcher';
import { CDCNHSNFetcher } from './fetchers/cdcNHSNFetcher';
import { SPSFetcher } from './fetchers/spsFetcher';
import { BaseClinicalTool } from './tools/baseTool';
import { KDIGOAKIStaging } from './tools/kdigo';
import {
  ResearchBundle,
  ResearchSource,
  ClinicalTool,
  ConflictResolution,
  ResearchOptions
} from '../models/ResearchBundle';

export class ResearchOrchestrator {
  private cache: CacheManager;
  private fetchers: Map<string, BaseFetcher>;
  private tools: Map<string, BaseClinicalTool>;

  constructor(cacheDir?: string) {
    this.cache = new CacheManager(cacheDir);

    // Register fetchers
    this.fetchers = new Map<string, BaseFetcher>([
      ['CDC NHSN', new CDCNHSNFetcher()],
      ['SPS', new SPSFetcher()]
      // Add USNWR and AHRQ fetchers when implemented
    ]);

    // Register clinical tools
    this.tools = new Map([
      ['kdigo-aki-staging', new KDIGOAKIStaging()]
      // Add more tools as implemented
    ]);
  }

  /**
   * Main research workflow
   */
  async research(
    concernId: string,
    domain?: string,
    options: ResearchOptions = {}
  ): Promise<ResearchBundle> {
    console.log(`🔍 Researching ${concernId}${domain ? ` (${domain})` : ''}...`);

    const sources: ResearchSource[] = [];
    const sourcesToFetch = this.getSourcesForConcern(concernId);

    let sourcesAttempted = 0;
    let sourcesSuccessful = 0;

    // Fetch each source (with caching)
    for (const [authority, fetcher] of sourcesToFetch) {
      sourcesAttempted++;

      try {
        let source: ResearchSource | null = null;

        // Try cache first unless force refresh
        if (!options.forceRefresh) {
          source = await this.cache.get(concernId, authority);
          if (source) {
            console.log(`   ✅ ${authority} (cached ${this.formatDate(source.cached_date || source.fetched_at)})`);
          }
        }

        // Fetch live if not cached or force refresh
        if (!source) {
          console.log(`   ⏳ ${authority} (fetching live...)`);
          source = await fetcher.fetch(concernId, domain);

          // Save to cache
          await this.cache.set(concernId, authority, source);
          console.log(`   ✅ ${authority} (fetched live)`);
        }

        sources.push(source);
        sourcesSuccessful++;

      } catch (error: any) {
        console.error(`   ❌ ${authority} (${error.message})`);
      }
    }

    // Identify relevant clinical tools
    const clinical_tools = this.getToolsForConcern(concernId, domain);

    // Detect conflicts between sources
    const conflicts = this.detectConflicts(sources);

    // Calculate coverage score
    const coverage_score = sourcesAttempted > 0
      ? sourcesSuccessful / sourcesAttempted
      : 0;

    const bundle: ResearchBundle = {
      research_id: this.generateResearchId(concernId, domain),
      concern_id: concernId,
      domain: domain || 'general',
      generated_at: new Date().toISOString(),
      coverage: {
        sources_attempted: sourcesAttempted,
        sources_successful: sourcesSuccessful,
        coverage_score
      },
      sources,
      clinical_tools,
      conflicts,
      research_confidence: this.calculateConfidence(coverage_score, conflicts.length)
    };

    console.log(`\n   Research Coverage: ${Math.round(coverage_score * 100)}% (${sourcesSuccessful}/${sourcesAttempted} sources) ${coverage_score >= 0.75 ? '✅' : '⚠️'}`);

    return bundle;
  }

  /**
   * Determine which sources to fetch for a given concern (with ranking-aware prioritization)
   *
   * Uses USNWR ranking data to prioritize authoritative sources for highly-ranked specialties.
   * Goal: Drive Lurie toward #1 by using domain-specific, high-quality sources.
   */
  private getSourcesForConcern(concernId: string): Map<string, BaseFetcher> {
    const { detectDomain } = require('../utils/domainDetection');
    const { getPriorityResearchSources } = require('../utils/rankingsLoader');

    // Auto-detect domain from concern
    const domain = detectDomain(concernId);

    // Get priority sources based on domain and ranking status
    const prioritySources = getPriorityResearchSources(domain);

    const sources = new Map<string, BaseFetcher>();

    // Map priority source IDs to fetchers (add fetchers as they're implemented)
    // Current: CDC NHSN, SPS
    // TODO: AAOS, KDIGO, ADA, ENDOCRINE_SOCIETY, AHRQ_ORTHO, CMS, NPSD, NQF

    for (const sourceId of prioritySources) {
      // Map source IDs to fetcher keys
      if (sourceId === 'NHSN' || sourceId === 'CDC') {
        const fetcher = this.fetchers.get('CDC NHSN');
        if (fetcher) sources.set('CDC NHSN', fetcher);
      } else if (sourceId === 'KDIGO') {
        const fetcher = this.fetchers.get('SPS'); // Temporary: use SPS as fallback
        if (fetcher) sources.set('SPS', fetcher);
      } else if (sourceId === 'AHRQ') {
        // TODO: Implement AHRQ fetcher
        console.warn(`   ⚠️  ${sourceId} fetcher not yet implemented (ranked source)`);
      } else {
        // Log missing fetchers for ranked specialties
        console.warn(`   ⚠️  ${sourceId} fetcher not yet implemented (ranked source)`);
      }
    }

    // Fallback: Ensure at least one source is selected
    if (sources.size === 0) {
      console.warn(`   ⚠️  No sources available for ${concernId}, using defaults`);
      const nhsn = this.fetchers.get('CDC NHSN');
      if (nhsn) sources.set('CDC NHSN', nhsn);
    }

    return sources;
  }

  /**
   * Identify relevant clinical tools for a concern
   */
  private getToolsForConcern(concernId: string, domain?: string): ClinicalTool[] {
    const tools: ClinicalTool[] = [];

    // CLABSI, CAUTI, VAP can lead to AKI
    if (['CLABSI', 'CAUTI', 'VAP'].includes(concernId.toUpperCase())) {
      const kdigo = this.tools.get('kdigo-aki-staging')!;
      tools.push({
        tool_id: kdigo.tool_id,
        tool_name: kdigo.tool_name,
        version: kdigo.version,
        url: kdigo.url,
        pediatric_validated: kdigo.pediatric_validated,
        use_case: `Monitor for AKI as ${concernId} complication`,
        inputs: ['serum_creatinine', 'baseline_cr', 'urine_output'],
        outputs: ['aki_stage', 'aki_present'],
        computation_logic: {
          stage_1: 'SCr 1.5-1.9x baseline OR UOP <0.5 ml/kg/h for 6-12h',
          stage_2: 'SCr 2.0-2.9x baseline OR UOP <0.5 ml/kg/h for ≥12h',
          stage_3: 'SCr ≥3.0x baseline OR UOP <0.3 ml/kg/h for ≥24h OR anuria ≥12h'
        }
      });
    }

    // Add more tool mappings as needed

    return tools;
  }

  /**
   * Detect conflicts between sources
   */
  private detectConflicts(sources: ResearchSource[]): ConflictResolution[] {
    // Simplified conflict detection
    // In production, would compare specific fields across sources
    const conflicts: ConflictResolution[] = [];

    // Example: Check if sources have different inclusion criteria
    // This is a placeholder - real implementation would be more sophisticated

    return conflicts;
  }

  /**
   * Calculate overall research confidence
   */
  private calculateConfidence(coverage: number, conflictCount: number): number {
    let confidence = coverage;

    // Reduce confidence for each unresolved conflict
    confidence -= (conflictCount * 0.05);

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  /**
   * Generate unique research ID
   */
  private generateResearchId(concernId: string, domain?: string): string {
    const timestamp = Date.now();
    const domainPart = domain ? `_${domain}` : '';
    return `research_${concernId.toLowerCase()}${domainPart}_${timestamp}`;
  }

  /**
   * Format date for display
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get cache manager (for external use)
   */
  getCacheManager(): CacheManager {
    return this.cache;
  }
}
