'use client';

import { useState, useMemo } from 'react';
import {
  RuleEvaluationData,
  RuleEvaluation,
  RuleStatus,
  RuleCategory,
  EvidenceStrength,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Circle, AlertTriangle, FileText, Activity, Clock, Stethoscope, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterOption = 'all' | 'required' | 'failed';

interface RuleEvaluationVisualizerProps {
  data: RuleEvaluationData;
  className?: string;
}

export function RuleEvaluationVisualizer({ data, className }: RuleEvaluationVisualizerProps) {
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
    return data.evaluations.some((rule) => rule.confidence > 0 && rule.confidence < 0.75);
  }, [data.evaluations]);

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Overall Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                Rule Evaluation Summary
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Case ID: <span className="font-mono font-semibold text-foreground">{data.caseId}</span>
                {' • '}
                Infection Type: <span className="font-semibold text-foreground">{data.infectionType}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-sm">
                {new Date(data.summary.evaluationTimestamp).toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Overall Progress</span>
              <span className="font-semibold text-foreground">
                {data.summary.passedRules} / {data.summary.totalRules} Rules Passed
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success transition-all duration-500"
                style={{
                  width: `${(data.summary.passedRules / data.summary.totalRules) * 100}%`,
                }}
                role="progressbar"
                aria-valuenow={data.summary.passedRules}
                aria-valuemin={0}
                aria-valuemax={data.summary.totalRules}
                aria-label={`${data.summary.passedRules} of ${data.summary.totalRules} rules passed`}
              />
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Confidence</p>
                <p className="text-lg font-bold text-foreground">
                  {Math.round(data.summary.overallConfidence * 100)}%
                </p>
              </div>
            </div>
            {hasLowConfidenceRules && (
              <Alert className="border-warning bg-warning/10 py-2 pl-3 pr-4">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                <AlertDescription className="ml-2 text-sm font-medium text-warning-foreground">
                  Some rules have low confidence
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="h-8"
        >
          All Rules ({data.evaluations.length})
        </Button>
        <Button
          variant={filter === 'required' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('required')}
          className="h-8"
        >
          Required Only ({data.evaluations.filter((r) => r.isRequired).length})
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('failed')}
          className="h-8"
        >
          Failed Only ({data.summary.failedRules})
        </Button>
      </div>

      {/* Category Groups */}
      <div className="space-y-6">
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
}

function SummaryStatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant: 'success' | 'destructive' | 'muted' | 'primary';
}) {
  const variantStyles = {
    success: 'bg-success/10 text-success-foreground border-success/20',
    destructive: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
    muted: 'bg-muted text-muted-foreground border-border',
    primary: 'bg-primary/10 text-primary-foreground border-primary/20',
  };

  const iconStyles = {
    success: 'text-success',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
  };

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-4', variantStyles[variant])}>
      <Icon className={cn('h-5 w-5', iconStyles[variant])} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  rules,
  expandedRules,
  showCitations,
  onToggleRule,
  onToggleCitations,
}: {
  category: RuleCategory;
  rules: RuleEvaluation[];
  expandedRules: Set<string>;
  showCitations: Set<string>;
  onToggleRule: (ruleId: string) => void;
  onToggleCitations: (ruleId: string) => void;
}) {
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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{config.label}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" />
            {passedCount}
          </Badge>
          {failedCount > 0 && (
            <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive">
              <XCircle className="h-3 w-3" />
              {failedCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
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
}

function RuleCard({
  rule,
  isExpanded,
  showCitations,
  onToggle,
  onToggleCitations,
}: {
  rule: RuleEvaluation;
  isExpanded: boolean;
  showCitations: boolean;
  onToggle: () => void;
  onToggleCitations: () => void;
}) {
  const statusConfig = {
    pass: {
      icon: CheckCircle2,
      label: 'Passed',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      textColor: 'text-success',
      badgeVariant: 'default' as const,
    },
    fail: {
      icon: XCircle,
      label: 'Failed',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      textColor: 'text-destructive',
      badgeVariant: 'destructive' as const,
    },
    not_evaluated: {
      icon: Circle,
      label: 'Not Evaluated',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
      textColor: 'text-muted-foreground',
      badgeVariant: 'secondary' as const,
    },
  };

  const config = statusConfig[rule.status];
  const StatusIcon = config.icon;
  const hasLowConfidence = rule.confidence > 0 && rule.confidence < 0.75;

  return (
    <Card
      className={cn(
        'border-l-4 transition-all hover:shadow-md',
        config.borderColor,
        config.bgColor
      )}
    >
      <CardHeader className="pb-3">
        <button
          onClick={onToggle}
          className="flex w-full items-start gap-3 text-left transition-opacity hover:opacity-80"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} rule ${rule.ruleName}`}
        >
          <div className="mt-1 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('h-5 w-5', config.textColor)} />
                <h4 className="font-semibold text-foreground">{rule.ruleName}</h4>
              </div>
              <div className="flex items-center gap-2">
                {rule.isRequired && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    Required
                  </Badge>
                )}
                <Badge variant={config.badgeVariant} className="gap-1">
                  {config.label}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{rule.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{rule.ruleId}</span>
              {rule.confidence > 0 && (
                <span
                  className={cn(
                    'font-medium',
                    hasLowConfidence && 'text-warning-foreground'
                  )}
                >
                  Confidence: {Math.round(rule.confidence * 100)}%
                </span>
              )}
              {hasLowConfidence && (
                <span className="flex items-center gap-1 text-warning-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  Low Confidence
                </span>
              )}
            </div>
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Rationale */}
          {rule.rationale && (
            <div className="rounded-lg bg-card p-3">
              <h5 className="mb-1 text-sm font-semibold text-foreground">Rationale</h5>
              <p className="text-sm text-muted-foreground">{rule.rationale}</p>
            </div>
          )}

          {/* Evidence Section */}
          {rule.evidence.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-foreground">
                  Evidence ({rule.evidence.length})
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCitations}
                  className="h-7 text-xs"
                >
                  {showCitations ? 'Hide' : 'Show'} Citations
                </Button>
              </div>

              {showCitations && (
                <div className="space-y-2">
                  {rule.evidence.map((evidence) => (
                    <EvidenceCard key={evidence.id} evidence={evidence} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            Evaluated at: {new Date(rule.evaluatedAt).toLocaleString()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function EvidenceCard({
  evidence,
}: {
  evidence: { id: string; type: string; content: string; timestamp?: string; strength: EvidenceStrength };
}) {
  const strengthConfig = {
    strong: {
      label: 'Strong',
      color: 'bg-success text-success-foreground',
    },
    moderate: {
      label: 'Moderate',
      color: 'bg-warning text-warning-foreground',
    },
    weak: {
      label: 'Weak',
      color: 'bg-muted text-muted-foreground',
    },
  };

  const config = strengthConfig[evidence.strength];

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {evidence.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        </div>
        <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
      </div>
      <p className="mb-2 text-muted-foreground">{evidence.content}</p>
      {evidence.timestamp && (
        <p className="text-xs text-muted-foreground">
          {new Date(evidence.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
