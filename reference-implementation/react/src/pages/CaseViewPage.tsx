/**
 * Case View Page - Tabbed Layout
 * Main page for viewing and abstracting a case with Context/Enrichment/Clinical Review tabs
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Sparkles, FileText, MessageSquare } from 'lucide-react';
import api from '../api/client';
import { StructuredCase, PipelineStage } from '../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { PipelineStepper } from '../components/PipelineStepper';
import { TaskMetadataBadge } from '../components/TaskMetadataBadge';
import { EnrichmentSummaryPanel } from '../components/EnrichmentSummaryPanel';
import { SignalsPanel } from '../components/SignalsPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { AskTheCasePanel } from '../components/AskTheCasePanel';
import { InterrogationPanel } from '../components/InterrogationPanel';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { FeedbackForm } from '../components/FeedbackForm';
import './CaseViewPage.css';

const CaseViewPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [structuredCase, setStructuredCase] = useState<StructuredCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("context");

  const loadCase = async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      // Determine concern from patientId (e.g., "clabsi_demo_001" -> "clabsi")
      const concernId = patientId.split('_')[0] || 'clabsi';
      const data = await api.getStructuredCase(concernId, patientId);
      setStructuredCase(data);
    } catch (err) {
      setError('Failed to load case. Please try again.');
      console.error('Error loading case:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
  };

  const handleQuestionSubmit = async (question: string, mode: string, targetType: string) => {
    try {
      const taskId = structuredCase?.abstraction?.task_metadata?.task_id || 'clabsi.abstraction';
      await api.interrogateTask(
        taskId,
        question,
        {
          mode: mode as "explain" | "summarize" | "validate",
          target_type: targetType as "criterion" | "signal" | "event" | "overall",
          target_id: 'case',
          program_type: 'CLABSI',
          metric_id: 'CLABSI',
        }
      );
      // Reload the case to get updated QA history
      loadCase();
    } catch (error) {
      console.error('Error submitting question:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="case-view-page">
        <div className="page-loading">Loading case data...</div>
      </div>
    );
  }

  if (error || !structuredCase) {
    return (
      <div className="case-view-page">
        <div className="page-error">
          Error loading case: {error || 'Case not found'}
        </div>
      </div>
    );
  }

  const isDemoMode = structuredCase.enrichment?.task_metadata.demo_mode ||
                     structuredCase.abstraction?.task_metadata.demo_mode ||
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
      status: structuredCase.enrichment?.task_metadata.status || 'pending',
      taskMetadata: structuredCase.enrichment?.task_metadata
    },
    {
      id: 'abstraction',
      label: 'Clinical Review',
      status: structuredCase.abstraction?.task_metadata.status || 'pending',
      taskMetadata: structuredCase.abstraction?.task_metadata
    },
    {
      id: 'feedback',
      label: 'Feedback',
      status: 'pending'
    }
  ];

  return (
    <div className="case-view-page">
      <div className="page-container">
        {isDemoMode && <DemoModeBanner />}

        {/* Pipeline Stepper */}
        <PipelineStepper
          stages={pipelineStages}
          currentStage={activeTab}
          onStageClick={scrollToSection}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="case-tabs">
          <TabsList className="grid grid-cols-4">
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
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Patient Context */}
          <TabsContent value="context" className="mt-6">
            <Card>
              <div className="card-content">
                <div className="space-y-4">
                  <div className="context-summary">
                    <h3 className="context-summary-title">Patient Summary</h3>
                    <p className="context-summary-text">
                      {structuredCase.patient.demographics.age}yo {structuredCase.patient.demographics.gender} - {structuredCase.case_id}
                    </p>
                  </div>

                  <div className="context-placeholder">
                    Demographics, timeline, and raw clinical data would be displayed here.
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab Content: Enrichment */}
          <TabsContent value="enrichment" className="mt-6">
            {structuredCase.enrichment ? (
              <Card>
                <div className="card-content enrichment-content">
                  {/* Task Metadata Badge */}
                  <TaskMetadataBadge taskMetadata={structuredCase.enrichment.task_metadata} />

                  <Separator />

                  {/* Enrichment Summary */}
                  <EnrichmentSummaryPanel summary={structuredCase.enrichment.summary} />

                  <Separator />

                  {structuredCase.enrichment.signal_groups.length > 0 && (
                    <>
                      <SignalsPanel
                        signalGroups={structuredCase.enrichment.signal_groups}
                        timelinePhases={structuredCase.enrichment.timeline_phases}
                      />
                      <Separator />
                    </>
                  )}

                  {structuredCase.enrichment.timeline_phases.length > 0 && (
                    <>
                      <TimelinePanel timelinePhases={structuredCase.enrichment.timeline_phases} />
                      <Separator />
                    </>
                  )}

                  <div className="action-buttons">
                    <Button variant="outline" size="sm">
                      Re-run with v1.1
                    </Button>
                    <Button variant="outline" size="sm">
                      View Task Details
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="card-content empty-state">
                  No enrichment data available
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Tab Content: Clinical Review */}
          <TabsContent value="abstraction" className="mt-6">
            {structuredCase.abstraction ? (
              <Card>
                <div className="card-content abstraction-content">
                  {/* Task Metadata Badge */}
                  <TaskMetadataBadge taskMetadata={structuredCase.abstraction.task_metadata} />

                  <Separator />

                  {/* Clinical Narrative */}
                  <div className="narrative-section">
                    <h3 className="section-subtitle">Clinical Narrative</h3>
                    <div className="narrative-box">
                      <p className="narrative-text">{structuredCase.abstraction.narrative}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Criteria Evaluation Summary */}
                  <div className="criteria-summary-section">
                    <h3 className="section-subtitle">NHSN Criteria Evaluation</h3>
                    <div className="criteria-summary-box">
                      <div className="criteria-row">
                        <span className="criteria-label">Determination:</span>
                        <span className="criteria-value determination">
                          {structuredCase.abstraction.criteria_evaluation.determination}
                        </span>
                      </div>
                      <div className="criteria-row">
                        <span className="criteria-label-muted">Criteria Met:</span>
                        <span className="criteria-count">
                          {structuredCase.abstraction.criteria_evaluation.criteria_met_count || 0} of {structuredCase.abstraction.criteria_evaluation.total_criteria || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <AskTheCasePanel
                    caseId={structuredCase.case_id}
                    qaHistoryCount={structuredCase.qa?.qa_history?.length || 0}
                    onQuestionSubmit={handleQuestionSubmit}
                  />

                  <Separator />

                  <InterrogationPanel qaHistory={structuredCase.qa?.qa_history || []} />

                  <Separator />

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <Button variant="outline" size="sm" disabled>
                      View Detailed Criteria (Coming Soon)
                    </Button>
                    <Button variant="outline" size="sm">
                      View Q&A History: {structuredCase.qa?.qa_history?.length || 0} interactions
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="card-content empty-state">
                  No clinical review data available
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Tab Content: Feedback */}
          <TabsContent value="feedback" className="mt-6">
            <Card>
              <div className="card-content">
                <FeedbackForm
                  caseId={structuredCase.case_id}
                  concernId={structuredCase.concern_id}
                  patientId={structuredCase.patient.case_metadata.patient_id}
                  encounterId={structuredCase.patient.case_metadata.encounter_id}
                  isDemoMode={structuredCase.abstraction?.task_metadata.demo_mode || false}
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CaseViewPage;
