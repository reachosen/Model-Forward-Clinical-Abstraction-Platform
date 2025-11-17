/**
 * Case Adapter Utilities for Frontend
 *
 * Provides utilities to work with both legacy flat cases and new structured cases.
 */

import {
  StructuredCase,
  PatientSection,
  EnrichmentSection,
  AbstractionSection,
  CaseView,
  AbstractionSummary,
  Signal,
  TimelineEvent,
  RuleEvaluations,
  QAResult,
  CaseInfo,
} from '../types';

/**
 * Type guard to check if a case is structured format
 */
export function isStructuredCase(caseData: any): caseData is StructuredCase {
  return (
    caseData &&
    typeof caseData === 'object' &&
    'case_id' in caseData &&
    'concern_id' in caseData &&
    'patient' in caseData &&
    'enrichment' in caseData &&
    'abstraction' in caseData
  );
}

/**
 * Convert structured case to legacy CaseView format
 * This allows components to work with the new format using existing interfaces
 */
export function structuredToLegacyCaseView(
  structuredCase: StructuredCase
): CaseView {
  const { patient, enrichment, abstraction } = structuredCase;

  // Map signals from enrichment section
  const signals: Signal[] = enrichment.signal_groups.flatMap((group) =>
    group.signals.map((signal) => ({
      signal_id: signal.signal_id,
      signal_name: signal.signal_name,
      signal_type: mapSignalType(signal.signal_type),
      value: signal.value,
      severity: (signal.severity as any) || 'INFO',
      rationale: `${group.signal_type} signal`,
      timestamp: signal.timestamp,
      confidence: group.group_confidence,
    }))
  );

  // Map timeline phases to timeline events
  const timeline: TimelineEvent[] = enrichment.timeline_phases.map((phase) => ({
    event_id: `phase-${phase.phase_name}`,
    event_datetime: phase.start_date,
    event_type: phase.phase_name,
    description: phase.description || phase.events?.join(', ') || '',
    phase: mapTimelinePhase(phase.phase_name),
    severity: 'INFO',
  }));

  // Map criteria evaluation to rule evaluations
  const rule_evaluations: RuleEvaluations = Object.entries(
    abstraction.criteria_evaluation.criteria_met
  ).reduce((acc, [key, value]) => {
    acc[key] = {
      result: value.met,
      evidence: value.evidence,
      confidence: abstraction.criteria_evaluation.confidence,
    };
    return acc;
  }, {} as RuleEvaluations);

  // Create abstraction summary
  const summary: AbstractionSummary = {
    patient_id: patient.case_metadata.patient_id,
    encounter_id: patient.case_metadata.encounter_id,
    episode_id: patient.case_metadata.encounter_id,
    mrn: patient.demographics.mrn,
    age: patient.demographics.age,
    gender: patient.demographics.gender,
    abstraction_datetime: abstraction.task_metadata.executed_at,
    abstraction_version: abstraction.task_metadata.prompt_version,
    mode: 'TEST',
    key_findings: enrichment.summary.key_findings,
    risk_level: determineRiskLevel(abstraction.criteria_evaluation.confidence),
    risk_score: abstraction.criteria_evaluation.confidence,
    risk_factors: [],
    timeline_summary: {},
    likely_clabsi: abstraction.criteria_evaluation.determination.includes('CONFIRMED'),
    confidence: abstraction.criteria_evaluation.confidence,
    meets_nhsn_criteria: abstraction.criteria_evaluation.determination.includes('CONFIRMED'),
    positive_findings: enrichment.summary.key_findings,
    negative_findings: abstraction.exclusion_analysis
      .filter((e) => !e.met)
      .map((e) => e.rationale),
    unresolved_questions: [],
    recommended_actions: [],
  };

  // Create QA result
  const qa_result: QAResult = {
    qa_status: structuredCase.qa?.validation_status === 'passed' ? 'PASS' : 'WARN',
    qa_score: abstraction.criteria_evaluation.confidence,
    rules_evaluated:
      abstraction.criteria_evaluation.total_criteria ||
      Object.keys(abstraction.criteria_evaluation.criteria_met).length,
    rules_passed:
      abstraction.criteria_evaluation.criteria_met_count ||
      Object.values(abstraction.criteria_evaluation.criteria_met).filter((c) => c.met).length,
    rules_warnings: 0,
    rules_failed: 0,
    missing_data_fields: [],
    contradictions: [],
    validation_errors: structuredCase.qa?.validation_errors || [],
    recommended_actions: [],
    rule_details: Object.entries(abstraction.criteria_evaluation.criteria_met).map(
      ([key, value]) => ({
        rule_name: key,
        status: value.met ? 'PASS' : 'FAIL',
        message: value.evidence,
      })
    ),
  };

  // Create case info
  const case_info: CaseInfo = {
    patient_id: patient.case_metadata.patient_id,
    encounter_id: patient.case_metadata.encounter_id,
    episode_id: patient.case_metadata.encounter_id,
    mrn: patient.demographics.mrn,
    name: `Patient ${patient.case_metadata.patient_id}`,
    scenario: structuredCase.concern_id.toUpperCase(),
    risk_level: determineRiskLevel(abstraction.criteria_evaluation.confidence),
    determination: abstraction.criteria_evaluation.determination,
    domain: structuredCase.concern_id.toUpperCase(),
    abstraction_datetime: abstraction.task_metadata.executed_at,
    status: 'REVIEWED',
  };

  return {
    summary,
    qa_result,
    signals,
    timeline,
    rule_evaluations,
    status: 'SUCCESS',
    generated_at: abstraction.task_metadata.executed_at,
    mode: 'TEST',
    case_info,
  };
}

