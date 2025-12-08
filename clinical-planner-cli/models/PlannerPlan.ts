/**
 * models/PlannerPlan.ts
 * V9.1 Specification - Production Master
 *
 * This file defines the complete V9.1 schema for the Planner Engine.
 * All interfaces strictly match the V9.1 specification.
 */

import { Provenance } from './Provenance';
import { QualityAttributes } from './QualityAttributes';

// ==========================================
// V9.1 Core Types
// ==========================================

export type EvidenceType = 'L1' | 'L2' | 'L3';
export type ArchetypeType =
  | 'Preventability_Detective'
  | 'Process_Auditor'
  | 'Data_Scavenger'
  | 'Exclusion_Hunter'
  | 'Outcome_Tracker';

export type DomainType =
  | 'HAC'
  | 'Orthopedics'
  | 'Endocrinology'
  | 'Cardiology'
  | 'Neurology'
  | 'Gastroenterology'
  | 'Neonatology'
  | 'Nephrology'
  | 'Pulmonology'
  | 'Urology'
  | 'Behavioral Health'
  | 'Quality'
  | 'Safety';
export type IntentType = 'surveillance' | 'quality_reporting' | 'clinical_decision_support';

// Signal Group IDs (The "5-Group Rule")
export type HACSignalGroupId = 'rule_in' | 'rule_out' | 'delay_drivers' | 'documentation_gaps' | 'bundle_gaps';
export type OrthoSignalGroupId = 'core_criteria' | 'delay_drivers' | 'documentation' | 'rule_outs' | 'overrides';
export type EndoSignalGroupId = 'core_criteria' | 'lab_evidence' | 'external_evidence' | 'care_gaps' | 'overrides';
export type SignalGroupId = HACSignalGroupId | OrthoSignalGroupId | EndoSignalGroupId;

// ==========================================
// Planning Input (Section 2)
// ==========================================

export interface PlanningInput {
  planning_input_id: string;
  concern: string;
  domain_hint: DomainType;

  // FUTURE USE: These fields are defined but not yet consumed by the pipeline.
  // They are reserved for future enhancements to support:
  // - Multi-intent workflows (surveillance vs quality_reporting vs CDS)
  // - Population-specific rule filtering
  // - Custom requirement injection
  // - Data availability-aware plan generation
  // - Patient-specific clinical context injection
  intent: IntentType;                    // FUTURE USE: workflow mode selection
  target_population: string;             // FUTURE USE: population-specific filtering
  specific_requirements: string[];       // FUTURE USE: custom requirement injection
  data_profile?: any;                    // FUTURE USE: data availability awareness
  clinical_context?: any;                // FUTURE USE: patient-specific context

  // Optional fields for compatibility
  concern_id?: string;
  domain?: string;
  archetype?: string;
}

// ==========================================
// V9.1 PlannerPlan (Section 5.1)
// ==========================================

export interface PlannerPlan {
  plan_metadata: PlanMetadata;
  rationale: Rationale;
  clinical_config: ClinicalConfig;
  validation: ValidationResults;
}

export interface PlanMetadata {
  plan_id: string;
  planner_version: string;
  status: 'draft' | 'reviewed' | 'approved' | 'deployed';
  planning_input_id: string;
  generated_at: string;
  model_used?: string;
}

export interface Rationale {
  summary: string;
  key_decisions: KeyDecision[];
  pediatric_focus_areas: string[];
  archetype_selection_reason: string;
  concerns?: string[];
  recommendations?: string[];
}

export interface KeyDecision {
  aspect: string;
  decision: string;
  reasoning: string;
  confidence?: number;
}

// ==========================================
// Clinical Config (Section 5)
// ==========================================

export interface ClinicalConfig {
  config_metadata: ConfigMetadata;
  clinical_tools: ClinicalTool[];
  surveillance: Surveillance;
  timeline: Timeline;
  signals: Signals;
  criteria: Criteria;
  questions: Questions;
  prompts: Prompts;
  fieldMappings: FieldMappings;
  domain: DomainInfo;
  metric_context?: MetricContext;

  // Optional sections for backward compatibility
  summary_config?: any;
  config2080?: any;
}

export interface ConfigMetadata {
  config_id: string;
  name: string;
  concern_id: string;
  version: string;
  archetype: ArchetypeType;
  domain: DomainType;
  created_at: string;
  status: string;
}

export interface DomainInfo {
  name: string;
  display_name: string;
  description: string;
}

export interface MetricContext {
  metric_id: string;
  metric_name: string;
  clinical_focus: string;
  rationale: string;
  risk_factors: string[];
  review_questions: string[];
  signal_group_definitions: Record<string, string[]>;
}

// ==========================================
// Clinical Tools (Section 5.2)
// ==========================================

export interface ClinicalTool {
  tool_id: string;
  name: string;
  use_case: 'risk_scoring' | 'unit_conversion' | 'reference_lookup';
  ui_hint: 'inline' | 'modal' | 'background';
  inputs: string[];
  outputs: string[];
  pediatric_notes: string;
}

// ==========================================
// Surveillance (Section 5.3)
// ==========================================

export interface Surveillance {
  objective: string;
  population: string;
  detection_window: DetectionWindow;
  reporting_frameworks: string[];
}

