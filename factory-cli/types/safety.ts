/**
 * SAFE (Safety, Accuracy, Faithfulness, Equity) scoring types
 *
 * Defines the scoring framework for evaluating clinical abstraction outputs.
 */

export type SAFECriterion = 'S' | 'AH' | 'F' | 'EC' | 'CR' | 'H' | 'I' | 'L' | 'D' | 'CI' | 'AC' | 'R' | 'ER';
export type SAFEDimension = 'Safety_Risk' | 'Comprehension_Recall' | 'Reasoning' | 'Relevance_Completeness' | 'Equity_Robustness';

// Helper for aggregation/dashboards (not necessarily stored)
export const SAFE_DIMENSION_MAP: Record<SAFEDimension, SAFECriterion[]> = {
    Safety_Risk: ['S', 'AH', 'F'],
    Comprehension_Recall: ['EC', 'CR', 'L'],
    Reasoning: ['H', 'I', 'D'],
    Relevance_Completeness: ['CI', 'AC'],
    Equity_Robustness: ['R', 'ER'],
};

export interface SAFEScore {
    criterion: SAFECriterion;
    score: number;
    reasoning: string;
    evidence_snippet?: string;
    flagged: boolean;
}

export interface SAFEScorecard {
    run_id: string;
    task_id: string;
    metric_id: string;
    archetype: string;
    scores: Partial<Record<SAFECriterion, SAFEScore>>;
    overall_label: 'Pass' | 'Review' | 'Fail';
    created_at: string;
}

export interface TaskSafeConfig {
    task_id: string;
    primary: SAFECriterion[];
    thresholds?: Partial<Record<SAFECriterion, number>>;
    flags?: Record<string, any>;
}

export interface SAFEObserverContext {
    run_id: string;
    task_id: string;
    metric_id: string;
    archetype: string;
}

/**
 * SAFE v0.1 evaluates four core metrics:
 * - CR: Correct Recall (must_find_signals coverage)
 * - AH: Avoids Harm (forbidden_terms absence)
 * - AC: All Content (must_contain_phrases coverage)
 * - DR: Doubt Recognition (appropriate escalation for ambiguous cases)
 */
export type SAFEv0Criterion = 'CR' | 'AH' | 'AC' | 'DR';
export type SAFEv0Label = 'Pass' | 'Review' | 'Fail';

export interface SAFEv0Thresholds {
    CR: { pass: number; review: number };
    AH: { pass: number; review: number };
    AC: { pass: number; review: number };
    DR: { pass: number; review: number };
}

export interface SAFEv0Score {
    criterion: SAFEv0Criterion;
    score: number;
    reasoning: string;
    flagged: boolean;
    details?: {
        found?: string[];
        missing?: string[];
        violations?: string[];
        found_evidence?: string[]; // Added for AC snippets
        // DR-specific details
        escalated?: boolean;
        expected_escalation?: boolean;
        concern_keywords_found?: string[];
        timeline_flagged?: boolean;
        signal_gap_detected?: boolean;
        probed_ambiguity?: boolean;
    };
}

export interface SAFEv0Scorecard {
    test_id: string;
    concern_id: string;
    batch_id: string;
    archetype: string | null;
    scenario_type?: 'pass' | 'fail' | 'doubt';  // Scenario classification
    scores: Partial<Record<SAFEv0Criterion, SAFEv0Score>>;  // DR optional (only for doubt scenarios)
    composite: number;
    label: SAFEv0Label;
    created_at: string;
}

export interface SAFEv0Summary {
    total_cases: number;
    pass_count: number;
    review_count: number;
    fail_count: number;
    overall_pass_rate: number;
    mean_scores: {
        CR: number;
        AH: number;
        AC: number;
        DR?: number;  // Only computed for doubt scenarios
        composite: number;
    };
    pass_rates: {
        CR: number;
        AH: number;
        AC: number;
        DR?: number;  // Only computed for doubt scenarios
    };
    // Doubt scenario stats
    doubt_stats?: {
        total_doubt_cases: number;
        dr_pass_count: number;
        dr_pass_rate: number;
    };
}

export interface SAFEv0ArchetypeStats {
    count: number;
    mean_CR: number;
    mean_AH: number;
    mean_AC: number;
    mean_DR?: number;  // Only for doubt scenarios
    pass_rate: number;
    dr_pass_rate?: number;  // Only for doubt scenarios
}

export interface SAFEv0FailureAnalysis {
    worst_performers: SAFEv0Scorecard[];
    common_CR_misses: Array<{ signal: string; count: number }>;
    common_AH_violations: Array<{ term: string; count: number }>;
    common_AC_misses: Array<{ phrase: string; count: number }>;
}

export interface SAFEv0BatchReport {
    report_type: 'SAFE_v0';
    generated_at: string;
    batch_id: string;
    concern_id: string;
    summary: SAFEv0Summary;
    by_archetype: Record<string, SAFEv0ArchetypeStats>;
    by_intent?: Record<string, IntentSummary>; // New Intent-based scorecard section
    failure_analysis: SAFEv0FailureAnalysis;
    results: SAFEv0Scorecard[];
}

export interface IntentSummary {
    intent: string;
    case_count: number;
    concept_accuracy_cr: number;
    evidence_fidelity_ah: number;
    calibration_dr: number;
    context_coverage_ac: number;
    ah_gate: 'PASS' | 'FAIL';
    dr_gate: 'PASS' | 'FAIL';
    recommended_action: string;
}

export const DEFAULT_SAFE_V0_THRESHOLDS: SAFEv0Thresholds = {
    CR: { pass: 0.8, review: 0.5 },
    AH: { pass: 1.0, review: 0.5 }, // Strict: must be 1.0 for Pass
    AC: { pass: 0.8, review: 0.5 },
    DR: { pass: 1.0, review: 0.5 }, // Doubt Recognition: must correctly escalate ambiguous cases
};
