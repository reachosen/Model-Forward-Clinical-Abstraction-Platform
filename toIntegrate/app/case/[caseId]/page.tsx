"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Activity, Sparkles, FileText, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { TaskMetadataBadge } from "@/components/task-metadata-badge";
import { EnrichmentSummaryPanel } from "@/components/enrichment-summary-panel";
import type { StructuredCase, PipelineStage } from "@/types/case";

// Mock data for demonstration - replace with actual data fetching
const mockCase: StructuredCase = {
  case_id: "case_123",
  concern_id: "clabsi",
  patient: {
    case_metadata: {},
    demographics: {
      age: 68,
      gender: "M"
    },
    devices: [],
    lab_results: [],
    clinical_notes: [],
    clinical_events: []
  },
  enrichment: {
    task_metadata: {
      task_id: "clabsi.enrichment",
      task_type: "enrichment",
      prompt_version: "v1.0",
      mode: "batch",
      executed_at: "2024-01-20T10:00:00Z",
      executed_by: "system",
      status: "completed",
      confidence: 0.89
    },
    summary: {
      signals_identified: 12,
      signal_groups_count: 4,
      timeline_phases_identified: 3,
      key_findings: [
        "Central line placed on Day 0 in ICU setting",
        "S. aureus bacteremia identified on Day 5 post-insertion",
        "No alternative source of infection documented",
        "Patient developed fever and leukocytosis on Day 4"
      ],
      confidence: 0.89
    },
    signal_groups: [],
    timeline_phases: []
  },
  abstraction: {
    task_metadata: {
      task_id: "clabsi.abstraction",
      task_type: "abstraction",
      prompt_version: "v1.0",
      mode: "interactive",
      executed_at: "2024-01-20T14:30:00Z",
      executed_by: "nurse.jane",
      status: "completed",
      confidence: 0.92
    },
    narrative: "68-year-old male patient with central line placement on admission to ICU. Developed S. aureus bacteremia on Day 5 post-insertion. Clinical presentation consistent with CLABSI criteria with no alternative infection source identified.",
    criteria_evaluation: {
      determination: "CLABSI_CONFIRMED",
      confidence: 0.92,
      criteria_met: {},
      criteria_total: 5,
      criteria_met_count: 5
    },
    qa_history: [],
    exclusion_analysis: []
  }
};

export default function CaseWorkbenchPage({ params }: { params: { caseId: string } }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    context: true,
    enrichment: true,
    abstraction: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const scrollToSection = (sectionId: string) => {
    toggleSection(sectionId);
    // Scroll logic would go here
  };

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
      status: mockCase.enrichment?.task_metadata.status || 'pending',
      taskMetadata: mockCase.enrichment?.task_metadata
    },
    {
      id: 'abstraction',
      label: 'Abstraction',
      status: mockCase.abstraction?.task_metadata.status || 'pending',
      taskMetadata: mockCase.abstraction?.task_metadata
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
                  {mockCase.patient.demographics.age}{mockCase.patient.demographics.gender} with central line, Day 5 S. aureus bacteremia
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
      {mockCase.enrichment && (
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
              <TaskMetadataBadge taskMetadata={mockCase.enrichment.task_metadata} />
              
              <Separator />
              
              {/* Enrichment Summary */}
              <EnrichmentSummaryPanel summary={mockCase.enrichment.summary} />
              
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
      {mockCase.abstraction && (
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
              <TaskMetadataBadge taskMetadata={mockCase.abstraction.task_metadata} />
              
              <Separator />
              
              {/* Clinical Narrative */}
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Clinical Narrative
                </h3>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm leading-relaxed">{mockCase.abstraction.narrative}</p>
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
                      {mockCase.abstraction.criteria_evaluation.determination}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Criteria Met:</span>
                    <span className="text-sm">
                      {mockCase.abstraction.criteria_evaluation.criteria_met_count} of {mockCase.abstraction.criteria_evaluation.criteria_total}
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
                  View Q&A History: {mockCase.abstraction.qa_history.length} interactions
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
