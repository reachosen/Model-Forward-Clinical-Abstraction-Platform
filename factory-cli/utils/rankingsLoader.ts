/**
 * USNWR Rankings Loader
 *
 * Loads cached USNWR ranking data for Ann & Robert H. Lurie Children's Hospital
 * to influence domain routing, archetype selection, and prompt enhancement.
 *
 * Design Goal: Drive Lurie toward #1 by embedding ranking intelligence in every plan.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SpecialtyRanking {
  rank: number;
  reputation_score?: number;
  summary: string;
  mapped_concern_ids: string[];
}

export interface USNWRRankings {
  hospital: string;
  last_updated: string | null;
  rankings: {
    [specialty: string]: SpecialtyRanking;
  };
}

const RANKINGS_CACHE_PATH = path.join(__dirname, '..', '.rankings-cache', 'lurie_usnwr_rankings.json');

/**
 * Load USNWR rankings from cache
 *
 * @param forceRefresh If true, indicates cache should be refreshed (not implemented yet)
 * @returns Rankings data or null if not available
 */
export function loadRankings(forceRefresh: boolean = false): USNWRRankings | null {
  try {
    if (!fs.existsSync(RANKINGS_CACHE_PATH)) {
      console.warn('⚠️  USNWR rankings cache not found. Run rankings scraper to populate.');
      return null;
    }

    const data = fs.readFileSync(RANKINGS_CACHE_PATH, 'utf-8');
    const rankings: USNWRRankings = JSON.parse(data);

    // Check if rankings are populated (has real data)
    if (!rankings.last_updated) {
      console.warn('⚠️  USNWR rankings cache is empty. Awaiting scraper data.');
      return null;
    }

    if (forceRefresh) {
      console.warn('⚠️  forceRefresh requested but scraper not implemented. Using cached data.');
    }

    return rankings;
  } catch (error: any) {
    console.error(`❌ Error loading rankings cache: ${error.message}`);
    return null;
  }
}

/**
 * Get ranking info for a specific concern_id
 *
 * @param concernId Concern ID (e.g., I06, C35)
 * @returns Specialty ranking info or null if not found
 */
export function getRankingForConcern(concernId: string): { specialty: string; ranking: SpecialtyRanking } | null {
  const rankings = loadRankings();
  if (!rankings) return null;

  for (const [specialty, rankingData] of Object.entries(rankings.rankings)) {
    if (rankingData.mapped_concern_ids?.includes(concernId)) {
      return { specialty, ranking: rankingData };
    }
  }

  return null;
}

/**
 * Check if a domain is highly ranked (top 20)
 *
 * @param domain Domain name (e.g., Orthopedics, Endocrinology)
 * @returns true if domain has ranking ≤ 20
 */
export function isHighlyRankedDomain(domain: string): boolean {
  const rankings = loadRankings();
  if (!rankings) return false;

  const specialtyName = mapDomainToSpecialty(domain);
  const specialtyRanking = rankings.rankings[specialtyName];
  return specialtyRanking ? specialtyRanking.rank <= 20 : false;
}

/**
 * Get ranking context for prompt injection
 *
 * @param concernId Concern ID
 * @returns Context string to inject into prompts, or null if not applicable
 */
export function getRankingContext(concernId: string): string | null {
  const rankingInfo = getRankingForConcern(concernId);
  if (!rankingInfo) return null;

  const { specialty, ranking } = rankingInfo;

  // Only inject context for top 20 specialties to avoid prompt bloat
  if (ranking.rank > 20) return null;

  return `This institution is nationally ranked #${ranking.rank} in Pediatric ${specialty}. ${ranking.summary}`;
}

/**
 * Get prioritized research sources based on specialty ranking
 *
 * @param domain Domain name
 * @returns Array of prioritized research tool IDs
 */
export function getPriorityResearchSources(domain: string): string[] {
  const rankings = loadRankings();
  const isRanked = rankings && rankings.rankings[domain];

  // Domain-specific research source priorities
  const researchSourceMap: { [key: string]: string[] } = {
    'Orthopedics': isRanked ? ['AAOS', 'NHSN', 'AHRQ_ORTHO', 'KDIGO'] : ['NHSN', 'AHRQ'],
    'Endocrinology': isRanked ? ['KDIGO', 'ADA', 'ENDOCRINE_SOCIETY', 'AHRQ'] : ['KDIGO', 'AHRQ'],
    'HAC': ['NHSN', 'CDC', 'AHRQ'],
    'Safety': ['AHRQ', 'NPSD', 'CDC'],
    'Quality': ['CMS', 'AHRQ', 'NQF']
  };

  return researchSourceMap[domain] || ['AHRQ', 'CMS'];
}

