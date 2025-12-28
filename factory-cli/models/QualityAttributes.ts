/**
 * Quality Attributes Framework
 *
 * Defines quality scoring and assessment structures
 */

export interface QualityAttributes {
  overall_score?: number;
  deployment_ready?: boolean;
  quality_grade?: 'A' | 'B' | 'C' | 'D';

  dimensions: QualityDimensions;
  quality_gates: QualityGates;
  flagged_areas: string[];
  recommendations: string[];
}

export interface QualityDimensions {
  research_coverage?: DimensionScore;
  spec_compliance?: DimensionScore;
  clinical_accuracy: DimensionScore;
  data_feasibility: DimensionScore;
  parsimony: DimensionScore;
  completeness: DimensionScore;
  implementation_readiness?: DimensionScore;
}

export interface DimensionScore {
  score: number;
  rationale: string;
  [key: string]: any;
}

export interface QualityGates {
  research_coverage_min?: number;
  spec_compliance_min?: number;
  clinical_accuracy_min: number;
  data_feasibility_min: number;
  parsimony_min: number;
  overall_min: number;

  gates_passed: Record<string, boolean>;
  deployment_ready: boolean;
}

export interface ResearchCoverageDimension extends DimensionScore {
  sources_attempted: number;
  sources_successful: number;
  missing_sources: string[];
}

export interface SpecComplianceDimension extends DimensionScore {
  criteria_count: number;
  criteria_sourced: number;
  signals_count: number;
  signals_sourced: number;
}

export interface ClinicalAccuracyDimension extends DimensionScore {
  criteria_count: number;
  criteria_sourced: number;
  clinical_tools_integrated: number;
}

export interface DataFeasibilityDimension extends DimensionScore {
  signals_count: number;
  signals_extractable: number;
  manual_review_required: number;
}

export interface ParsimonyDimension extends DimensionScore {
  signal_count: number;
  signal_target: string;
  question_count: number;
  question_target: string;
}

export interface CompletenessDimension extends DimensionScore {
  required_fields_present: number;
  required_fields_total: number;
  missing_fields: string[];
}

export interface ImplementationReadinessDimension extends DimensionScore {
  test_coverage: number;
  tests_passing: number;
  tests_total: number;
  code_generated: boolean;
}
