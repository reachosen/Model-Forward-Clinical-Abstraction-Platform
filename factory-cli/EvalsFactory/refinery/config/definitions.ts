import { SAFEScorecard } from '../../types/safety';

export interface RefineryCandidate {
  id: string;
  task_type: string;
  prompt_template: string; // The candidate text
  version_label: string;
}

export interface RefineryRunConfig {
  run_id: string;
  metric_id: string;
  task_type: string;
  dataset_id: string; // ID of a golden set file
  candidate: RefineryCandidate;
  sample_size?: number;
}

export interface RefineryReport {
  run_id: string;
  overall_score: number;
  safe_scorecard: SAFEScorecard; // Aggregated (average scores)
  passed_cases: number;
  failed_cases: number;
  details: {
    case_id: string;
    output: any;
    scorecard: SAFEScorecard;
  }[];
}
