// TypeScript interfaces for Rule Evaluation Visualizer

export type RuleStatus = 'pass' | 'fail' | 'not_evaluated';

export type RuleCategory = 'device' | 'lab' | 'temporal' | 'clinical' | 'exclusion';

export type EvidenceStrength = 'strong' | 'moderate' | 'weak';

export interface Evidence {
  id: string;
  type: string;
  content: string;
  timestamp?: string;
  strength: EvidenceStrength;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  status: RuleStatus;
  isRequired: boolean;
  description: string;
  rationale?: string;
  confidence: number;
  evidence: Evidence[];
  evaluatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  notEvaluatedRules: number;
  requiredRulesPassed: number;
  requiredRulesTotal: number;
  overallConfidence: number;
  evaluationTimestamp: string;
}

export interface RuleEvaluationData {
  caseId: string;
  infectionType: string;
  summary: EvaluationSummary;
  evaluations: RuleEvaluation[];
}
