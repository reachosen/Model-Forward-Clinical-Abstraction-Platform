'use client';

import { useState, useEffect } from 'react';
import { PipelineStepper } from '@/components/PipelineStepper';
import { PhaseHeader } from '@/components/PhaseHeader';
import { EnrichmentSummaryPanel } from '@/components/EnrichmentSummaryPanel';
import { SignalsPanel } from '@/components/SignalsPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { AskTheCasePanel } from '@/components/AskTheCasePanel';
import { InterrogationPanel } from '@/components/InterrogationPanel';
import { FeedbackForm } from '@/components/FeedbackForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { TwentyEightyPanel } from '@/components/TwentyEightyPanel';
import { SuggestedQuestionsPanel } from '@/components/SuggestedQuestionsPanel';
import type { StructuredCase, InterrogationEntry, SuggestedQuestion } from '@/types/case';

interface CaseViewPageProps {
  caseId: string;
}

// Mock API functions - replace with real implementations
async function fetchCase(caseId: string): Promise<StructuredCase> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    patient: {
      age: 45,
      sex: 'M',
      case_id: caseId,
    },
    concern_id: 'chest-pain-001',
    demo_mode: true,
    enrichment: {
      task_metadata: {
        status: 'pending',
      },
    },
    abstraction: {
      task_metadata: {
        status: 'pending',
      },
      narrative: '',
      criteria_evaluation: {
        criteria_met: [],
        total_criteria: 0,
        met_count: 0,
      },
    },
    interrogations: [],
  };
}

async function runEnrichment(caseId: string): Promise<StructuredCase['enrichment']> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    task_metadata: {
      status: 'completed',
      executed_at: new Date().toISOString(),
      prompt_version: 'v1.2.3',
    },
    summary: 'Patient presents with acute onset chest pain radiating to left arm. ECG shows ST elevation in leads II, III, and aVF. Troponin levels elevated at 2.4 ng/mL.',
    key_findings: [
      'ST elevation in inferior leads (II, III, aVF) indicating acute myocardial injury',
      'Elevated troponin I at 2.4 ng/mL (>60x upper limit of normal) confirming cardiac damage',
      'Chest pain duration >20 minutes with radiation to left arm, classic for MI',
    ],
    signal_groups: [
      {
        category: 'Vital Signs',
        signals: [
          { id: '1', name: 'Heart Rate', value: 98, unit: 'bpm', timestamp: '2024-01-15T10:30:00Z' },
          { id: '2', name: 'Blood Pressure', value: '145/92', unit: 'mmHg', timestamp: '2024-01-15T10:30:00Z' },
          { id: '3', name: 'Temperature', value: 98.6, unit: '°F', timestamp: '2024-01-15T10:30:00Z' },
        ],
      },
      {
        category: 'Lab Results',
        signals: [
          { id: '4', name: 'Troponin I', value: 2.4, unit: 'ng/mL', timestamp: '2024-01-15T11:00:00Z' },
          { id: '5', name: 'CK-MB', value: 45, unit: 'U/L', timestamp: '2024-01-15T11:00:00Z' },
        ],
      },
    ],
    timeline_phases: [
      {
        phase: 'Initial Presentation',
        start_date: '2024-01-15',
        events: [
          { date: '2024-01-15', description: 'Patient arrived at ED with chest pain' },
          { date: '2024-01-15', description: 'ECG performed showing ST elevation' },
        ],
      },
    ],
  };
}

async function runAbstraction(caseId: string): Promise<StructuredCase['abstraction']> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    task_metadata: {
      status: 'completed',
      executed_at: new Date().toISOString(),
      prompt_version: 'v1.0.5',
    },
    narrative: 'Based on clinical presentation and diagnostic findings, patient meets criteria for STEMI (ST-Elevation Myocardial Infarction). Immediate intervention required.',
    determination: 'MEETS_CRITERIA',
    criteria_evaluation: {
      criteria_met: [
        {
          criterion_id: 'c1',
          criterion_name: 'Chest Pain Duration >20 minutes',
          met: true,
          evidence: 'Patient reported 45 minutes of chest pain',
          confidence: 0.95,
        },
        {
          criterion_id: 'c2',
          criterion_name: 'ST Elevation Present',
          met: true,
          evidence: 'ECG shows ST elevation in inferior leads',
          confidence: 0.98,
        },
        {
          criterion_id: 'c3',
          criterion_name: 'Elevated Cardiac Biomarkers',
          met: true,
          evidence: 'Troponin I: 2.4 ng/mL (normal <0.04)',
          confidence: 0.99,
        },
      ],
      total_criteria: 3,
      met_count: 3,
      overall_confidence: 0.97,
    },
    suggested_questions: [
      {
        id: 'sq1',
        text: 'Given the ST elevation in inferior leads and elevated troponin, what is the timeline from symptom onset to ECG confirmation?',
        priority: 'high',
        scope: 'signal',
        hac_type: 'STEMI',
        source_signal_ids: ['1', '4'],
      },
      {
        id: 'sq2',
        text: 'Does the documentation confirm the patient received reperfusion therapy within 90 minutes as per criteria?',
        priority: 'high',
        scope: 'criterion',
        hac_type: 'STEMI',
        source_criterion_keys: ['c1', 'c2'],
      },
    ],
  };
}

