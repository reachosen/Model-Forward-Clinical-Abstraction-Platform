/**
 * Plan Quality Assessment Module (DEPRECATED)
 *
 * ⚠️ DEPRECATED: This module uses the old quality assessment format (1-5 scores, letter grades).
 * Use `assessPlan` from `./assessPlan.ts` instead, which provides:
 * - 0-1 dimension scores with clear explanations
 * - Quality threshold enforcement in validation
 * - Actionable flagged areas
 *
 * This module is kept temporarily for backward compatibility only.
 * It will be removed in a future version.
 *
 * @deprecated Use `assessPlan` from `./assessPlan.ts`
 */

import { PlannerPlan, HACConfig } from '../../models/PlannerPlan';
import { PlanningInput } from '../../models/PlanningInput';

export interface PlanQuality {
  /**
   * Plan Structure & Phasing (1-5)
   * - 5: Well-structured phases with clear flow
   * - 3: Basic phases present but generic
   * - 1: Missing phases or illogical structure
   */
  structure_score: number;

  /**
   * Clinical Relevance & Coverage (1-5)
   * - 5: All critical signals/questions present, domain-appropriate
   * - 3: Core elements present but gaps in coverage
   * - 1: Missing critical elements or inappropriate for domain
   */
  coverage_score: number;

  /**
   * 20/80 Parsimony (1-5)
   * - 5: Focused on high-yield signals, well-prioritized
   * - 3: Acceptable signal count, some noise
   * - 1: Overwhelming signal count or too sparse
   */
  parsimony_score: number;

  /**
   * Config Readiness (1-5)
   * - 5: No validation errors, internally consistent
   * - 3: Minor warnings, mostly consistent
   * - 1: Validation errors or major inconsistencies
   */
  config_score: number;

  /**
   * Overall Fit-for-Use (1-5)
   * - 5: SME could deploy with minimal review
   * - 3: SME could use with moderate tweaks
   * - 1: Needs major rework before use
   */
  fit_for_use_score: number;

  /**
   * Overall grade (derived from scores)
   */
  overall_grade: 'A' | 'B' | 'C' | 'D';

  /**
   * Detailed reasoning for scores
   */
  reasoning: {
    structure?: string;
    coverage?: string;
    parsimony?: string;
    config?: string;
    fit_for_use?: string;
  };
}

/**
 * Assess plan quality using heuristics
 */
export function assessPlanQuality(
  plan: PlannerPlan,
  input: PlanningInput
): PlanQuality {
  const isHAC = plan.clinical_config.config_metadata.archetype.startsWith('HAC');
  const isUSNWR = plan.clinical_config.config_metadata.archetype.startsWith('USNWR');

  const structure_score = scoreStructure(plan.clinical_config, isHAC, isUSNWR);
  const coverage_score = scoreCoverage(plan.clinical_config, input, isHAC, isUSNWR);
  const parsimony_score = scoreParsimony(plan.clinical_config, isHAC, isUSNWR);
  const config_score = scoreConfigReadiness(plan);
  const fit_for_use_score = scoreFitForUse(plan, structure_score, coverage_score, parsimony_score, config_score);

  const overall_grade = calculateOverallGrade(
    structure_score,
    coverage_score,
    parsimony_score,
    config_score,
    fit_for_use_score
  );

  return {
    structure_score,
    coverage_score,
    parsimony_score,
    config_score,
    fit_for_use_score,
    overall_grade,
    reasoning: {
      structure: explainStructureScore(structure_score, plan.clinical_config),
      coverage: explainCoverageScore(coverage_score, plan.clinical_config, isHAC),
      parsimony: explainParsimonyScore(parsimony_score, plan.clinical_config, isHAC),
      config: explainConfigScore(config_score, plan),
      fit_for_use: explainFitForUse(fit_for_use_score, overall_grade)
    }
  };
}

/**
 * Score plan structure and phasing
 */
