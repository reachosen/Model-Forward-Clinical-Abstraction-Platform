"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Activity, Sparkles, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { TaskMetadataBadge } from "@/components/task-metadata-badge";
import { EnrichmentSummaryPanel } from "@/components/enrichment-summary-panel";
import type { StructuredCase, PipelineStage } from "@/types/case";

async function fetchCaseData(caseId: string): Promise<StructuredCase> {
  // TODO: Replace with actual API endpoint
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
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    context: true,
    enrichment: true,
    abstraction: true
  });

  useEffect(() => {
    const loadCase = async () => {
      try {
        setIsLoading(true);
        const data = await fetchCaseData(params.caseId);
        setCaseData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('[v0] Error loading case:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCase();
  }, [params.caseId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const scrollToSection = (sectionId: string) => {
    toggleSection(sectionId);
    // Scroll logic would go here
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
      label: 'Abstraction',
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
      {/* Pipeline Stepper */}
      <PipelineStepper
        stages={pipelineStages}
        currentStage="abstraction"
        onStageClick={scrollToSection}
      />

      {/* Section A: Patient Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Section A: Patient Context</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('context')}
            >
              {expandedSections.context ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
          <CardDescription>
            Patient demographics and clinical overview
          </CardDescription>
        </CardHeader>
        
        {expandedSections.context && (
          <CardContent>
            {/* 80/20 Summary */}
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="font-medium mb-2">Patient Summary</h3>
                <p className="text-sm text-muted-foreground">
                  {caseData.patient.demographics.age}{caseData.patient.demographics.gender} with central line, Day 5 S. aureus bacteremia
                </p>
              </div>
              
              {/* Placeholder for detailed patient data */}
              <div className="text-sm text-muted-foreground">
                Demographics, timeline, and raw clinical data would be displayed here.
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section B: Enrichment */}
      {caseData.enrichment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Section B: Enrichment</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('enrichment')}
              >
                {expandedSections.enrichment ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
            <CardDescription>
              AI-identified clinical signals and timeline analysis
            </CardDescription>
          </CardHeader>
          
          {expandedSections.enrichment && (
            <CardContent className="space-y-4">
              {/* Task Metadata Badge */}
              <TaskMetadataBadge taskMetadata={caseData.enrichment.task_metadata} />
              
              <Separator />
              
              {/* Enrichment Summary */}
              <EnrichmentSummaryPanel summary={caseData.enrichment.summary} />
              
              {/* Placeholder for SignalsPanel and TimelinePanel */}
              <div className="text-sm text-muted-foreground">
                Signals panel and enhanced timeline would be displayed here.
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Re-run with v1.1
                </Button>
                <Button variant="outline" size="sm">
                  View Task Details
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Section C: Abstraction & Feedback */}
      {caseData.abstraction && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Section C: Abstraction & Feedback</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('abstraction')}
              >
                {expandedSections.abstraction ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
            <CardDescription>
              Clinical narrative, criteria evaluation, and interactive Q&A
            </CardDescription>
          </CardHeader>
          
          {expandedSections.abstraction && (
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
              
              {/* Placeholder for Ask-the-Case, QA History, and Feedback */}
              <div className="text-sm text-muted-foreground">
                Ask-the-Case panel, Q&A history, and feedback panel would be displayed here.
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  View Detailed Criteria
                </Button>
                <Button variant="outline" size="sm">
                  View Q&A History: {caseData.abstraction.qa_history.length} interactions
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
