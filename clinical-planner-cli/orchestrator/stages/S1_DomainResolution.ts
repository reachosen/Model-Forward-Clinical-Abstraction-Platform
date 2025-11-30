/**
 * S1: Domain & Archetype & Ranking Context Resolution
 *
 * Purpose: Map concern_id → (domain, archetype), load ranking context (USNWR only)
 * Reuses:
 * - ARCHETYPE_MATRIX from plannerAgent.ts
 * - rankingsLoader.ts (4 functions)
 *
 * CRITICAL DISTINCTION:
 * - USNWR cases (I25, C35, etc.): Load ranking_context via rankingsLoader
 * - HAC cases (CLABSI, CAUTI, VAP): ranking_context = null (HAC is safety, not rankings)
 */

import { RoutedInput, DomainContext, RankingContext, ValidationResult, ArchetypeType } from '../types';
import {
  getRankingForConcern,
  getRankingContext,
  getTopPerformerBenchmarks,
  getSignalEmphasis
} from '../../utils/rankingsLoader';

// Import archetype lookup from legacy planner
// We'll need to make this available as an export
interface ArchetypeMapping {
  concern: string | RegExp;
  domain: string;
  archetype: ArchetypeType;
  description: string;
}

// Temporary inline archetype matrix (we'll export this from plannerAgent.ts later)
const ARCHETYPE_MATRIX: ArchetypeMapping[] = [
  // HAC Domain
  { concern: 'CLABSI', domain: 'HAC', archetype: 'Preventability_Detective', description: 'CLABSI surveillance' },
  { concern: 'CAUTI', domain: 'HAC', archetype: 'Preventability_Detective', description: 'CAUTI surveillance' },
  { concern: /^VAP$|^VAE$/i, domain: 'HAC', archetype: 'Preventability_Detective', description: 'VAP surveillance' },
  { concern: /^SSI$/i, domain: 'HAC', archetype: 'Preventability_Detective', description: 'SSI surveillance' },
  { concern: /PSI\.09|PSI09/i, domain: 'HAC', archetype: 'Preventability_Detective', description: 'PSI.09 surveillance' },

  // USNWR - Orthopedics (I25)
  { concern: 'I25', domain: 'Orthopedics', archetype: 'Process_Auditor', description: 'Orthopedic procedure review' },

  // USNWR - Endocrinology (I26)
  { concern: 'I26', domain: 'Endocrinology', archetype: 'Preventability_Detective_Metric', description: 'Diabetes management' },

  // USNWR - Cardiology (I21)
  { concern: 'I21', domain: 'Cardiology', archetype: 'Process_Auditor', description: 'Cardiac procedure review' },

  // USNWR - Neurology (I60)
  { concern: 'I60', domain: 'Neurology', archetype: 'Process_Auditor', description: 'Neurological procedure review' },

  // USNWR - Cancer (C35, C36)
  { concern: /^C3[56]$/i, domain: 'Cancer', archetype: 'Process_Auditor', description: 'Oncology procedure review' },
];

export class S1_DomainResolutionStage {
  /**
   * Execute S1: Resolve domain, archetype, and ranking context
   */
  async execute(input: RoutedInput): Promise<DomainContext> {
    console.log('🎯 [S1] Starting Domain & Archetype Resolution');

    const { concern_id } = input;
    console.log(`   Concern ID: ${concern_id}`);

    // Step 1: Lookup archetype and domain from matrix
    const archetypeInfo = this.lookupArchetype(concern_id, input.raw_domain);
    console.log(`   Domain: ${archetypeInfo.domain}`);
    console.log(`   Archetype: ${archetypeInfo.archetype}`);

    // Step 2: Determine if this is USNWR (ranked) or HAC (safety)
    const isUSNWR = archetypeInfo.domain !== 'HAC';
    let ranking_context: RankingContext | undefined;

    if (isUSNWR) {
      // USNWR case - load ranking context
      console.log(`   🏆 USNWR concern detected, loading ranking context...`);

      const rankingInfo = getRankingForConcern(concern_id);

      if (rankingInfo && rankingInfo.ranking.rank <= 20) {
        // Top 20 specialty - build full ranking context
        console.log(`   ✅ Found ranking: ${rankingInfo.specialty} #${rankingInfo.ranking.rank}`);

        const topPerformerBenchmarks = getTopPerformerBenchmarks(archetypeInfo.domain);
        const signalEmphasis = getSignalEmphasis(archetypeInfo.domain);
        const qualityDifferentiators = this.extractQualityDifferentiators(rankingInfo);

        ranking_context = {
          specialty_name: rankingInfo.specialty,
          rank: rankingInfo.ranking.rank,
          summary: getRankingContext(concern_id) || undefined,
          top_performer_benchmarks: topPerformerBenchmarks || undefined,
          quality_differentiators: qualityDifferentiators.length > 0 ? qualityDifferentiators : undefined,
          signal_emphasis: signalEmphasis,
        };

        console.log(`   📊 Signal emphasis (${signalEmphasis.length} groups):`, signalEmphasis.join(', '));
      } else {
        console.log(`   ℹ️  Not in top 20 or no ranking data available`);
        ranking_context = undefined;
      }
    } else {
      // HAC case - no ranking context
      console.log(`   🏥 HAC concern detected - patient safety focus (no rankings)`);
      ranking_context = undefined;
    }

    const domainContext: DomainContext = {
      domain: archetypeInfo.domain,
      archetype: archetypeInfo.archetype,
      ranking_context,
    };

    console.log('✅ [S1] Domain resolution complete');
    return domainContext;
  }