function scoreStructure(config: HACConfig, isHAC: boolean, isUSNWR: boolean): number {
  let score = 3; // Start at middle

  // Check if phases exist and are meaningful
  const phases = config.timeline?.phases || [];

  if (phases.length === 0) {
    return 1; // No phases is critical failure
  }

  if (phases.length < 3) {
    score -= 1; // Too few phases
  }

  if (phases.length >= 4) {
    score += 1; // Good number of phases
  }

  // Check for meaningful phase names (not just "phase1", "phase2")
  const hasGenericNames = phases.some(p =>
    p.phase_id?.match(/^phase\d+$/) ||
    p.display_name === 'Phase' ||
    !p.description
  );

  if (hasGenericNames) {
    score -= 1;
  }

  // Check for logical flow (pre → peri → post)
  const timings = phases.map(p => p.timing).filter(Boolean);
  const timingsAny = timings as any[];
  const hasLogicalFlow = timings.includes('pre_event') &&
                         timings.includes('peri_event') &&
                         (timings.includes('post_event') || timingsAny.includes('surveillance'));

  if (hasLogicalFlow) {
    score += 1;
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Score clinical coverage (signals/questions)
 */
function scoreCoverage(
  config: HACConfig,
  input: PlanningInput,
  isHAC: boolean,
  isUSNWR: boolean
): number {
  let score = 3; // Start at middle

  if (isHAC) {
    // For HAC: check if critical signal groups are present
    const signalGroups = config.signals?.signal_groups || [];

    if (signalGroups.length === 0) {
      return 1; // No signals is critical
    }

    // Check for device signals (critical for device-associated HACs)
    const hasDeviceSignals = signalGroups.some(g =>
      g.group_id?.includes('device') || g.display_name?.toLowerCase().includes('device')
    );

    // Check for micro signals (critical for infections)
    const hasMicroSignals = signalGroups.some(g =>
      g.group_id?.includes('micro') || g.display_name?.toLowerCase().includes('micro')
    );

    // Check for clinical/vital signals
    const hasClinicalSignals = signalGroups.some(g =>
      g.group_id?.includes('clinical') || g.group_id?.includes('vital') ||
      g.display_name?.toLowerCase().includes('clinical') || g.display_name?.toLowerCase().includes('vital')
    );

    const concernId = config.config_metadata.concern_id;

    // CLABSI/CAUTI need device + micro + clinical
    if (concernId === 'CLABSI' || concernId === 'CAUTI') {
      if (hasDeviceSignals && hasMicroSignals && hasClinicalSignals) {
        score += 1;
      } else {
        score -= 1;
      }
    }

    // Check if HAC criteria are present and not TBD
    const criteria = config.criteria?.rules || [];
    if (criteria.length === 0) {
      score -= 2; // Missing criteria is very bad
    } else if (criteria.some(c => (c as any).logic?.includes('TBD'))) {
      score -= 1; // TBD logic is bad
    } else if (criteria.length >= 5) {
      score += 1; // Good criteria coverage
    }

  } else if (isUSNWR) {
    // For USNWR: check if questions are present and substantive
    const questions = (config.questions as any)?.usnwr_questions || [];

    if (questions.length === 0) {
      return 1; // No questions is critical
    }

    if (questions.length < 2) {
      score -= 1; // Too few questions
    }

    if (questions.length >= 3) {
      score += 1; // Good question count
    }

    // Check for evidence rules
    const hasEvidenceRules = questions.every((q: any) => q.evidence_rules);
    if (hasEvidenceRules) {
      score += 1;
    } else {
      score -= 1;
    }

    // Check for scoring rules
    const hasScoringRules = questions.every((q: any) => q.scoring_rules);
    if (hasScoringRules) {
      score += 1;
    } else {
      score -= 1;
    }
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Score parsimony (20/80 principle)
 */
function scoreParsimony(config: HACConfig, isHAC: boolean, isUSNWR: boolean): number {
  let score = 3; // Start at middle

  if (isHAC) {
    const signalGroups = config.signals?.signal_groups || [];
    const totalSignalTypes = signalGroups.reduce((sum, g) =>
      sum + (g.signals?.length || 0), 0
    );

    // Ideal: 10-20 signal types for HAC
    if (totalSignalTypes > 30) {
      score -= 2; // Too many signals
    } else if (totalSignalTypes > 20) {
      score -= 1; // Getting noisy
    } else if (totalSignalTypes >= 10 && totalSignalTypes <= 20) {
      score += 1; // Sweet spot
    } else if (totalSignalTypes < 5) {
      score -= 1; // Too sparse
    }

  } else if (isUSNWR) {
    const questions = (config.questions as any)?.usnwr_questions || [];

    // Ideal: 3-7 questions for USNWR metric
    if (questions.length > 25) {
      score -= 2; // Way too many
    } else if (questions.length > 10) {
      score -= 1; // Too many
    } else if (questions.length >= 3 && questions.length <= 7) {
      score += 1; // Sweet spot
    } else if (questions.length < 2) {
      score -= 1; // Too sparse
    }
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Score config readiness (validation, consistency)
 */
function scoreConfigReadiness(plan: PlannerPlan): number {
  let score = 5; // Start at top, deduct for issues

  const validation = plan.validation;

  // Validation errors are serious
  if (!validation.is_valid) {
    score -= 2;
  }

  if (validation.errors.length > 0) {
    score -= Math.min(2, validation.errors.length);
  }

  // Warnings are minor but still count
  if (validation.warnings.length > 5) {
    score -= 1;
  } else if (validation.warnings.length > 10) {
    score -= 2;
  }

  // Check if schema valid (V1/V2 field, use is_valid for V9.1)
  const validationAny = validation as any;
  if (!validationAny.schema_valid && !validation.is_valid) {
    score -= 2;
  }

  // Check if business rules valid (V1/V2 field)
  if (!validationAny.business_rules_valid) {
    score -= 1;
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Score overall fit-for-use
 */
function scoreFitForUse(
  plan: PlannerPlan,
  structure: number,
  coverage: number,
  parsimony: number,
  config: number
): number {
  // Fit-for-use is a weighted combination of other scores
  // Config readiness is most important, then coverage, then structure, then parsimony

  const weightedScore =
    (config * 0.4) +      // 40% weight on config readiness
    (coverage * 0.3) +    // 30% weight on coverage
    (structure * 0.2) +   // 20% weight on structure
    (parsimony * 0.1);    // 10% weight on parsimony

  // Also factor in plan confidence (V1 field)
  const planMeta = plan.plan_metadata as any;
  const planConfidence = planMeta.confidence || 0.8;  // Default to 0.8 for V9.1 plans
  let adjustedScore = weightedScore;

  if (planConfidence < 0.5) {
    adjustedScore -= 1;
  } else if (planConfidence < 0.7) {
    adjustedScore -= 0.5;
  } else if (planConfidence >= 0.9) {
    adjustedScore += 0.5;
  }

  // Requires review flag is a strong signal (V1 field, for V9.1 use validation status)
  const requiresReview = planMeta.requires_review || !plan.validation?.is_valid;
  if (requiresReview) {
    adjustedScore = Math.min(adjustedScore, 3.5); // Cap at 3.5 if requires review
  }

  return Math.max(1, Math.min(5, Math.round(adjustedScore)));
}

/**
 * Calculate overall grade from scores
 */
function calculateOverallGrade(
  structure: number,
  coverage: number,
  parsimony: number,
  config: number,
  fit_for_use: number
): 'A' | 'B' | 'C' | 'D' {
  const average = (structure + coverage + parsimony + config + fit_for_use) / 5;

  if (average >= 4.5) return 'A';
  if (average >= 3.5) return 'B';
  if (average >= 2.5) return 'C';
  return 'D';
}

/**
 * Explain structure score
 */
function explainStructureScore(score: number, config: HACConfig): string {
  const phases = config.timeline?.phases || [];

  if (score >= 4) {
    return `Excellent phase structure with ${phases.length} well-defined phases and logical clinical flow.`;
  } else if (score === 3) {
    return `Adequate phase structure (${phases.length} phases) but could be more detailed or domain-specific.`;
  } else {
    return `Weak phase structure (${phases.length} phases). Phases may be generic, missing, or lack logical flow.`;
  }
}

/**
 * Explain coverage score
 */
function explainCoverageScore(score: number, config: HACConfig, isHAC: boolean): string {
  if (isHAC) {
    const signalGroups = config.signals?.signal_groups?.length || 0;
    const criteria = config.criteria?.rules?.length || 0;

    if (score >= 4) {
      return `Strong clinical coverage with ${signalGroups} signal groups and ${criteria} criteria. Critical elements present.`;
    } else if (score === 3) {
      return `Acceptable coverage (${signalGroups} signal groups, ${criteria} criteria) but may have gaps.`;
    } else {
      return `Weak coverage. Missing critical signal groups or criteria (${signalGroups} groups, ${criteria} criteria).`;
    }
  } else {
    const questions = (config.questions as any)?.usnwr_questions?.length || 0;

    if (score >= 4) {
      return `Strong question coverage with ${questions} well-structured questions including evidence and scoring rules.`;
    } else if (score === 3) {
      return `Acceptable ${questions} questions but may lack evidence rules or scoring criteria.`;
    } else {
      return `Weak question coverage. Only ${questions} questions or missing critical elements.`;
    }
  }
}

/**
 * Explain parsimony score
 */
function explainParsimonyScore(score: number, config: HACConfig, isHAC: boolean): string {
  if (isHAC) {
    const signalGroups = config.signals?.signal_groups || [];
    const totalSignals = signalGroups.reduce((sum, g) => sum + (g.signals?.length || 0), 0);

    if (score >= 4) {
      return `Good parsimony with ${totalSignals} signal types - focused on high-yield signals.`;
    } else if (score === 3) {
      return `Acceptable signal count (${totalSignals}) but could be more focused on 20/80 principle.`;
    } else {
      return `Parsimony concern: ${totalSignals} signal types may be overwhelming or too sparse for effective use.`;
    }
  } else {
    const questions = (config.questions as any)?.usnwr_questions?.length || 0;

    if (score >= 4) {
      return `Good parsimony with ${questions} questions - well-prioritized and focused.`;
    } else if (score === 3) {
      return `Acceptable ${questions} questions but could be more focused.`;
    } else {
      return `Parsimony concern: ${questions} questions may be too many or too few for effective abstraction.`;
    }
  }
}

/**
 * Explain config score
 */
function explainConfigScore(score: number, plan: PlannerPlan): string {
  const errors = plan.validation.errors.length;
  const warnings = plan.validation.warnings.length;

  if (score >= 4) {
    return `Config is ready for deployment with ${errors} errors and ${warnings} warnings.`;
  } else if (score === 3) {
    return `Config has minor issues: ${errors} errors, ${warnings} warnings. Review before deployment.`;
  } else {
    return `Config has significant issues: ${errors} errors, ${warnings} warnings. Requires substantial rework.`;
  }
}

/**
 * Explain fit-for-use score
 */
function explainFitForUse(score: number, grade: string): string {
  if (score >= 4) {
    return `SME could deploy with minimal review (Grade ${grade}). High confidence in config quality.`;
  } else if (score === 3) {
    return `SME could use with moderate tweaks (Grade ${grade}). Review recommended before deployment.`;
  } else {
    return `Config needs major rework before use (Grade ${grade}). Extensive SME review required.`;
  }
}

/**
 * Check if plan meets minimum quality thresholds
 */
export function meetsQualityThresholds(quality: PlanQuality): {
  passes: boolean;
  concerns: string[];
} {
  const concerns: string[] = [];

  // Any score <= 2 is a concern
  if (quality.structure_score <= 2) {
    concerns.push(`Structure score critically low (${quality.structure_score}/5)`);
  }
  if (quality.coverage_score <= 2) {
    concerns.push(`Coverage score critically low (${quality.coverage_score}/5)`);
  }
  if (quality.parsimony_score <= 2) {
    concerns.push(`Parsimony score critically low (${quality.parsimony_score}/5)`);
  }
  if (quality.config_score <= 2) {
    concerns.push(`Config readiness score critically low (${quality.config_score}/5)`);
  }
  if (quality.fit_for_use_score <= 2) {
    concerns.push(`Fit-for-use score critically low (${quality.fit_for_use_score}/5)`);
  }

  // Grade below B is a concern
  if (quality.overall_grade === 'C' || quality.overall_grade === 'D') {
    concerns.push(`Overall grade ${quality.overall_grade} below acceptable threshold`);
  }

  return {
    passes: concerns.length === 0,
    concerns
  };
}