/**
 * Map domain names to specialty names in rankings cache
 */
function mapDomainToSpecialty(domain: string): string {
  const domainMap: { [key: string]: string } = {
    'Endocrinology': 'Diabetes & Endocrinology',
    'Neurology': 'Neurology & Neurosurgery',
    'Gastroenterology': 'Gastroenterology & GI Surgery',
    'Cardiology': 'Cardiology & Heart Surgery',
    'Pulmonology': 'Pulmonology & Lung Surgery',
    'Orthopedics': 'Orthopedics',
    'Urology': 'Urology',
    'Nephrology': 'Nephrology',
    'Neonatology': 'Neonatology',
    'Cancer': 'Cancer',
    'Behavioral Health': 'Behavioral Health'
  };
  return domainMap[domain] || domain;
}

/**
 * Get signal group emphasis based on ranking performance
 *
 * @param domain Domain name
 * @returns Signal groups to emphasize (for validation and LLM guidance)
 */
export function getSignalEmphasis(domain: string): string[] {
  const rankings = loadRankings();
  if (!rankings) {
    // No rankings data - use generic emphasis
    return ['documentation_gaps', 'delay_drivers', 'bundle_gaps'];
  }

  // Map domain to specialty name in rankings
  const specialtyName = mapDomainToSpecialty(domain);
  const specialtyRanking = rankings.rankings[specialtyName];
  if (!specialtyRanking) {
    return ['documentation_gaps', 'delay_drivers', 'bundle_gaps'];
  }

  // Extract quality differentiators from benchmark_signals
  const benchmarkSignals = (specialtyRanking as any).benchmark_signals;
  if (benchmarkSignals && benchmarkSignals.quality_differentiators) {
    // Convert quality differentiators to signal group names
    // Map common phrases to signal groups
    const differentiators = benchmarkSignals.quality_differentiators as string[];
    const priorityGroups = new Set<string>();

    differentiators.forEach((diff: string) => {
      const lowerDiff = diff.toLowerCase();
      if (lowerDiff.includes('bundle') || lowerDiff.includes('compliance')) {
        priorityGroups.add('bundle_compliance');
      }
      if (lowerDiff.includes('handoff') || lowerDiff.includes('transition')) {
        priorityGroups.add('handoff_failures');
      }
      if (lowerDiff.includes('delay') || lowerDiff.includes('time to') || lowerDiff.includes('los')) {
        priorityGroups.add('delay_drivers');
      }
      if (lowerDiff.includes('documentation') || lowerDiff.includes('completeness')) {
        priorityGroups.add('documentation_gaps');
      }
      if (lowerDiff.includes('glycemic') || lowerDiff.includes('a1c')) {
        priorityGroups.add('glycemic_gaps');
      }
      if (lowerDiff.includes('device') || lowerDiff.includes('cgm') || lowerDiff.includes('pump')) {
        priorityGroups.add('device_use');
      }
      if (lowerDiff.includes('complication') || lowerDiff.includes('adverse')) {
        priorityGroups.add('complication_tracking');
      }
      if (lowerDiff.includes('infection') || lowerDiff.includes('ssi')) {
        priorityGroups.add('infection_risk');
      }
      if (lowerDiff.includes('medication') || lowerDiff.includes('adherence')) {
        priorityGroups.add('medication_adherence');
      }
    });

    // If we extracted priority groups from benchmarks, use them as the first groups
    // and fill in the rest from the domain defaults to ensure exactly 5 groups
    if (priorityGroups.size > 0) {
      const emphasisMap: { [key: string]: string[] } = {
        'Orthopedics': ['bundle_compliance', 'handoff_failures', 'delay_drivers', 'documentation_gaps', 'complication_tracking'],
        'Endocrinology': ['glycemic_gaps', 'device_use', 'documentation_quality', 'care_transitions', 'medication_adherence'],
        'Cardiology': ['bundle_compliance', 'delay_drivers', 'handoff_failures', 'complication_tracking', 'documentation_gaps'],
        'Neurology': ['delay_drivers', 'documentation_gaps', 'handoff_failures', 'complication_tracking', 'care_transitions'],
        'Gastroenterology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'care_transitions'],
        'Neonatology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'infection_risk', 'care_transitions'],
        'Nephrology': ['documentation_gaps', 'delay_drivers', 'bundle_compliance', 'lab_monitoring', 'care_transitions'],
        'Pulmonology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'care_transitions'],
        'Urology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'infection_risk'],
        'Behavioral Health': ['documentation_gaps', 'care_transitions', 'delay_drivers', 'treatment_adherence', 'safety_monitoring'],
        'HAC': ['bundle_gaps', 'delay_drivers', 'documentation_gaps', 'infection_risk', 'device_complications']
      };

      const domainDefaults = emphasisMap[domain] || ['documentation_gaps', 'delay_drivers', 'bundle_gaps', 'care_transitions', 'complication_tracking'];

      // Merge priority groups (from rankings) with domain defaults to get exactly 5
      const result: string[] = Array.from(priorityGroups);
      for (const defaultGroup of domainDefaults) {
        if (result.length >= 5) break;
        if (!result.includes(defaultGroup)) {
          result.push(defaultGroup);
        }
      }

      // Final safety check - ensure exactly 5
      while (result.length < 5) {
        const fallbackGroups = ['documentation_gaps', 'delay_drivers', 'bundle_gaps', 'care_transitions', 'complication_tracking'];
        for (const fallback of fallbackGroups) {
          if (!result.includes(fallback)) {
            result.push(fallback);
            break;
          }
        }
      }

      return result.slice(0, 5);  // Ensure exactly 5, no more
    }
  }

  // Fallback to domain-specific defaults if no benchmark data
  // IMPORTANT: All domains MUST return exactly 5 signal groups for V9.1 compliance
  const emphasisMap: { [key: string]: string[] } = {
    'Orthopedics': ['bundle_compliance', 'handoff_failures', 'delay_drivers', 'documentation_gaps', 'complication_tracking'],
    'Endocrinology': ['glycemic_gaps', 'device_use', 'documentation_quality', 'care_transitions', 'medication_adherence'],
    'Cardiology': ['bundle_compliance', 'delay_drivers', 'handoff_failures', 'complication_tracking', 'documentation_gaps'],
    'Neurology': ['delay_drivers', 'documentation_gaps', 'handoff_failures', 'complication_tracking', 'care_transitions'],
    'Gastroenterology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'care_transitions'],
    'Neonatology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'infection_risk', 'care_transitions'],
    'Nephrology': ['documentation_gaps', 'delay_drivers', 'bundle_compliance', 'lab_monitoring', 'care_transitions'],
    'Pulmonology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'care_transitions'],
    'Urology': ['bundle_compliance', 'documentation_gaps', 'delay_drivers', 'complication_tracking', 'infection_risk'],
    'Behavioral Health': ['documentation_gaps', 'care_transitions', 'delay_drivers', 'treatment_adherence', 'safety_monitoring'],
    'HAC': ['bundle_gaps', 'delay_drivers', 'documentation_gaps', 'infection_risk', 'device_complications']
  };

  const defaultGroups = emphasisMap[domain] || ['documentation_gaps', 'delay_drivers', 'bundle_gaps', 'care_transitions', 'complication_tracking'];

  // Ensure exactly 5 groups
  if (defaultGroups.length !== 5) {
    console.warn(`⚠️  Domain ${domain} has ${defaultGroups.length} signal groups, expected 5. Using defaults.`);
    return ['documentation_gaps', 'delay_drivers', 'bundle_gaps', 'care_transitions', 'complication_tracking'];
  }

  return defaultGroups;
}

