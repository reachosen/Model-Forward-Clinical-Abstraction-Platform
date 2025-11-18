/**
 * CaseCard - Latest from Vercel (Nov 18 00:07)
 * Case summary card for case list pages
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import './CaseCard_New.css';

interface CaseSummary {
  case_id: string;
  concern_id: string;
  patient_summary: string;
  latest_task_state: {
    stage: string;
    status: string;
    version: string;
    timestamp: string;
  };
  risk_level?: string;
  flags?: string[];
}

interface CaseCardProps {
  caseSummary: CaseSummary;
}

function getTaskStateDisplay(stage: string, status: string, version: string) {
  const icons: Record<string, JSX.Element> = {
    completed: <CheckCircle className="task-icon" />,
    in_progress: <Clock className="task-icon" />,
    failed: <XCircle className="task-icon" />,
    pending: <Circle className="task-icon" />
  };

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: "default",
    in_progress: "secondary",
    failed: "destructive",
    pending: "outline"
  };

  const labels: Record<string, string> = {
    context: "Context Ready",
    enrichment: `Enriched ${version}`,
    abstraction: `Reviewed ${version}`,
    feedback: "Feedback Complete"
  };

  return (
    <Badge variant={variants[status] || "outline"} className="task-state-badge">
      {icons[status]}
      <span>{labels[stage] || stage}</span>
    </Badge>
  );
}

function getRiskBadge(risk?: string) {
  if (!risk) return null;

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    high: "destructive",
    medium: "secondary",
    low: "outline"
  };

  return (
    <Badge variant={variants[risk.toLowerCase()]}>
      {risk.toUpperCase()} RISK
    </Badge>
  );
}

export function CaseCardNew({ caseSummary }: CaseCardProps) {
  return (
    <Link to={`/case/${caseSummary.case_id}`} className="case-card-link">
      <Card className="case-card-container">
        <div className="case-card-header">
          <div className="case-header-content">
            <div className="case-title-section">
              <h4 className="case-title">
                Case {caseSummary.case_id}
              </h4>
              <p className="case-description">
                {caseSummary.patient_summary}
              </p>
            </div>
            {getRiskBadge(caseSummary.risk_level)}
          </div>
        </div>

        <div className="case-card-body">
          <div className="case-badges">
            {getTaskStateDisplay(
              caseSummary.latest_task_state.stage,
              caseSummary.latest_task_state.status,
              caseSummary.latest_task_state.version
            )}

            {caseSummary.flags && caseSummary.flags.map((flag) => (
              <Badge key={flag} variant="outline" className="flag-badge">
                {flag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