/**
 * Helper to map signal types
 */
function mapSignalType(signalType: string): Signal['signal_type'] {
  const typeMap: Record<string, Signal['signal_type']> = {
    device: 'DEVICE',
    lab: 'LAB',
    vital_sign: 'VITAL',
    medication: 'MEDICATION',
    procedure: 'PROCEDURE',
  };
  return typeMap[signalType.toLowerCase()] || 'VITAL';
}

/**
 * Helper to map timeline phases
 */
function mapTimelinePhase(phaseName: string): TimelineEvent['phase'] {
  const phaseMap: Record<string, TimelineEvent['phase']> = {
    'Device Placement': 'LINE_PLACEMENT',
    'Infection Window': 'MONITORING',
    'Symptom Onset': 'MONITORING',
    'Diagnostic Workup': 'CULTURE',
    'Post-Culture': 'POST_CULTURE',
  };
  return phaseMap[phaseName] || 'MONITORING';
}

/**
 * Helper to determine risk level from confidence
 */
function determineRiskLevel(
  confidence: number
): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (confidence >= 0.9) return 'CRITICAL';
  if (confidence >= 0.75) return 'HIGH';
  if (confidence >= 0.5) return 'MODERATE';
  return 'LOW';
}

/**
 * Extract patient demographics from structured case
 */
export function extractPatientDemographics(structuredCase: StructuredCase) {
  return {
    patient_id: structuredCase.patient.case_metadata.patient_id,
    mrn: structuredCase.patient.demographics.mrn,
    age: structuredCase.patient.demographics.age,
    gender: structuredCase.patient.demographics.gender,
    encounter_id: structuredCase.patient.case_metadata.encounter_id,
  };
}

/**
 * Extract enrichment summary for display
 */
export function extractEnrichmentSummary(enrichmentSection: EnrichmentSection) {
  return {
    signals_identified: enrichmentSection.summary.signals_identified,
    key_findings: enrichmentSection.summary.key_findings,
    confidence: enrichmentSection.summary.confidence,
    signal_groups: enrichmentSection.signal_groups.length,
    timeline_phases: enrichmentSection.timeline_phases.length,
  };
}

/**
 * Extract abstraction summary for display
 */
export function extractAbstractionSummary(abstractionSection: AbstractionSection) {
  return {
    determination: abstractionSection.criteria_evaluation.determination,
    confidence: abstractionSection.criteria_evaluation.confidence,
    narrative: abstractionSection.narrative,
    criteria_met_count:
      abstractionSection.criteria_evaluation.criteria_met_count ||
      Object.values(abstractionSection.criteria_evaluation.criteria_met).filter((c) => c.met)
        .length,
    total_criteria:
      abstractionSection.criteria_evaluation.total_criteria ||
      Object.keys(abstractionSection.criteria_evaluation.criteria_met).length,
    exclusions: abstractionSection.exclusion_analysis.length,
  };
}
