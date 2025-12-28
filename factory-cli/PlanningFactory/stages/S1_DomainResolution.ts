/**
 * S1: Domain & Archetype & Ranking Context Resolution
 *
 * Purpose: Map concern_id → (domain, archetypes), load ranking & semantic context
 * Reuses:
 * - ARCHETYPE_MATRIX from plannerAgent.ts (as base)
 * - rankingsLoader.ts
 * - semanticPacketLoader.ts
 *
 * V10 Upgrade:
 * - Supports Multi-Archetype resolution based on Packet risks
 * - Loads Semantic Packet for ANY domain
 * - Returns structured SemanticContext
 */

import { RoutedInput, DomainContext, RankingContext, ValidationResult, ArchetypeType, SemanticContext, PacketContext } from '../types';
import { getArchetypeMappings } from '../../config/concernRegistry';
import {
  getRankingForConcern,
  getRankingContext,
  getTopPerformerBenchmarks,
  getSignalEmphasis
} from '../../utils/rankingsLoader';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';

// Import archetype lookup from legacy planner
// We'll need to make this available as an export
interface ArchetypeMapping {
  concern: string | RegExp;
  domain: string;
  archetype: ArchetypeType;
  description: string;
}

// Load archetype mappings from centralized config
// This replaces the old hardcoded ARCHETYPE_MATRIX
const getArchetypeMatrix = (): ArchetypeMapping[] => {
  return getArchetypeMappings() as ArchetypeMapping[];
};

// DEPRECATED: Old hardcoded ARCHETYPE_MATRIX removed
// Now using centralized config: config/concern-registry.json
// See config/concernRegistry.ts for the loader

export class S1_DomainResolutionStage {
  /**
   * Execute S1: Resolve domain, archetypes, and semantic context
   */
  async execute(input: RoutedInput): Promise<DomainContext> {
    console.log('🎯 [S1] Starting Domain & Archetype Resolution');

    const { concern_id } = input;
    console.log(`   Concern ID: ${concern_id}`);

    // Load archetype mappings from centralized config
    const ARCHETYPE_MATRIX = getArchetypeMatrix();

    // Step 1: Lookup primary archetype and domain from matrix
    const archetypeInfo = this.lookupArchetype(concern_id, input.raw_domain, ARCHETYPE_MATRIX);
    console.log(`   Domain: ${archetypeInfo.domain}`);
    console.log(`   Primary Archetype: ${archetypeInfo.archetype}`);

    // Step 2: Load Semantic Packet (Generic)
    const packetLoader = SemanticPacketLoader.getInstance();
    const packet = packetLoader.load(archetypeInfo.domain);
    const metric = packet ? packetLoader.getMetric(archetypeInfo.domain, concern_id) : undefined;

    let packetContext: PacketContext | undefined;
    if (packet && metric) {
      console.log(`   📦 Semantic Packet loaded for ${concern_id}`);
      packetContext = {
        metric,
        signals: packet.signals,
        priorities: packet.priorities
      };
    }

    // Step 3: Derive Multi-Archetypes based on Packet Risks
    const archetypes = this.deriveMultiArchetypes(archetypeInfo.archetype, packetContext);
    console.log(`   👥 Resolved Archetypes: ${archetypes.join(', ')}`);

    // Step 4: Load Ranking Context (USNWR only)
    const isUSNWR = archetypeInfo.domain !== 'HAC';
    let ranking_context: RankingContext | undefined;

    if (isUSNWR) {
      const rankingInfo = getRankingForConcern(concern_id);
      if (rankingInfo && rankingInfo.ranking.rank <= 20) {
        console.log(`   🏆 USNWR Top 20 Ranking Loaded`);
        ranking_context = {
          specialty_name: rankingInfo.specialty,
          rank: rankingInfo.ranking.rank,
          summary: getRankingContext(concern_id) || undefined,
          top_performer_benchmarks: getTopPerformerBenchmarks(archetypeInfo.domain) || undefined,
          quality_differentiators: this.extractQualityDifferentiators(rankingInfo),
          signal_emphasis: getSignalEmphasis(archetypeInfo.domain),
        };
      }
    }

    const semantic_context: SemanticContext = {
      packet: packetContext,
      ranking: ranking_context
    };

    const domainContext: DomainContext = {
      domain: archetypeInfo.domain,
      primary_archetype: archetypeInfo.archetype,
      archetypes,
      semantic_context,
      patient_payload: input.patient_payload
    };

    console.log('✅ [S1] Domain resolution complete');
    return domainContext;
  }

  /**
   * Derive multiple archetypes based on Packet Risks + Signal Groups
   */
  private deriveMultiArchetypes(primary: ArchetypeType, packet?: PacketContext): ArchetypeType[] {
    // 1. Trust Semantic Packet Explicit Archetypes (V10 Source of Truth)
    if (packet?.metric?.archetypes && packet.metric.archetypes.length > 0) {
      return packet.metric.archetypes as ArchetypeType[];
    }

    // 2. Fallback: Heuristic derivation
    const archetypes = new Set<ArchetypeType>([primary]);

    if (!packet?.metric) return Array.from(archetypes);

    // Combine risk_factors AND signal_groups for comprehensive archetype detection
    const risks = packet.metric.risk_factors?.join(' ').toLowerCase() || '';
    const signalGroups = packet.metric.signal_groups?.join(' ').toLowerCase() || '';
    const combined = `${risks} ${signalGroups}`;

    // Exclusion_Hunter Trigger
    if (combined.includes('exclusion') || combined.includes('rule out') || combined.includes('contraindication')) {
      archetypes.add('Exclusion_Hunter');
    }

    // Process_Auditor Trigger
    if (combined.includes('time to') || combined.includes('delay') || combined.includes('protocol')) {
      archetypes.add('Process_Auditor');
    }

    // Preventability_Detective Trigger
    if (combined.includes('bundle') || combined.includes('compliance') || combined.includes('preventable') || combined.includes('infection')) {
      archetypes.add('Preventability_Detective');
    }

    // Enforce Strict Ordering: Process -> Delay -> Exclusion -> Preventability -> Outcome -> Data
    const order: ArchetypeType[] = [
      'Process_Auditor',
      'Delay_Driver_Profiler',
      'Exclusion_Hunter',
      'Preventability_Detective',
      'Preventability_Detective_Metric',
      'Outcome_Tracker',
      'Data_Scavenger'
    ];

    return Array.from(archetypes).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  /**
   * Lookup archetype based on concern_id
   */
  private lookupArchetype(
    concern: string,
    domainHint: string | undefined,
    matrix: ArchetypeMapping[]
  ): { archetype: ArchetypeType; domain: string} {
    const concernUpper = concern.toUpperCase();

    for (const mapping of matrix) {
      if (typeof mapping.concern === 'string') {
        if (mapping.concern.toUpperCase() === concernUpper) {
          return { archetype: mapping.archetype, domain: mapping.domain };
        }
      } else {
        if (mapping.concern.test(concern)) {
          return { archetype: mapping.archetype, domain: mapping.domain };
        }
      }
    }

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

    if (!output.domain) errors.push('domain is required');
    if (!output.archetypes || output.archetypes.length === 0) errors.push('at least one archetype is required');

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        domain: output.domain,
        archetypes: output.archetypes,
        has_packet: !!output.semantic_context.packet,
        has_ranking: !!output.semantic_context.ranking
      },
    };
  }
}