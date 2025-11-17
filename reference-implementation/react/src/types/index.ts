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
  status?: 'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'FLAGGED';
  days_since_admission?: number;
  line_days?: number;
  culture_status?: 'NONE' | 'PENDING' | 'POSITIVE' | 'NEGATIVE';
  last_updated?: string;
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

// ============================================================================
// STRUCTURED CASE FORMAT (4-Section Model)
// ============================================================================

/**
 * Task metadata tracking who executed what and when
 */
export interface TaskMetadata {
  task_id: string;
  task_type: string; // 'enrichment' | 'abstraction' | 'interrogation'
  prompt_version: string;
  mode: 'batch' | 'interactive' | 'on_demand';
  executed_at: string; // ISO timestamp
  executed_by: string; // 'system' | user_id
  status: 'completed' | 'in_progress' | 'failed';
  duration_ms?: number;
  token_count?: number;
  confidence?: number;
  demo_mode?: boolean;
}

/**
 * Interrogation context for Ask Panel support
 */
export interface InterrogationContext {
  mode: 'explain' | 'summarize' | 'validate';
  target_type: 'criterion' | 'signal' | 'event' | 'overall';
  target_id: string;
  target_label?: string;
  program_type?: string; // HAC, CLABSI, CAUTI, etc.
  metric_id?: string;
  signal_type?: string;
}

/**
 * QA history entry for tracking interrogations
 */
export interface QAHistoryEntry {
  qa_id: string;
  question: string;
  answer: string;
  interrogation_context: InterrogationContext;
  task_metadata: TaskMetadata;
  citations?: string[];
  confidence?: number;
}

/**
 * Patient section - raw context (precomputed)
 */
export interface PatientSection {
  case_metadata: {
    case_id: string;
    patient_id: string;
    encounter_id: string;
    created_date: string;
    infection_type: string;
    facility_id: string;
    unit: string;
  };
  demographics: {
    age: number;
    gender: string;
    mrn: string;
  };
  devices?: {
    [deviceType: string]: {
      insertion_date: string;
      insertion_time?: string;
      line_type?: string;
      insertion_site?: string;
      removal_date?: string | null;
      removal_time?: string;
      removal_reason?: string;
      device_days_at_event?: number;
    };
  };
  lab_results: Array<{
    test_id: string;
    test_type: string;
    collection_date: string;
    collection_time?: string;
    result_date?: string;
    result_time?: string;
    sample_type?: string;
    organism?: string;
    organism_type?: string;
    susceptibilities?: Record<string, string>;
    growth?: string;
    cfu_count?: number | null;
    wbc?: number;
    wbc_unit?: string;
    neutrophils_percent?: number;
    source_id: string;
    note?: string;
  }>;
  clinical_signals: Array<{
    signal_id: string;
    signal_type: string;
    signal_name: string;
    timestamp: string;
    value: string | number | boolean;
    unit?: string;
    source: string;
    abnormal?: boolean;
    severity?: string;
  }>;
  clinical_notes: Array<{
    note_id: string;
    note_type: string;
    timestamp: string;
    author: string;
    content: string;
    extracted_concepts?: string[];
  }>;
  clinical_events: Array<{
    event_id: string;
    event_type: string;
    event_name: string;
    timestamp: string;
    performed_by?: string;
    location?: string;
    details?: Record<string, any>;
  }>;
}

/**
 * Signal group for enrichment section
 */
export interface SignalGroup {
  signal_type: string;
  signals: Array<{
    signal_id: string;
    signal_name: string;
    timestamp: string;
    value: string | number | boolean;
    unit?: string;
    abnormal?: boolean;
    severity?: string;
  }>;
  group_confidence: number;
}

/**
 * Enrichment summary statistics
 */
export interface EnrichmentSummary {
  signals_identified: number;
  signal_groups_count: number;
  timeline_phases_identified: number;
  key_findings: string[];
  confidence: number;
}

/**
 * Enrichment section - computed signal groups and timeline
 */
export interface EnrichmentSection {
  task_metadata: TaskMetadata;
  signal_groups: SignalGroup[];
  timeline_phases: Array<{
    phase_name: string;
    start_date: string;
    end_date: string;
    day_number: number;
    events?: string[];
    description?: string;
  }>;
  summary: {
    signals_identified: number;
    key_findings: string[];
    confidence: number;
  };
}

/**
 * Criteria evaluation for abstraction section
 */
export interface CriteriaEvaluation {
  [criterionKey: string]: {
    met: boolean;
    evidence: string;
  };
}

/**
 * Abstraction section - narrative and criteria evaluation
 */
export interface AbstractionSection {
  task_metadata: TaskMetadata;
  narrative: string;
  criteria_evaluation: {
    determination: string;
    confidence: number;
    criteria_met: CriteriaEvaluation;
    total_criteria?: number;
    criteria_met_count?: number;
  };
  exclusion_analysis: Array<{
    criterion: string;
    met: boolean;
    rationale: string;
  }>;
}

/**
 * QA section - interrogation history and validation
 */
export interface QASection {
  qa_history: QAHistoryEntry[];
  validation_status?: 'pending' | 'passed' | 'failed';
  validation_errors?: string[];
}

/**
 * Complete structured case (4-section model)
 */
export interface StructuredCase {
  case_id: string;
  concern_id: string; // 'clabsi' | 'cauti' | 'ssi' | etc.
  patient: PatientSection;
  enrichment: EnrichmentSection;
  abstraction: AbstractionSection;
  qa: QASection | null;
}

/**
 * Pipeline stage for tracking progress through abstraction pipeline
 */
export interface PipelineStage {
  id: 'context' | 'enrichment' | 'abstraction' | 'feedback';
  label: string;
  status: 'completed' | 'in_progress' | 'failed' | 'pending';
  taskMetadata?: TaskMetadata;
}
