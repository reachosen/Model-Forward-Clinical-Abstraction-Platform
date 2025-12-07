export type Archetype =
  | 'Process_Auditor'
  | 'Preventability_Detective'
  | 'Delay_Driver_Profiler'
  | 'Exclusion_Hunter'
  | 'Safety_Signal'
  | 'Documentation_Gap'
  | string; // future extensions

export interface TestCase {
  test_id: string;
  concern_id: string;
  description: string;
  patient_payload: string;
  expectations: {
    signal_generation: {
      must_find_signals: string[];
      min_signal_count: number;
    };
    event_summary: {
      must_contain_phrases: string[];
    };
    followup_questions: {
      required_themes: string[];
      forbidden_terms: string[];
    };
    // Optional enrichment hooks
    enrichment_20_80?: { required_keywords: string[] };
    question_generation?: { required_themes: string[]; min_question_count: number };
    reviewer_payload?: { required_sections: string[] };
  };
}

export interface EngineOutput {
  test_id?: string;
  concern_id?: string;
  raw_input: string;

  summary: string;
  signals: string[];
  followup_questions: string[];

  // Optional enrichment tasks
  enrichment_20_80?: string;
  reviewer_payload?: any;
  questions_enriched?: string[];

  // Optional metadata
  model_name?: string;
  latency_ms?: number;
}

export interface ValidationResult {
  test_id: string;
  concern_id: string;
  archetype: Archetype | null;
  batch_index: number | null;
  scenario_label?: string;

  structural: {
    passed: boolean;
    errors: string[];
  };

  semantic: {
    signals_ok: boolean;
    summary_ok: boolean;
    followups_ok: boolean;
    enrichment_ok: boolean;
    errors: string[];
  };

  scores: {
    signals_recall: number | null;
    summary_coverage: number | null;
    followup_coverage: number | null;
  };

  engine_output: EngineOutput;
}

export interface AggregateReport {
  concern_id: string;
  total_cases: number;
  by_archetype: {
    [archetype: string]: {
      total: number;
      structural_pass_rate: number;
      signals_pass_rate: number;
      summary_pass_rate: number;
      followups_pass_rate: number;
      enrichment_pass_rate: number;
      worst_offending_dimensions: string[];
    };
  };
  failures_by_type: {
    [failureKey: string]: {
      count: number;
      sample_test_ids: string[];
      sample_descriptions: string[];
    };
  };
  raw_results: ValidationResult[];
}
