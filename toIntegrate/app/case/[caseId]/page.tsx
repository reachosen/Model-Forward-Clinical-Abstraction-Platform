"use client";

import { useState, useEffect } from "react";
import { Activity, Sparkles, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { TaskMetadataBadge } from "@/components/task-metadata-badge";
import { EnrichmentSummaryPanel } from "@/components/enrichment-summary-panel";
import { TaskHistoryDrawer } from "@/components/task-history-drawer";
import { CriteriaDetailModal } from "@/components/criteria-detail-modal";
import { SignalsPanel } from "@/components/signals-panel";
import { TimelinePanel } from "@/components/timeline-panel";
import { AskTheCasePanel } from "@/components/ask-the-case-panel";
import { InterrogationPanel } from "@/components/interrogation-panel";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import type { StructuredCase, PipelineStage } from "@/types/case";

async function fetchCaseData(caseId: string): Promise<StructuredCase> {
  const response = await fetch(`/api/cases/${caseId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch case data');
  }
  return response.json();
}

export default function CaseWorkbenchPage({ params }: { params: { caseId: string } }) {
  const [caseData, setCaseData] = useState<StructuredCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("context");

  useEffect(() => {
    const loadCase = async () => {
      try {
        setIsLoading(true);
        const data = await fetchCaseData(params.caseId);
        setCaseData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCase();
  }, [params.caseId]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
  };

  const handleQuestionSubmit = async (question: string, mode: string, targetType: string) => {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading case data...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-destructive">
          Error loading case: {error || 'Case not found'}
        </div>
      </div>
    );
  }

  const isDemoMode = caseData.enrichment?.task_metadata.demo_mode || 
                     caseData.abstraction?.task_metadata.demo_mode || 
                     false;

  // Build pipeline stages from case data
  const pipelineStages: PipelineStage[] = [
    {
      id: 'context',
      label: 'Context',
      status: 'completed'
    },
    {
      id: 'enrichment',
      label: 'Enrichment',
      status: caseData.enrichment?.task_metadata.status || 'pending',
      taskMetadata: caseData.enrichment?.task_metadata
    },
    {
      id: 'abstraction',
      label: 'Clinical Review',
      status: caseData.abstraction?.task_metadata.status || 'pending',
      taskMetadata: caseData.abstraction?.task_metadata
    },
    {
      id: 'feedback',
      label: 'Feedback',
      status: 'pending'
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {isDemoMode && <DemoModeBanner />}

      {/* Pipeline Stepper */}
      <PipelineStepper
        stages={pipelineStages}
        currentStage="abstraction"
        onStageClick={scrollToSection}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="context" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Context</span>
          </TabsTrigger>
          <TabsTrigger value="enrichment" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Enrichment</span>
          </TabsTrigger>
          <TabsTrigger value="abstraction" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Clinical Review</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Patient Context */}
        <TabsContent value="context" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Section A: Patient Context</CardTitle>
              <CardDescription>
                Patient demographics and clinical overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h3 className="font-medium mb-2">Patient Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    {caseData.patient.demographics.age}yo {caseData.patient.demographics.gender} with central line, Day 5 S. aureus bacteremia
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Demographics, timeline, and raw clinical data would be displayed here.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Enrichment */}
        <TabsContent value="enrichment" className="mt-6">
          {caseData.enrichment ? (
            <Card>
              <CardHeader>
                <CardTitle>Section B: Enrichment</CardTitle>
                <CardDescription>
                  AI-identified clinical signals and timeline analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Task Metadata Badge */}
                <TaskMetadataBadge taskMetadata={caseData.enrichment.task_metadata} />
                
                <Separator />
                
                {/* Enrichment Summary */}
                <EnrichmentSummaryPanel summary={caseData.enrichment.summary} />
                
                <Separator />
                
                {caseData.enrichment.signal_groups.length > 0 && (
                  <>
                    <SignalsPanel
                      signalGroups={caseData.enrichment.signal_groups}
                      timelinePhases={caseData.enrichment.timeline_phases}
                    />
                    <Separator />
                  </>
                )}
                
                {caseData.enrichment.timeline_phases.length > 0 && (
                  <>
                    <TimelinePanel timelinePhases={caseData.enrichment.timeline_phases} />
                    <Separator />
                  </>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Re-run with v1.1
                  </Button>
                  <Button variant="outline" size="sm">
                    View Task Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No enrichment data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Content: Clinical Review */}
        <TabsContent value="abstraction" className="mt-6">
          {caseData.abstraction ? (
            <Card>
              <CardHeader>
                <CardTitle>Section C: Clinical Review & Feedback</CardTitle>
                <CardDescription>
                  Clinical narrative, criteria evaluation, and interactive Q&A
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Task Metadata Badge */}
                <TaskMetadataBadge taskMetadata={caseData.abstraction.task_metadata} />
                
                <Separator />
                
                {/* Clinical Narrative */}
                <div className="space-y-2">
                  <h3 className="font-medium">Clinical Narrative</h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed">{caseData.abstraction.narrative}</p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Criteria Evaluation Summary */}
                <div className="space-y-2">
                  <h3 className="font-medium">NHSN Criteria Evaluation</h3>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Determination:</span>
                      <span className="text-sm font-bold text-green-600">
                        {caseData.abstraction.criteria_evaluation.determination}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Criteria Met:</span>
                      <span className="text-sm">
                        {caseData.abstraction.criteria_evaluation.criteria_met_count} of {caseData.abstraction.criteria_evaluation.criteria_total}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <AskTheCasePanel
                  caseId={caseData.case_id}
                  qaHistoryCount={caseData.abstraction.qa_history.length}
                  onQuestionSubmit={handleQuestionSubmit}
                />
                
                <Separator />
                
                <InterrogationPanel qaHistory={caseData.abstraction.qa_history} />
                
                <Separator />
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    View Detailed Criteria (Coming Soon)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const section = document.querySelector('[data-qa-history]');
                      section?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    View Q&A History: {caseData.abstraction.qa_history.length} interactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No clinical review data available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
