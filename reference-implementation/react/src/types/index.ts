/**
 * TypeScript type definitions for CLABSI Abstraction Application
 */

export interface CaseInfo {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  name: string;
  scenario: string;
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  determination?: string;
  domain?: string;
  abstraction_datetime?: string;
  risk_score?: number;
}

export interface FilterOptions {
  riskLevels: Array<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>;
  determinations: string[];
  domains: string[];
}

export type SortOption = 'date-desc' | 'date-asc' | 'risk-desc' | 'name-asc';

export interface Signal {
  signal_id: string;
  signal_name: string;
  signal_type: 'DEVICE' | 'LAB' | 'VITAL' | 'MEDICATION' | 'PROCEDURE';
  value: string | number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  rationale: string;
  timestamp: string;
  confidence: number;
  evidence_refs?: string[]; // IDs of linked evidence items
}

export interface Evidence {
  evidence_id: string;
  evidence_type: 'LAB' | 'EVENT' | 'NOTE' | 'DEVICE' | 'VITAL' | 'PROCEDURE';
  timestamp: string;
  description: string;
  source_system: string;
  source_table?: string;
  raw_data?: any;
  relevance_score?: number;
}

export interface TimelineEvent {
  event_id: string;
  event_datetime: string;
  event_type: string;
  description: string;
  phase: 'PRE_LINE' | 'LINE_PLACEMENT' | 'MONITORING' | 'CULTURE' | 'POST_CULTURE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface RuleEvaluation {
  result: boolean;
  evidence: string;
  confidence: number;
}

export interface RuleEvaluations {
  has_central_line: RuleEvaluation;
  line_present_gt_2days: RuleEvaluation;
  positive_blood_culture: RuleEvaluation;
  recognized_pathogen: RuleEvaluation;
  no_other_infection_source: RuleEvaluation;
  meets_nhsn_criteria: RuleEvaluation;
  [key: string]: RuleEvaluation;
}

export interface AbstractionSummary {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  age: number;
  gender: string;
  abstraction_datetime: string;
  abstraction_version: string;
  mode: 'TEST' | 'PROD';

  key_findings: string[];
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  risk_factors: string[];

  timeline_summary: {
    [phase: string]: string[];
  };

  likely_clabsi: boolean;
  confidence: number;
  meets_nhsn_criteria: boolean;

  positive_findings: string[];
  negative_findings: string[];

  unresolved_questions: Array<{
    question: string;
    priority: string;
    type: string;
  }>;

  recommended_actions: string[];
}

export interface QAResult {
  qa_status: 'PASS' | 'WARN' | 'FAIL';
  qa_score: number;
  rules_evaluated: number;
  rules_passed: number;
  rules_warnings: number;
  rules_failed: number;
  missing_data_fields: string[];
  contradictions: string[];
  validation_errors: string[];
  recommended_actions: string[];
  rule_details: Array<{
    rule_name: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    message: string;
  }>;
}

export interface CaseView {
  summary: AbstractionSummary;
  qa_result: QAResult;
  signals: Signal[];
  timeline: TimelineEvent[];
  rule_evaluations: RuleEvaluations;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  generated_at: string;
  mode: 'TEST' | 'PROD';
  case_info: CaseInfo;
}

export interface FeedbackSubmission {
  patient_id: string;
  encounter_id: string;
  feedback_type: 'APPROVAL' | 'CORRECTION' | 'QUESTION' | 'COMMENT';
  rating?: number;
  comments?: string;
  final_decision?: string;
  clinician_id?: string;
}
