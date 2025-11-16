/**
 * Rule Evaluation Visualizer Component
 * Displays NHSN criteria evaluation results with pass/fail indicators
 * Adapted from Vercel v0.dev generation
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Activity,
  FileText,
  Clock,
  Stethoscope,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import './RuleEvaluationVisualizer.css';

// TypeScript interfaces
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

type FilterOption = 'all' | 'required' | 'failed';

interface RuleEvaluationVisualizerProps {
  data: RuleEvaluationData;
  className?: string;
}

const RuleEvaluationVisualizer: React.FC<RuleEvaluationVisualizerProps> = ({
  data,
  className = '',
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [showCitations, setShowCitations] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterOption>('all');

  const toggleRule = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const toggleCitations = (ruleId: string) => {
    const newShowCitations = new Set(showCitations);
    if (newShowCitations.has(ruleId)) {
      newShowCitations.delete(ruleId);
    } else {
      newShowCitations.add(ruleId);
    }
    setShowCitations(newShowCitations);
  };

  const filteredEvaluations = useMemo(() => {
    let filtered = data.evaluations;
    if (filter === 'required') {
      filtered = filtered.filter((rule) => rule.isRequired);
    } else if (filter === 'failed') {
      filtered = filtered.filter((rule) => rule.status === 'fail');
    }
    return filtered;
  }, [data.evaluations, filter]);

  const groupedEvaluations = useMemo(() => {
    const groups: Record<RuleCategory, RuleEvaluation[]> = {
      device: [],
      lab: [],
      temporal: [],
      clinical: [],
      exclusion: [],
    };

    filteredEvaluations.forEach((evaluation) => {
      groups[evaluation.category].push(evaluation);
    });

    return groups;
  }, [filteredEvaluations]);

  const hasLowConfidenceRules = useMemo(() => {
    return data.evaluations.some(
      (rule) => rule.confidence > 0 && rule.confidence < 0.75
    );
  }, [data.evaluations]);

  const progressPercentage = (data.summary.passedRules / data.summary.totalRules) * 100;

  return (
    <div className={`rule-visualizer ${className}`}>
      {/* Overall Summary Card */}
      <div className="summary-card">
        <div className="card-header">
          <div className="header-content">
            <h2 className="card-title">Rule Evaluation Summary</h2>
            <p className="card-description">
              Case ID: <span className="case-id">{data.caseId}</span>
              {' • '}
              Infection Type: <span className="infection-type">{data.infectionType}</span>
            </p>
          </div>
          <div className="timestamp-badge">
            {new Date(data.summary.evaluationTimestamp).toLocaleString()}
          </div>
        </div>

        <div className="card-content">
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Overall Progress</span>
              <span className="progress-value">
                {data.summary.passedRules} / {data.summary.totalRules} Rules Passed
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={data.summary.passedRules}
                aria-valuemin={0}
                aria-valuemax={data.summary.totalRules}
              />
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div className="stats-grid">
            <SummaryStatCard
              label="Passed"
              value={data.summary.passedRules}
              icon={CheckCircle2}
              variant="success"
            />
            <SummaryStatCard
              label="Failed"
              value={data.summary.failedRules}
              icon={XCircle}
              variant="destructive"
            />
            <SummaryStatCard
              label="Not Evaluated"
              value={data.summary.notEvaluatedRules}
              icon={Circle}
              variant="muted"
            />
            <SummaryStatCard
              label="Required Passed"
              value={`${data.summary.requiredRulesPassed}/${data.summary.requiredRulesTotal}`}
              icon={ShieldAlert}
              variant="primary"
            />
          </div>

          {/* Confidence Score */}
          <div className="confidence-container">
            <div className="confidence-content">
              <div className="confidence-icon-container">
                <Zap className="confidence-icon" />
              </div>
              <div>
                <p className="confidence-label">Overall Confidence</p>
                <p className="confidence-value">
                  {Math.round(data.summary.overallConfidence * 100)}%
                </p>
              </div>
            </div>
            {hasLowConfidenceRules && (
              <div className="low-confidence-alert">
                <AlertTriangle className="alert-icon" />
                <span className="alert-text">Some rules have low confidence</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Rules ({data.evaluations.length})
        </button>
        <button
          className={`filter-button ${filter === 'required' ? 'active' : ''}`}
          onClick={() => setFilter('required')}
        >
          Required Only ({data.evaluations.filter((r) => r.isRequired).length})
        </button>
        <button
          className={`filter-button ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          Failed Only ({data.summary.failedRules})
        </button>
      </div>

      {/* Category Groups */}
      <div className="categories-section">
        {Object.entries(groupedEvaluations).map(([category, rules]) => {
          if (rules.length === 0) return null;

          return (
            <CategorySection
              key={category}
              category={category as RuleCategory}
              rules={rules}
              expandedRules={expandedRules}
              showCitations={showCitations}
              onToggleRule={toggleRule}
              onToggleCitations={toggleCitations}
            />
          );
        })}
      </div>
    </div>
  );
};

// Sub-components

interface SummaryStatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant: 'success' | 'destructive' | 'muted' | 'primary';
}

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({
  label,
  value,
  icon: Icon,
  variant,
}) => {
  return (
    <div className={`stat-card stat-${variant}`}>
      <Icon className="stat-icon" />
      <div className="stat-content">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: RuleCategory;
  rules: RuleEvaluation[];
  expandedRules: Set<string>;
  showCitations: Set<string>;
  onToggleRule: (ruleId: string) => void;
  onToggleCitations: (ruleId: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  rules,
  expandedRules,
  showCitations,
  onToggleRule,
  onToggleCitations,
}) => {
  const categoryConfig = {
    device: {
      label: 'Device Criteria',
      icon: Activity,
      description: 'Medical device presence and usage requirements',
    },
    lab: {
      label: 'Laboratory Criteria',
      icon: FileText,
      description: 'Lab results and culture findings',
    },
    temporal: {
      label: 'Temporal Criteria',
      icon: Clock,
      description: 'Timeline and sequence requirements',
    },
    clinical: {
      label: 'Clinical Criteria',
      icon: Stethoscope,
      description: 'Clinical signs, symptoms, and treatment',
    },
    exclusion: {
      label: 'Exclusion Criteria',
      icon: ShieldAlert,
      description: 'Conditions that may exclude this diagnosis',
    },
  };

  const config = categoryConfig[category];
  const Icon = config.icon;

  const passedCount = rules.filter((r) => r.status === 'pass').length;
  const failedCount = rules.filter((r) => r.status === 'fail').length;

  return (
    <div className="category-section">
      <div className="category-header">
        <div className="category-icon-container">
          <Icon className="category-icon" />
        </div>
        <div className="category-info">
          <h3 className="category-title">{config.label}</h3>
          <p className="category-description">{config.description}</p>
        </div>
        <div className="category-badges">
          <span className="badge badge-success">
            <CheckCircle2 className="badge-icon" />
            {passedCount}
          </span>
          {failedCount > 0 && (
            <span className="badge badge-destructive">
              <XCircle className="badge-icon" />
              {failedCount}
            </span>
          )}
        </div>
      </div>

      <div className="rules-list">
        {rules.map((rule) => (
          <RuleCard
            key={rule.ruleId}
            rule={rule}
            isExpanded={expandedRules.has(rule.ruleId)}
            showCitations={showCitations.has(rule.ruleId)}
            onToggle={() => onToggleRule(rule.ruleId)}
            onToggleCitations={() => onToggleCitations(rule.ruleId)}
          />
        ))}
      </div>
    </div>
  );
};

interface RuleCardProps {
  rule: RuleEvaluation;
  isExpanded: boolean;
  showCitations: boolean;
  onToggle: () => void;
  onToggleCitations: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  isExpanded,
  showCitations,
  onToggle,
  onToggleCitations,
}) => {
  const statusConfig = {
    pass: {
      icon: CheckCircle2,
      label: 'Passed',
      className: 'rule-pass',
    },
    fail: {
      icon: XCircle,
      label: 'Failed',
      className: 'rule-fail',
    },
    not_evaluated: {
      icon: Circle,
      label: 'Not Evaluated',
      className: 'rule-not-evaluated',
    },
  };

  const config = statusConfig[rule.status];
  const StatusIcon = config.icon;
  const confidencePercentage = Math.round(rule.confidence * 100);
  const isLowConfidence = rule.confidence > 0 && rule.confidence < 0.75;

  return (
    <div className={`rule-card ${config.className}`}>
      <div className="rule-header" onClick={onToggle}>
        <div className="rule-header-left">
          <StatusIcon className="rule-status-icon" />
          <div className="rule-title-section">
            <h4 className="rule-name">{rule.ruleName}</h4>
            {rule.isRequired && <span className="required-badge">REQUIRED</span>}
          </div>
        </div>
        <div className="rule-header-right">
          <span className="confidence-text">
            {confidencePercentage}%
            {isLowConfidence && <AlertTriangle className="low-confidence-icon" />}
          </span>
          {isExpanded ? (
            <ChevronDown className="chevron-icon" />
          ) : (
            <ChevronRight className="chevron-icon" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="rule-details">
          <p className="rule-description">{rule.description}</p>
          {rule.rationale && (
            <div className="rule-rationale">
              <strong>Rationale:</strong> {rule.rationale}
            </div>
          )}

          {rule.evidence.length > 0 && (
            <div className="evidence-section">
              <button
                className="evidence-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCitations();
                }}
              >
                📎 Evidence ({rule.evidence.length})
                {showCitations ? ' ▼' : ' ▶'}
              </button>

              {showCitations && (
                <div className="evidence-list">
                  {rule.evidence.map((evidence) => (
                    <EvidenceCard key={evidence.id} evidence={evidence} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rule-footer">
            <span className="evaluation-time">
              Evaluated: {new Date(rule.evaluatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface EvidenceCardProps {
  evidence: Evidence;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  const strengthConfig = {
    strong: { label: 'Strong', className: 'strength-strong' },
    moderate: { label: 'Moderate', className: 'strength-moderate' },
    weak: { label: 'Weak', className: 'strength-weak' },
  };

  const config = strengthConfig[evidence.strength];

  return (
    <div className="evidence-card">
      <div className="evidence-header">
        <span className="evidence-type">{evidence.type}</span>
        <span className={`evidence-strength ${config.className}`}>{config.label}</span>
      </div>
      <p className="evidence-content">{evidence.content}</p>
      {evidence.timestamp && (
        <span className="evidence-timestamp">
          {new Date(evidence.timestamp).toLocaleString()}
        </span>
      )}
    </div>
  );
};

export default RuleEvaluationVisualizer;
