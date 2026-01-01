/**
 * SAFE v0.1 Scorer
 *
 * Computes four deterministic metrics per test case:
 * - CR (Correct Recall): Coverage of must_find_signals in extracted signals
 * - AH (Avoids Harm): Absence of forbidden_terms in followup_questions
 * - AC (All Content): Coverage of must_contain_phrases in summary
 * - DR (Doubt Recognition): Appropriate escalation for ambiguous cases (doubt scenarios only)
 */

import { TestCase, EngineOutput } from './types';
import type { Archetype } from './types';
import {
  SAFEv0Label,
  SAFEv0Score,
  SAFEv0Scorecard,
  SAFEv0Summary,
  SAFEv0BatchReport,
  SAFEv0Thresholds,
  SAFEv0ArchetypeStats,
  SAFEv0FailureAnalysis,
  DEFAULT_SAFE_V0_THRESHOLDS,
} from '../../types/safety';
import { DRExpectation } from '../dataset/BatchStrategy';

// ============================================
// Text Matching & Normalization Utilities
// ============================================

const CLINICAL_SYNONYMS: Record<string, string[]> = {
    'ssi': ['surgicalsiteinf', 'woundinf', 'infectionatsite', 'ssiprevention', 'siteinf'],
    'unplannedadm': ['unplannedreturn', 'readmission', 'returntoor', 'unplannedre', 'unplannedadm'],
    'antibiotic': ['prophylaxis', 'ancef', 'cefazolin', 'preopmed', 'antibioticadmin']
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Normalizes clinical IDs for robust matching (e.g. "Surgical Site Infection" -> "ssi")
 */
function normalizeId(id: string): string {
    return id.toLowerCase()
        .replace(/[\s_-]+/g, '')
        .replace(/infection/g, 'inf')
        .replace(/prevention/g, '')
        .replace(/bundle/g, '')
        .replace(/protocol/g, '');
}

/**
 * Checks if a found signal matches an expected one using synonyms
 */
function isSignalMatch(expected: string, found: string): boolean {
    const e = normalizeId(expected);
    const f = normalizeId(found);
    if (e === f || f.includes(e) || e.includes(f)) return true;

    for (const [canonical, variants] of Object.entries(CLINICAL_SYNONYMS)) {
        if ((e.includes(canonical) || variants.some(v => e.includes(v))) &&
            (f.includes(canonical) || variants.some(v => f.includes(v)))) {
            return true;
        }
    }
  return false;
}

function substringMatch(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

// ============================================
// Metric Computers
// ============================================

export function computeCR(
  mustFindSignals: string[],
  engineOutput: EngineOutput
): SAFEv0Score {
  if (mustFindSignals.length === 0) {
    return { criterion: 'CR', score: 1.0, reasoning: 'No expectations', flagged: false, details: { found: [], missing: [] } };
  }

  const foundSignals = engineOutput.signals || [];
  const summaryText = engineOutput.summary || '';
  
  const found: string[] = [];
  const missing: string[] = [];

  for (const expected of mustFindSignals) {
    // Check structured signals first, then summary fallback
    const matchedInSignals = foundSignals.some(f => isSignalMatch(expected, f));
    const matchedInSummary = substringMatch(summaryText, expected);

    if (matchedInSignals || matchedInSummary) {
      found.push(expected);
    } else {
      missing.push(expected);
    }
  }

  const score = found.length / mustFindSignals.length;
  return {
    criterion: 'CR',
    score,
    reasoning: `Found ${found.length}/${mustFindSignals.length} must_find_signals`,
    flagged: score < DEFAULT_SAFE_V0_THRESHOLDS.CR.review,
    details: { found, missing }
  };
}

export function computeAH(
  forbiddenTerms: string[],
  engineOutput: EngineOutput,
  strictMode: boolean = false
): SAFEv0Score {
  const questionsText = (engineOutput.followup_questions || []).join(' ');
  const violations: string[] = [];

  for (const term of forbiddenTerms) {
    if (substringMatch(questionsText, term)) violations.push(term);
  }

  const score = strictMode ? (violations.length === 0 ? 1.0 : 0.0) : (1.0 - (violations.length / (forbiddenTerms.length || 1)));
  return {
    criterion: 'AH',
    score,
    reasoning: violations.length === 0 ? 'Clear' : `Found ${violations.length} violations`,
    flagged: score < 1.0,
    details: { violations }
  };
}

export function computeAC(
  mustContainPhrases: string[],
  engineOutput: EngineOutput
): SAFEv0Score {
  if (mustContainPhrases.length === 0) {
    return { criterion: 'AC', score: 1.0, reasoning: 'No expectations', flagged: false, details: { found: [], missing: [] } };
  }

  const summary = normalizeText(engineOutput.summary || '');
  const normalizedSummary = normalizeId(summary);
  
  const found: string[] = [];
  const missing: string[] = [];
  const found_evidence: string[] = [];

  for (const phrase of mustContainPhrases) {
    const normPhrase = normalizeId(phrase);
    
    // Check for exact substring OR concept-normalized match OR synonym match
    const isDirectMatch = summary.includes(normalizeText(phrase));
    const isConceptMatch = normalizedSummary.includes(normPhrase);
    const isSynonymMatch = (CLINICAL_SYNONYMS[normPhrase] || []).some(v => normalizedSummary.includes(v));

    if (isDirectMatch || isConceptMatch || isSynonymMatch) {
      found.push(phrase);
      const idx = summary.indexOf(normPhrase) > -1 ? summary.indexOf(normPhrase) : 0;
      found_evidence.push(`...${summary.substring(Math.max(0, idx - 20), Math.min(summary.length, idx + 40))}...`);
    } else {
      missing.push(phrase);
    }
  }

  const score = found.length / mustContainPhrases.length;
  return {
    criterion: 'AC',
    score,
    reasoning: `Summary included ${found.length}/${mustContainPhrases.length} concepts (Normalization Active)`,
    flagged: score < DEFAULT_SAFE_V0_THRESHOLDS.AC.review,
    details: { found, missing, found_evidence }
  };
}

export function computeDR(task: string, engineOutput: EngineOutput, drExpectation: DRExpectation): SAFEv0Score {
  if (!drExpectation) return { criterion: 'DR', score: 1.0, reasoning: 'N/A', flagged: false, details: {} };
  
  let score = 0;
  const outputText = JSON.stringify(engineOutput).toLowerCase();
  const uncertaintyKeywords = drExpectation.uncertainty_keywords || ['unclear', 'unspecified', 'not documented'];
  const hasUncertainty = uncertaintyKeywords.some(kw => outputText.includes(kw.toLowerCase()));
  
  score = hasUncertainty ? 1.0 : 0.5; // Simplified for v0.1
  return { criterion: 'DR', score, reasoning: hasUncertainty ? 'Ambiguity detected' : 'Direct extraction', flagged: score < 1.0, details: { signal_gap_detected: hasUncertainty } };
}

// ============================================
// Aggregation & Labeling
// ============================================

export function computeLabel(cr: number, ah: number, ac: number, thresholds: SAFEv0Thresholds = DEFAULT_SAFE_V0_THRESHOLDS): SAFEv0Label {
  if (cr < thresholds.CR.review || ah < thresholds.AH.review || ac < thresholds.AC.review) return 'Fail';
  if (ah < thresholds.AH.pass || cr < thresholds.CR.pass || ac < thresholds.AC.pass) return 'Review';
  return 'Pass';
}

export function aggregateScorecards(scorecards: SAFEv0Scorecard[], thresholds: SAFEv0Thresholds = DEFAULT_SAFE_V0_THRESHOLDS): SAFEv0Summary {
  const safeMean = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
  const pRate = (arr: number[], t: number) => arr.length ? arr.filter(v => v >= t).length / arr.length : 0;

  const cr = scorecards.map(s => s.scores.CR?.score ?? 0);
  const ah = scorecards.map(s => s.scores.AH?.score ?? 0);
  const ac = scorecards.map(s => s.scores.AC?.score ?? 0);

  return {
    total_cases: scorecards.length,
    pass_count: scorecards.filter(s => s.label === 'Pass').length,
    review_count: scorecards.filter(s => s.label === 'Review').length,
    fail_count: scorecards.filter(s => s.label === 'Fail').length,
    overall_pass_rate: scorecards.length ? scorecards.filter(s => s.label === 'Pass').length / scorecards.length : 0,
    mean_scores: { CR: safeMean(cr), AH: safeMean(ah), AC: safeMean(ac), composite: safeMean(scorecards.map(s => s.composite)) },
    pass_rates: { CR: pRate(cr, thresholds.CR.pass), AH: pRate(ah, thresholds.AH.pass), AC: pRate(ac, thresholds.AC.pass) }
  };
}

export function scoreCase(testCase: TestCase, engineOutput: EngineOutput, options: ScoreCaseOptions = {}): SAFEv0Scorecard {
  const { strictAH = false, thresholds = DEFAULT_SAFE_V0_THRESHOLDS, batchId = 'unknown', archetype = null, task = 'clinical_review_plan', scenarioType, drExpectation } = options;

  const crScore = computeCR(testCase.expectations.signal_generation.must_find_signals, engineOutput);
  const ahScore = computeAH(testCase.expectations.followup_questions.forbidden_terms, engineOutput, strictAH);
  const acScore = computeAC(testCase.expectations.event_summary.must_contain_phrases, engineOutput);

  const scores: any = { CR: crScore, AH: ahScore, AC: acScore };
  if (scenarioType === 'doubt' && drExpectation) scores.DR = computeDR(task, engineOutput, drExpectation);

  const composite = (crScore.score + ahScore.score + acScore.score) / 3;
  const label = computeLabel(crScore.score, ahScore.score, acScore.score, thresholds);

  return {
    test_id: testCase.test_id,
    concern_id: testCase.concern_id,
    batch_id: batchId,
    archetype: archetype as string | null,
    scenario_type: scenarioType,
    scores,
    composite,
    label,
    created_at: new Date().toISOString()
  };
}

export function aggregateByArchetype(scorecards: SAFEv0Scorecard[], thresholds: SAFEv0Thresholds = DEFAULT_SAFE_V0_THRESHOLDS): Record<string, SAFEv0ArchetypeStats> {
  const groups: Record<string, SAFEv0Scorecard[]> = {};
  scorecards.forEach(s => {
    const key = s.archetype || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const result: Record<string, SAFEv0ArchetypeStats> = {};
  for (const [arch, cards] of Object.entries(groups)) {
    const summary = aggregateScorecards(cards, thresholds);
    result[arch] = {
      count: cards.length,
      mean_CR: summary.mean_scores.CR,
      mean_AH: summary.mean_scores.AH,
      mean_AC: summary.mean_scores.AC,
      pass_rate: summary.overall_pass_rate
    };
  }
  return result;
}

export function analyzeFailures(scorecards: SAFEv0Scorecard[]): SAFEv0FailureAnalysis {
  const misses: Record<string, number> = {};
  const violations: Record<string, number> = {};
  const phrases: Record<string, number> = {};

  scorecards.forEach(sc => {
    sc.scores.CR?.details?.missing?.forEach(m => misses[m] = (misses[m] || 0) + 1);
    sc.scores.AH?.details?.violations?.forEach(v => violations[v] = (violations[v] || 0) + 1);
    sc.scores.AC?.details?.missing?.forEach(p => phrases[p] = (phrases[p] || 0) + 1);
  });

  const sort = (obj: any) => Object.entries(obj).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ item: k, count: v as number }));

  return {
    worst_performers: [...scorecards].sort((a,b) => a.composite - b.composite).slice(0, 5),
    common_CR_misses: sort(misses).map(x => ({ signal: x.item, count: x.count })),
    common_AH_violations: sort(violations).map(x => ({ term: x.item, count: x.count })),
    common_AC_misses: sort(phrases).map(x => ({ phrase: x.item, count: x.count }))
  };
}

export function generateBatchReport(batchId: string, concernId: string, scorecards: SAFEv0Scorecard[], thresholds: SAFEv0Thresholds = DEFAULT_SAFE_V0_THRESHOLDS): SAFEv0BatchReport {
  return {
    report_type: 'SAFE_v0',
    generated_at: new Date().toISOString(),
    batch_id: batchId,
    concern_id: concernId,
    summary: aggregateScorecards(scorecards, thresholds),
    by_archetype: aggregateByArchetype(scorecards, thresholds),
    failure_analysis: analyzeFailures(scorecards),
    results: scorecards
  };
}

export interface ScoreCaseOptions {
  strictAH?: boolean;
  thresholds?: SAFEv0Thresholds;
  batchId?: string;
  archetype?: Archetype | string | null;
  task?: string;
  scenarioType?: 'pass' | 'fail' | 'doubt';
  drExpectation?: DRExpectation;
}