/**
 * Get top performer benchmarks for prompt injection
 *
 * @param domain Domain name
 * @returns Formatted string with top performer key strengths, or null if not available
 */
export function getTopPerformerBenchmarks(domain: string): string | null {
  const rankings = loadRankings();
  if (!rankings) return null;

  const specialtyName = mapDomainToSpecialty(domain);
  const specialtyRanking = rankings.rankings[specialtyName];
  if (!specialtyRanking) return null;

  const topPerformers = (specialtyRanking as any).top_performers;
  if (!topPerformers || topPerformers.length === 0) return null;

  // Build benchmark context from top 3 performers
  let benchmarkText = `\n📊 TOP PERFORMER BENCHMARKS (${domain}):\n`;

  topPerformers.slice(0, 3).forEach((performer: any, index: number) => {
    benchmarkText += `\n${index + 1}. ${performer.hospital} (Rank #${performer.rank}):\n`;
    if (performer.key_strengths && performer.key_strengths.length > 0) {
      performer.key_strengths.slice(0, 3).forEach((strength: string) => {
        benchmarkText += `   • ${strength}\n`;
      });
    }
  });

  // Add quality differentiators
  const benchmarkSignals = (specialtyRanking as any).benchmark_signals;
  if (benchmarkSignals && benchmarkSignals.quality_differentiators) {
    benchmarkText += `\n🎯 QUALITY DIFFERENTIATORS TO EMPHASIZE:\n`;
    benchmarkSignals.quality_differentiators.slice(0, 5).forEach((diff: string) => {
      benchmarkText += `   • ${diff}\n`;
    });
  }

  return benchmarkText;
}
