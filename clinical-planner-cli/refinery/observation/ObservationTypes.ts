export type ObservationMetricName =
  | 'prescriptive_vs_goldilocks_balance'
  | 'autonomy_window'
  | 'instruction_density'
  | 'sparse_data_friendliness'
  | 'branching_complexity'
  | 'llm_call_config';

export type ObservationLevel = 'prompt' | 'category' | 'pipeline';

export interface ObservationContext {
  runId?: string;
  stageId?: string; // e.g. "S2", "S5"
  promptName?: string; // e.g. "signalEnrichment"
  promptCategory?: 'synthesis' | 'verification' | 'enrichment' | 'summarization' | 'questions' | 'other';
  domain?: string; // e.g. "Orthopedics"
  archetype?: string; // e.g. "Process_Auditor"
  timestamp?: string; // ISO string
}

export interface ObservationValue {
  numericValue?: number; // e.g. density score, count
  labelValue?: string; // e.g. "HIGH", "LOW", "MEDIUM"
  raw?: unknown; // optional structured payload
}

export interface ObservationRecord {
  metricName: ObservationMetricName;
  level: ObservationLevel;
  context: ObservationContext;
  value: ObservationValue;
}
