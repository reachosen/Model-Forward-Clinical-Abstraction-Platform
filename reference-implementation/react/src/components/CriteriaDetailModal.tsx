/**
 * Criteria Detail Modal Component
 * Shows detailed NHSN criteria evaluation with evidence and task attribution
 * Adapted from Vercel UI for Create React App
 */

import React, { useState } from 'react';
import { FileCheck, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { Separator } from './ui/Separator';
import { TaskMetadataBadge } from './TaskMetadataBadge';
import { CriterionDetail } from '../types';
import './CriteriaDetailModal.css';

interface CriteriaEvaluationSummary {
  determination: string;
  confidence: number;
  criteria_total: number;
  criteria_met_count: number;
}

interface CriteriaDetailModalProps {
  evaluation: CriteriaEvaluationSummary;
  criteriaDetails: CriterionDetail[];
}

export function CriteriaDetailModal({ evaluation, criteriaDetails }: CriteriaDetailModalProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  const toggleCriterion = (criterionId: string) => {
    setExpandedCriteria(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criterionId)) {
        newSet.delete(criterionId);
      } else {
        newSet.add(criterionId);
      }
      return newSet;
    });
  };

  const getCriterionIcon = (met: boolean) => {
    return met ? (
      <CheckCircle2 className="criterion-icon criterion-icon-met" size={20} />
    ) : (
      <XCircle className="criterion-icon criterion-icon-unmet" size={20} />
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCheck size={16} style={{ marginRight: '8px' }} />
          View Detailed Criteria
        </Button>
      </DialogTrigger>

      <DialogContent className="criteria-modal-content">
        <DialogHeader>
          <DialogTitle>NHSN Criteria Detailed Evaluation</DialogTitle>
          <DialogDescription>
            Complete checklist with evidence and task attribution
          </DialogDescription>
        </DialogHeader>

        <div className="criteria-modal-body">
          {/* Summary Header */}
          <Card>
            <CardHeader>
              <CardTitle className="criteria-summary-title">Evaluation Summary</CardTitle>
            </CardHeader>
            <CardContent className="criteria-summary-content">
              <div className="criteria-summary-row">
                <span className="criteria-summary-label">Final Determination:</span>
                <Badge className="criteria-determination-badge">
                  {evaluation.determination}
                </Badge>
              </div>

              <div className="criteria-progress-section">
                <div className="criteria-progress-header">
                  <span className="criteria-progress-label">Criteria Met</span>
                  <span className="criteria-progress-value">
                    {evaluation.criteria_met_count} / {evaluation.criteria_total}
                  </span>
                </div>
                <Progress
                  value={(evaluation.criteria_met_count / evaluation.criteria_total) * 100}
                  className="criteria-progress-bar"
                />
              </div>

              <div className="criteria-summary-row">
                <span className="criteria-summary-label-muted">Overall Confidence</span>
                <span className="criteria-summary-value">{(evaluation.confidence * 100).toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Criteria Checklist */}
          <div className="criteria-checklist">
            <h3 className="criteria-checklist-title">Criteria Checklist</h3>

            {criteriaDetails.map((criterion) => {
              const isExpanded = expandedCriteria.has(criterion.criterion_id);

              return (
                <Card key={criterion.criterion_id} className="criterion-card">
                  <CardContent className="criterion-card-content">
                    <button
                      onClick={() => toggleCriterion(criterion.criterion_id)}
                      className="criterion-button"
                    >
                      <div className="criterion-header">
                        {getCriterionIcon(criterion.met)}

                        <div className="criterion-info">
                          <div className="criterion-title-row">
                            <span className="criterion-text">
                              {criterion.criterion_text}
                            </span>
                            <div className="criterion-badges">
                              <Badge variant={criterion.met ? "default" : "secondary"}>
                                {criterion.met ? "Met" : "Not Met"}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="criterion-details">
                              <div className="criterion-evidence">
                                <div className="criterion-evidence-header">
                                  <AlertCircle size={16} className="evidence-icon" />
                                  <span className="evidence-label">Evidence</span>
                                </div>
                                <p className="evidence-text">
                                  {criterion.evidence}
                                </p>
                              </div>

                              {criterion.source_signals.length > 0 && (
                                <div className="criterion-signals">
                                  <span className="signals-label">
                                    Source Signals:
                                  </span>
                                  <div className="signals-badges">
                                    {criterion.source_signals.map((signalId, idx) => (
                                      <Badge key={idx} variant="outline" className="signal-badge">
                                        {signalId}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="criterion-attribution">
                                <span className="attribution-label">
                                  Task Attribution:
                                </span>
                                <TaskMetadataBadge taskMetadata={criterion.task_attribution} />
                              </div>

                              <div className="criterion-confidence-row">
                                <span className="confidence-label">Confidence:</span>
                                <Progress
                                  value={criterion.confidence * 100}
                                  className="confidence-bar"
                                />
                                <span className="confidence-value">{(criterion.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