export interface DetectionWindow {
  lookback_days: number;
  lookahead_days: number;
}

// ==========================================
// Timeline (Section 5.3)
// ==========================================

export interface Timeline {
  phases: TimelinePhase[];
}

export interface TimelinePhase {
  phase_id: string;
  display_name: string;
  description: string;
  timing: 'pre_event' | 'peri_event' | 'post_event';
  duration: {
    typical_days: number;
  };
}

// ==========================================
// Signals (Section 5.4)
// ==========================================

export interface Signals {
  signal_groups: SignalGroup[];
}

export interface SignalGroup {
  group_id: SignalGroupId;
  display_name: string;
  description: string;
  signals: Signal[];
  priority: number;
}

export interface Signal {
  id: string;
  name: string;
  description: string;
  evidence_type: EvidenceType;
  linked_tool_id?: string;
  trigger_expr?: string;
  provenance: SignalProvenance;
  thresholds?: SignalThresholds;

  // OPTIONAL ENRICHMENT FIELDS: These are not required by validators.
  // They provide additional metadata when available from LLM enrichment.
  severity?: 'info' | 'warn' | 'error';  // Optional: signal severity level
  tags?: string[];                        // Optional: categorization tags
}

export interface SignalProvenance {
  source: string;
  source_url?: string;
  confidence: number;
  justification?: string;
}

export interface SignalThresholds {
  min_confidence?: number;
  max_findings_per_category?: number;
}

// ==========================================
// Criteria (Section 5.5)
// ==========================================

export interface Criteria {
  rules: CriteriaRule[];
}

export interface CriteriaRule {
  rule_id: string;
  name: string;
  logic_type: 'boolean_expression' | 'threshold_check';
  expression: string;
  provenance: SignalProvenance;
  description?: string;
}

// ==========================================
// Questions (Section 5.6)
// ==========================================

export interface Questions {
  metric_questions: MetricQuestion[];
}

export interface MetricQuestion {
  question_id: string;
  text: string;
  category: 'inclusion' | 'exclusion' | 'preventability' | 'diagnostic';
  sme_status: 'draft' | 'verified';
  display_order: number;
  evidence_rules: EvidenceRules;
  required?: boolean;
  metric_id?: string;
  phase_ids?: string[];
}

export interface EvidenceRules {
  required_signals: string[];
  suggested_evidence_type: EvidenceType[];
  note_types?: string[];
}

// ==========================================
// Prompts (Section 5.7)
// ==========================================

export interface Prompts {
  system_prompt: string;
  task_prompts: TaskPrompts;
}

export interface TaskPrompts {
  [taskName: string]: TaskPrompt;
}

export interface TaskPrompt {
  instruction: string;
  output_schema_ref: string;
}

// ==========================================
// Field Mappings (Section 5.8)
// ==========================================

export interface FieldMappings {
  [signal_id: string]: FieldMapping;
}

export interface FieldMapping {
  ehr_path: string[];
  fhir_resource: string;
  transform_function?: string;
}

// ==========================================
// Validation (Section 6)
// ==========================================

export interface ValidationResults {
  checklist: ValidationChecklist;
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationChecklist {
  schema_completeness: CheckResult;
  expected_signal_groups_match?: CheckResult; // renamed for flexibility; optional to maintain compatibility
  provenance_safety: CheckResult;
  pediatric_compliance: CheckResult;
  dependency_integrity: CheckResult;
}

export interface CheckResult {
  result: 'YES' | 'NO';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// ==========================================
// Legacy Support (V2)
// ==========================================

export interface PlannerPlanV2 {
  plan_metadata: PlanMetadataV2;
  quality: QualityAttributes;
  provenance: Provenance;
  clinical_config: ClinicalConfig;
  validation: ValidationResults & {
    spec_compliance_valid?: boolean;
    validation_timestamp?: string;
    validated_by?: string;
  };
  deployment?: any;
}

export interface PlanMetadataV2 {
  plan_id: string;
  plan_version: string;
  schema_version: string;
  planning_input_id: string;

  concern: {
    concern_id: string;
    concern_type: 'HAC' | 'USNWR';
    domain: string;
    care_setting: string;
  };

  workflow: {
    mode: string;
    generated_at: string;
    generated_by: string;
    model_used?: string;
    case_type?: string;
  };

  status: {
    deployment_status: 'draft' | 'reviewed' | 'approved' | 'deployed';
    requires_review: boolean;
    last_modified: string;
    modified_by: string;
  };
}

// ==========================================
// Deprecated (kept for compatibility)
// ==========================================

export type HACReviewGroup = HACSignalGroupId;
export type USNWRSignalGroupId = OrthoSignalGroupId;

export interface HACConfig extends ClinicalConfig {}

export interface SignalGroupBase {
  display_name: string;
  description: string;
  signals: Signal[];
  priority: number;
  thresholds?: any;
}

export interface HACSignalGroup extends SignalGroupBase {
  group_id: HACSignalGroupId;
}

export interface USNWRSignalGroup extends SignalGroupBase {
  group_id: OrthoSignalGroupId;
}

export interface USNWRQuestionConfig extends MetricQuestion {
  question_text?: string;
  notes_for_sme?: string;
  followup_questions?: string[];
  scoring_rules?: any;
}