  /**
   * Lookup archetype based on concern_id
   */
  private lookupArchetype(
    concern: string,
    domainHint?: string
  ): { archetype: ArchetypeType; domain: string } {
    const concernUpper = concern.toUpperCase();

    // Try exact match first
    for (const mapping of ARCHETYPE_MATRIX) {
      if (typeof mapping.concern === 'string') {
        if (mapping.concern.toUpperCase() === concernUpper) {
          return { archetype: mapping.archetype, domain: mapping.domain };
        }
      } else {
        // RegExp match
        if (mapping.concern.test(concern)) {
          return { archetype: mapping.archetype, domain: mapping.domain };
        }
      }
    }

    // Default fallback: Use domainHint if provided, otherwise default to HAC
    console.warn(`⚠️  No archetype match for concern '${concern}', using fallback: ${domainHint || 'HAC'}/Preventability_Detective`);
    return {
      archetype: 'Preventability_Detective',
      domain: domainHint || 'HAC'
    };
  }

  /**
   * Extract quality differentiators from ranking info
   */
  private extractQualityDifferentiators(rankingInfo: any): string[] {
    try {
      const benchmarkSignals = rankingInfo.ranking?.benchmark_signals;
      if (benchmarkSignals?.quality_differentiators) {
        return benchmarkSignals.quality_differentiators;
      }
    } catch (error) {
      console.warn('[S1] Could not extract quality differentiators:', error);
    }
    return [];
  }

  /**
   * Validate the domain context
   */
  validate(output: DomainContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!output.domain) {
      errors.push('domain is required');
    }

    if (!output.archetype) {
      errors.push('archetype is required');
    }

    // Valid archetype values
    const validArchetypes: ArchetypeType[] = [
      'Process_Auditor',
      'Preventability_Detective',
      'Preventability_Detective_Metric'
    ];

    if (output.archetype && !validArchetypes.includes(output.archetype)) {
      errors.push(`Invalid archetype: ${output.archetype}`);
    }

    // USNWR-specific validations
    const usnwrDomains = ['Orthopedics', 'Endocrinology', 'Cardiology', 'Neurology', 'Cancer'];
    if (usnwrDomains.includes(output.domain)) {
      // USNWR domain - check if ranking_context is populated for top 20
      if (output.ranking_context) {
        if (!output.ranking_context.specialty_name) {
          warnings.push('USNWR domain has ranking_context but missing specialty_name');
        }
        if (!output.ranking_context.signal_emphasis || output.ranking_context.signal_emphasis.length !== 5) {
          warnings.push('USNWR domain has ranking_context but signal_emphasis is not exactly 5 groups');
        }
      } else {
        console.log(`   ℹ️  USNWR domain without ranking_context (rank > 20 or no data)`);
      }
    }

    // HAC-specific validations
    if (output.domain === 'HAC') {
      if (output.ranking_context) {
        warnings.push('HAC domain should not have ranking_context (HAC is safety, not rankings)');
      }
      if (output.archetype !== 'Preventability_Detective') {
        warnings.push('HAC domain should use Preventability_Detective archetype');
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        domain: output.domain,
        archetype: output.archetype,
        has_ranking_context: !!output.ranking_context,
        is_usnwr: usnwrDomains.includes(output.domain),
        is_hac: output.domain === 'HAC',
      },
    };
  }
}
