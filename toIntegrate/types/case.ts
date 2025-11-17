// Core type definitions following the VERCEL_UI_SPECIFICATION data contracts

export type TaskStatus = "completed" | "in_progress" | "failed" | "pending";
export type TaskMode = "batch" | "interactive" | "on_demand";
export type TaskType = "enrichment" | "abstraction" | "interrogation" | "qa";

export interface TaskMetadata {
  task_id: string;
  task_type: TaskType;
  prompt_version: string;
  mode: TaskMode;
  executed_at: string;
  executed_by: string;
  status: TaskStatus;
  confidence?: number;
  duration_ms?: number;
  token_count?: number;
  demo_mode?: boolean;
}

export interface EnrichmentSummary {
  signals_identified: number;
  signal_groups_count: number;
  timeline_phases_identified: number;
  key_findings: string[];
  confidence: number;
}

export interface Signal {
  signal_id: string;
  signal_name: string;
  value: any;
  timestamp: string;
  confidence: number;
}

export interface SignalGroup {
  signal_type: string;
  group_confidence: number;
  signals: Signal[];
}

export interface TimelinePhase {
  phase_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  events_in_phase: number;
  significance: string;
}

export interface CriteriaEvaluation {
  determination: string;
  confidence: number;
  criteria_met: Record<string, {
    met: boolean;
    evidence: string;
    confidence: number;
  }>;
  criteria_total: number;
  criteria_met_count: number;
}

export interface QAHistoryItem {
  qa_id: string;
  question: string;
  answer: string;
  interrogation_context: {
    mode: "explain" | "summarize" | "validate";
    target_type: "criterion" | "signal" | "event" | "overall";
    target_id: string;
  };
  citations: any[];
  confidence: number;
  timestamp: string;
}

export interface StructuredCase {
  case_id: string;
  concern_id: string;
  
  patient: {
    case_metadata: any;
    demographics: {
      age: number;
      gender: string;
    };
    devices: any[];
    lab_results: any[];
    clinical_notes: any[];
    clinical_events: any[];
  };
  
  enrichment?: {
    task_metadata: TaskMetadata;
    summary: EnrichmentSummary;
    signal_groups: SignalGroup[];
    timeline_phases: TimelinePhase[];
  };
  
  abstraction?: {
    task_metadata: TaskMetadata;
    narrative: string;
    criteria_evaluation: CriteriaEvaluation;
    qa_history: QAHistoryItem[];
    exclusion_analysis: any[];
  };
  
  qa?: null;
}

export interface PipelineStage {
  id: 'context' | 'enrichment' | 'abstraction' | 'feedback';
  label: string;
  status: TaskStatus;
  taskMetadata?: TaskMetadata;
}
