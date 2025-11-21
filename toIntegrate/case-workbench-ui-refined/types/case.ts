// Type definitions for Case Workbench

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed"

export interface TaskMetadata {
  status: TaskStatus
  executed_at?: string
  prompt_version?: string
}

export interface SignalItem {
  id: string
  name: string
  value: string | number
  unit?: string
  timestamp?: string
}

export interface SignalGroup {
  category: string
  signals: SignalItem[]
}

export interface TimelinePhase {
  phase: string
  start_date: string
  end_date?: string
  events: Array<{
    date: string
    description: string
    type?: string
  }>
}

export interface Core2080Summary {
  findings: string[]
  supporting_signal_ids: string[]
}

export interface SuggestedQuestion {
  id: string
  text: string
  priority: "high" | "medium" | "low"
  scope: "signal" | "criterion" | "timeline" | "overall"
  hac_type: string
  source_signal_ids?: string[]
  source_criterion_keys?: string[]
  rationale?: string
}

export interface Enrichment {
  task_metadata: TaskMetadata
  summary?: string
  signal_groups?: SignalGroup[]
  timeline_phases?: TimelinePhase[]
  core_20_80_summary?: Core2080Summary
  key_findings?: string[]
  prompt_content?: string
}

export interface CriteriaEvaluation {
  criterion_id: string
  criterion_name: string
  met: boolean
  evidence?: string
  confidence?: number
}

export interface Abstraction {
  task_metadata: TaskMetadata
  narrative: string
  determination?: string
  criteria_evaluation: {
    criteria_met: CriteriaEvaluation[]
    total_criteria: number
    met_count: number
    overall_confidence?: number
  }
  suggested_questions?: SuggestedQuestion[]
  prompt_content?: string
}

export interface InterrogationEntry {
  question: string
  answer: string
  timestamp: string
  confidence?: number
}

export interface Patient {
  age: number
  sex: string
  case_id: string
}

export interface StructuredCase {
  patient: Patient
  concern_id: string
  demo_mode?: boolean
  enrichment?: Enrichment
  abstraction?: Abstraction
  interrogations?: InterrogationEntry[]
}
