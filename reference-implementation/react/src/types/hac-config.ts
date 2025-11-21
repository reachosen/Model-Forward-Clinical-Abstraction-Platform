// Type definitions for HAC Configuration Studio
// Adapted for CRA from toIntegrate/hac-configuration-studio

export type PhaseName = 'enrichment' | 'clinical_review' | 'feedback';

export interface HACDefinition {
  hac_id: string; // UUID
  concern_id: string; // 'clabsi', 'cauti', etc.
  display_name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
}

export interface HACTaskPrompt {
  prompt_id: string;
  prompt_type: 'system' | 'enrichment' | 'clinical_review';
  version: string; // '1.0.0'
  content: string;
  status: 'draft' | 'experimental' | 'stable' | 'deprecated';
  is_active: boolean;
}

export interface HACPhaseConfig {
  phase_name: PhaseName;
  enabled: boolean;
  auto_run: boolean;
  timeout_ms: number;
  required_inputs: string[]; // e.g. ['patient_data','lab_results']
  output_schema?: any;
}

export interface HAC2080Config {
  max_findings: number;
  preferred_signal_types: string[]; // ['DEVICE','LAB']
  min_confidence: number; // 0.0-1.0
  signal_weighting: Record<string, number>; // { DEVICE: 1.2, LAB:1.0 }
  extraction_strategy: 'top_k' | 'threshold' | 'hybrid';
}

export interface HACQuestionsConfig {
  generation_mode: 'backend' | 'fallback' | 'hybrid';
  max_questions: number;
  allowed_scopes: ('signal' | 'criterion' | 'timeline' | 'overall')[];
  priority_distribution: { high: number; medium: number; low: number };
  fallback_templates: any; // JSON schema, treated as opaque on FE
}

export interface HACFieldMapping {
  mapping_id: string;
  mapping_type: 'signal' | 'criterion';
  source_key: string;
  display_label: string;
  category?: string;
  validation_rules?: any;
}

export interface HACConfig {
  definition: HACDefinition;
  prompts: HACTaskPrompt[];
  phases: HACPhaseConfig[];
  config2080: HAC2080Config;
  questions: HACQuestionsConfig;
  fieldMappings: HACFieldMapping[];
}

export interface PreviewResponse {
  previewCase: any; // Will use StructuredCase from existing types
}

export interface PublishRequest {
  targetStatus: 'active' | 'archived';
}
