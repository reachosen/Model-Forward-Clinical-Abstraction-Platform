"use client";

import { useState } from "react";
import { FileCheck, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TaskMetadataBadge } from "@/components/task-metadata-badge";
import type { CriterionDetail, CriteriaEvaluation } from "@/types/case";

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
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-muted-foreground" />
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCheck className="h-4 w-4 mr-2" />
          View Detailed Criteria
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>NHSN Criteria Detailed Evaluation</DialogTitle>
          <DialogDescription>
            Complete checklist with evidence and task attribution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Final Determination:</span>
                <Badge className="text-base px-4 py-1">
                  {evaluation.determination}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Criteria Met</span>
                  <span className="font-medium">
                    {evaluation.criteria_met_count} / {evaluation.criteria_total}
                  </span>
                </div>
                <Progress
                  value={(evaluation.criteria_met_count / evaluation.criteria_total) * 100}
                  className="h-2"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Confidence</span>
                <span className="font-medium">{(evaluation.confidence * 100).toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Criteria Checklist */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Criteria Checklist</h3>
            
            {criteriaDetails.map((criterion) => {
              const isExpanded = expandedCriteria.has(criterion.criterion_id);

              return (
                <Card key={criterion.criterion_id}>
                  <CardContent className="pt-4">
                    <button
                      onClick={() => toggleCriterion(criterion.criterion_id)}
                      className="w-full"
                    >
                      <div className="flex items-start gap-3">
                        {getCriterionIcon(criterion.met)}
                        
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {criterion.criterion_text}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={criterion.met ? "default" : "secondary"}>
                                {criterion.met ? "Met" : "Not Met"}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-3 text-sm">
                              <div className="rounded-md bg-muted/50 p-3">
                                <div className="flex items-start gap-2 mb-1">
                                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <span className="font-medium">Evidence</span>
                                </div>
                                <p className="text-foreground leading-relaxed ml-6">
                                  {criterion.evidence}
                                </p>
                              </div>

                              {criterion.source_signals.length > 0 && (
                                <div>
                                  <span className="text-muted-foreground font-medium">
                                    Source Signals:
                                  </span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {criterion.source_signals.map((signalId, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {signalId}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <span className="text-muted-foreground font-medium mb-2 block">
                                  Task Attribution:
                                </span>
                                <TaskMetadataBadge taskMetadata={criterion.task_attribution} />
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Confidence:</span>
                                <Progress
                                  value={criterion.confidence * 100}
                                  className="h-1 flex-1 max-w-[120px]"
                                />
                                <span>{(criterion.confidence * 100).toFixed(0)}%</span>
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
