/**
 * CriteriaDetailModal - Latest from Vercel (Nov 18 00:07)
 * Detailed NHSN criteria evaluation with expandable criteria
 */

import React, { useState } from 'react';
import { FileCheck, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { CriterionDetail } from '../types';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { TaskMetadataBadge } from './TaskMetadataBadge';
import './CriteriaDetailModal.css';

interface CriteriaEvaluation {
  determination: string;
  confidence: number;
  criteria_met_count: number;
  criteria_total: number;
}

interface CriteriaDetailModalProps {
  evaluation: CriteriaEvaluation;
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
      <CheckCircle2 className="criterion-icon criterion-icon-met" />
    ) : (
      <XCircle className="criterion-icon criterion-icon-not-met" />
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCheck className="button-icon" />
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
          <Card className="evaluation-summary-card">
            <div className="summary-header">
              <h4 className="summary-title">Evaluation Summary</h4>
            </div>
            <div className="summary-content">
              <div className="summary-row">
                <span className="summary-label">Final Determination:</span>
                <Badge className="determination-badge">
                  {evaluation.determination}
                </Badge>
              </div>

              <div className="criteria-progress-section">
                <div className="progress-label-row">
                  <span className="progress-label">Criteria Met</span>
                  <span className="progress-value">
                    {evaluation.criteria_met_count} / {evaluation.criteria_total}
                  </span>
                </div>
                <Progress
                  value={(evaluation.criteria_met_count / evaluation.criteria_total) * 100}
                  className="criteria-progress-bar"
                />
              </div>

              <div className="summary-row">
                <span className="summary-label">Overall Confidence</span>
                <span className="summary-value">{(evaluation.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </Card>

          <div className="modal-separator" />

          {/* Criteria Checklist */}
          <div className="criteria-checklist">
            <h3 className="checklist-title">Criteria Checklist</h3>

            {criteriaDetails.map((criterion) => {
              const isExpanded = expandedCriteria.has(criterion.criterion_id);

              return (
                <Card key={criterion.criterion_id} className="criterion-card">
                  <div className="criterion-card-content">
                    <button
                      onClick={() => toggleCriterion(criterion.criterion_id)}
                      className="criterion-toggle-button"
                    >
                      <div className="criterion-header">
                        {getCriterionIcon(criterion.met)}

                        <div className="criterion-main">
                          <div className="criterion-title-row">
                            <span className="criterion-text">
                              {criterion.criterion_text}
                            </span>
                            <div className="criterion-badges">
                              <Badge variant={criterion.met ? "default" : "secondary"}>
                                {criterion.met ? "Met" : "Not Met"}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="chevron-icon" />
                              ) : (
                                <ChevronDown className="chevron-icon" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="criterion-details">
                              <div className="evidence-section">
                                <div className="evidence-header">
                                  <AlertCircle className="evidence-icon" />
                                  <span className="evidence-label">Evidence</span>
                                </div>
                                <p className="evidence-text">
                                  {criterion.evidence}
                                </p>
                              </div>

                              {criterion.source_signals && criterion.source_signals.length > 0 && (
                                <div className="source-signals-section">
                                  <span className="source-signals-label">
                                    Source Signals:
                                  </span>
                                  <div className="source-signals-list">
                                    {criterion.source_signals.map((signalId, idx) => (
                                      <Badge key={idx} variant="outline" className="signal-badge">
                                        {signalId}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="task-attribution-section">
                                <span className="task-attribution-label">
                                  Task Attribution:
                                </span>
                                <TaskMetadataBadge taskMetadata={criterion.task_attribution} />
                              </div>

                              <div className="confidence-row">
                                <span>Confidence:</span>
                                <Progress
                                  value={criterion.confidence * 100}
                                  className="criterion-confidence-bar"
                                />
                                <span>{(criterion.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