async function askQuestion(caseId: string, question: string): Promise<InterrogationEntry> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    question,
    answer: 'Based on the clinical data, the patient\'s prognosis depends on the timing of intervention. Early reperfusion therapy within the first 90 minutes significantly improves outcomes.',
    timestamp: new Date().toISOString(),
    confidence: 0.92,
  };
}

export function CaseViewPage({ caseId }: CaseViewPageProps) {
  const [caseData, setCaseData] = useState<StructuredCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState('context');
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [abstractionLoading, setAbstractionLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [askQuestionText, setAskQuestionText] = useState('');

  // Load case data
  useEffect(() => {
    const loadCase = async () => {
      try {
        setLoading(true);
        const data = await fetchCase(caseId);
        setCaseData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case');
      } finally {
        setLoading(false);
      }
    };
    loadCase();
  }, [caseId]);

  // Auto-run enrichment when enrichment tab is activated
  useEffect(() => {
    if (
      activePhase === 'enrichment' &&
      caseData?.enrichment?.task_metadata.status === 'pending' &&
      !enrichmentLoading
    ) {
      handleRunEnrichment();
    }
  }, [activePhase, caseData?.enrichment?.task_metadata.status]);

  // Auto-run abstraction when clinical review tab is activated
  useEffect(() => {
    if (
      activePhase === 'clinical_review' &&
      caseData?.enrichment?.task_metadata.status === 'completed' &&
      caseData?.abstraction?.task_metadata.status === 'pending' &&
      !abstractionLoading
    ) {
      handleRunAbstraction();
    }
  }, [activePhase, caseData?.enrichment?.task_metadata.status, caseData?.abstraction?.task_metadata.status]);

  const handleRunEnrichment = async () => {
    if (!caseData) return;
    setEnrichmentLoading(true);
    try {
      const enrichment = await runEnrichment(caseId);
      setCaseData({ ...caseData, enrichment });
    } catch (err) {
      setError('Failed to run enrichment');
    } finally {
      setEnrichmentLoading(false);
    }
  };

  const handleRunAbstraction = async () => {
    if (!caseData) return;
    setAbstractionLoading(true);
    try {
      const abstraction = await runAbstraction(caseId);
      setCaseData({ ...caseData, abstraction });
    } catch (err) {
      setError('Failed to run abstraction');
    } finally {
      setAbstractionLoading(false);
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!caseData) return;
    setAskLoading(true);
    try {
      const entry = await askQuestion(caseId, question);
      setCaseData({
        ...caseData,
        interrogations: [...(caseData.interrogations || []), entry],
      });
    } catch (err) {
      setError('Failed to ask question');
    } finally {
      setAskLoading(false);
    }
  };

  const handleSubmitFeedback = async (feedback: string, rating: number) => {
    console.log('[v0] Feedback submitted:', { feedback, rating });
    // Implement feedback submission
  };

  const handleSuggestedQuestionClick = (question: SuggestedQuestion) => {
    let mode: 'explain' | 'validate' | 'summarize' = 'summarize';
    let target: 'signal' | 'criterion' | 'overall' = 'overall';
    let targetId = 'case';

    if (question.scope === 'criterion') {
      mode = 'validate';
      target = 'criterion';
      targetId = question.source_criterion_keys?.[0] || 'unknown';
    } else if (question.scope === 'signal') {
      mode = 'explain';
      target = 'signal';
      targetId = question.source_signal_ids?.[0] || 'unknown';
    }

    console.log('[v0] Question clicked:', { question, mode, target, targetId });
    setAskQuestionText(question.text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load case'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const steps = [
    {
      id: 'context',
      label: 'Context',
      status: 'completed' as const,
    },
    {
      id: 'enrichment',
      label: 'Enrichment',
      status: caseData.enrichment?.task_metadata.status || 'pending',
    },
    {
      id: 'clinical_review',
      label: 'Clinical Review',
      status: caseData.abstraction?.task_metadata.status || 'pending',
    },
    {
      id: 'feedback',
      label: 'Feedback',
      status: 'pending' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PipelineStepper
        steps={steps}
        activeStep={activePhase}
        onStepClick={setActivePhase}
      />

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activePhase} onValueChange={setActivePhase}>
          <TabsList className="hidden">
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
            <TabsTrigger value="clinical_review">Clinical Review</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="context" className="space-y-6 mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Case ID:</span>
                  <span className="ml-2 font-medium">{caseData.patient.case_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <span className="ml-2 font-medium">{caseData.patient.age}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sex:</span>
                  <span className="ml-2 font-medium">{caseData.patient.sex}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Concern ID:</span>
                  <span className="ml-2 font-medium">{caseData.concern_id}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="enrichment" className="space-y-6 mt-6">
            <PhaseHeader
              title="Enrichment"
              status={caseData.enrichment?.task_metadata.status || 'pending'}
              executedAt={caseData.enrichment?.task_metadata.executed_at}
              promptVersion={caseData.enrichment?.task_metadata.prompt_version}
              isRunning={enrichmentLoading}
              onRun={handleRunEnrichment}
            />

            {caseData.enrichment?.task_metadata.status === 'completed' && (
              <div className="space-y-6">
                <EnrichmentSummaryPanel summary={caseData.enrichment.summary} />
                <SignalsPanel signalGroups={caseData.enrichment.signal_groups || []} />
                <TimelinePanel phases={caseData.enrichment.timeline_phases || []} />
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    These findings drive the 20/80 summary and suggested questions in Clinical Review.
                  </p>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clinical_review" className="space-y-6 mt-6">
            <PhaseHeader
              title="Clinical Review"
              status={caseData.abstraction?.task_metadata.status || 'pending'}
              executedAt={caseData.abstraction?.task_metadata.executed_at}
              promptVersion={caseData.abstraction?.task_metadata.prompt_version}
              isRunning={abstractionLoading}
              onRun={handleRunAbstraction}
              disableRun={caseData.enrichment?.task_metadata.status !== 'completed'}
            />

            {caseData.enrichment?.task_metadata.status !== 'completed' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Complete Enrichment first to unlock Clinical Review.
                </AlertDescription>
              </Alert>
            )}

            {caseData.abstraction?.task_metadata.status === 'completed' && caseData.enrichment && (
              <div className="space-y-6">
                <TwentyEightyPanel
                  summary={caseData.enrichment.summary}
                  signalGroups={caseData.enrichment.signal_groups || []}
                  core2080Summary={caseData.enrichment.core_20_80_summary}
                  keyFindings={caseData.enrichment.key_findings}
                />

                <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6">
                  <div className="space-y-6">
                    <AskTheCasePanel 
                      onAsk={handleAskQuestion} 
                      isLoading={askLoading}
                      value={askQuestionText}
                      onChange={setAskQuestionText}
                    />
                    {caseData.interrogations && caseData.interrogations.length > 0 && (
                      <InterrogationPanel interrogations={caseData.interrogations} />
                    )}
                  </div>

                  <SuggestedQuestionsPanel
                    concernId={caseData.concern_id}
                    hacType="STEMI"
                    summary={caseData.enrichment.summary}
                    signalGroups={caseData.enrichment.signal_groups || []}
                    suggestedQuestions={caseData.abstraction.suggested_questions}
                    onQuestionClick={handleSuggestedQuestionClick}
                  />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-3">Clinical Narrative</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {caseData.abstraction.narrative}
                    </p>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">NHSN Criteria Summary</h3>
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium">
                        {caseData.abstraction.criteria_evaluation.met_count} of{' '}
                        {caseData.abstraction.criteria_evaluation.total_criteria} criteria met
                      </div>
                      {caseData.abstraction.criteria_evaluation.overall_confidence && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Confidence: {(caseData.abstraction.criteria_evaluation.overall_confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {caseData.abstraction.criteria_evaluation.criteria_met.map((criterion) => (
                        <div key={criterion.criterion_id} className="border-l-4 border-green-500 pl-4">
                          <div className="font-medium text-sm">{criterion.criterion_name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{criterion.evidence}</div>
                          {criterion.confidence && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: {(criterion.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <FeedbackForm onSubmit={handleSubmitFeedback} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
