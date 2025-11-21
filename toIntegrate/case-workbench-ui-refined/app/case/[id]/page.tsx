"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { PipelineStepper } from "@/components/PipelineStepper"
import { PhaseHeader } from "@/components/PhaseHeader"
import { TaskMetadataBadge } from "@/components/TaskMetadataBadge"
import { EnrichmentSummaryPanel } from "@/components/EnrichmentSummaryPanel"
import { SignalsPanel } from "@/components/SignalsPanel"
import { TimelinePanel } from "@/components/TimelinePanel"
import { AskTheCasePanel } from "@/components/AskTheCasePanel"
import { InterrogationPanel } from "@/components/InterrogationPanel"
import { FeedbackForm } from "@/components/FeedbackForm"
import type { StructuredCase, TaskStatus } from "@/types/case"
import { Badge } from "@/components/ui/badge"
import { ClinicalReasoningFlow } from "@/components/ClinicalReasoningFlow"
import { SuggestedQuestionsPanel } from "@/components/SuggestedQuestionsPanel"

// Mock API functions - these would be imported from api/client.ts and services/promptService.ts
async function getStructuredCase(caseId: string): Promise<StructuredCase> {
  // Mock implementation
  return {
    patient: {
      age: 45,
      sex: "F",
      case_id: caseId,
    },
    concern_id: "clabsi-001",
    demo_mode: true,
  }
}

async function runEnrichment(caseId: string, promptVersion: string) {
  // Mock implementation
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return {
    task_metadata: {
      status: "completed" as TaskStatus,
      executed_at: new Date().toISOString(),
      prompt_version: promptVersion,
    },
    summary: "Patient presents with fever and positive blood cultures. Central line in place for 7 days.",
    prompt_content: `# Enrichment Task Prompt v${promptVersion}

## Objective
Analyze patient clinical data and identify key signals, timeline events, and generate a 20/80 summary for HAC detection.

## Instructions
1. Extract vital signs, laboratory values, and device information
2. Construct a clinical timeline with key events
3. Generate a concise 20/80 summary highlighting the most critical information
4. Identify potential HAC signals based on specification criteria`,
    signal_groups: [
      {
        category: "Vital Signs",
        signals: [
          { id: "1", name: "Temperature", value: 38.5, unit: "°C" },
          { id: "2", name: "Heart Rate", value: 102, unit: "bpm" },
        ],
      },
      {
        category: "Laboratory",
        signals: [
          { id: "3", name: "WBC", value: 14.2, unit: "K/µL" },
          { id: "4", name: "Blood Culture", value: "Positive (Staph aureus)" },
        ],
      },
    ],
    timeline_phases: [
      {
        phase: "Line Insertion",
        start_date: "2024-01-10",
        events: [{ date: "2024-01-10", description: "Central line placed in right subclavian" }],
      },
      {
        phase: "Infection Development",
        start_date: "2024-01-15",
        events: [
          { date: "2024-01-15", description: "Fever onset" },
          { date: "2024-01-16", description: "Blood cultures drawn" },
        ],
      },
    ],
  }
}

async function runAbstraction(caseId: string, promptVersion: string) {
  // Mock implementation
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return {
    task_metadata: {
      status: "completed" as TaskStatus,
      executed_at: new Date().toISOString(),
      prompt_version: promptVersion,
    },
    narrative:
      "This is a 45-year-old female with a central venous catheter in place for 7 days who developed fever and bacteremia. Blood cultures are positive for Staphylococcus aureus. The patient meets specification criteria for CLABSI based on positive blood culture with a recognized pathogen and presence of a central line at the time of or within 48 hours before specimen collection. No alternative source of infection was identified.",
    determination: "CLABSI_CONFIRMED",
    prompt_content: `# Clinical Review Prompt v${promptVersion}

## Objective
Evaluate case against specification criteria for CLABSI and generate clinical narrative with evidence-based determination.

## Context
You have access to enriched clinical signals, timeline, and 20/80 summary. Use this to:
1. Generate comprehensive clinical narrative
2. Evaluate each specification criterion with supporting evidence
3. Provide confidence scores for each criterion
4. Make final determination with overall confidence

## Specification Criteria
- Central line present at time of or within 48h before specimen collection
- Positive blood culture with recognized pathogen
- No alternative source of infection identified
- Patient has at least one of: fever, chills, or hypotension

## Interactive Q&A
When user asks questions, provide evidence-based answers using the enriched clinical data and timeline. Cite specific signals and events in your responses.`,
    criteria_evaluation: {
      criteria_met: [
        {
          criterion_id: "c1",
          criterion_name: "Central line present",
          met: true,
          evidence: "Central line documented in right subclavian vein, placed on 2024-01-10",
          confidence: 0.98,
        },
        {
          criterion_id: "c2",
          criterion_name: "Positive blood culture",
          met: true,
          evidence: "Blood culture positive for Staphylococcus aureus on 2024-01-16",
          confidence: 0.99,
        },
        {
          criterion_id: "c3",
          criterion_name: "Recognized pathogen",
          met: true,
          evidence: "Staph aureus is a recognized pathogen per specification criteria",
          confidence: 1.0,
        },
        {
          criterion_id: "c4",
          criterion_name: "No alternative source",
          met: true,
          evidence: "No other infection source documented in clinical notes",
          confidence: 0.85,
        },
      ],
      total_criteria: 4,
      met_count: 4,
      overall_confidence: 0.95,
    },
    suggested_questions: [
      { text: "What is the duration of the central line?" },
      { text: "Are there any other potential sources of infection?" },
    ],
  }
}

async function getLatestPrompt(concernId: string, phase: string) {
  return "1.0"
}

async function interrogateTask(caseId: string, question: string) {
  // Mock implementation
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return {
    answer: "Based on the clinical data, the patient had a central line for 7 days before developing symptoms.",
    confidence: 0.92,
  }
}

export default function CaseViewPage({ params }: { params: { id: string } }) {
  const { id } = params

  const [structuredCase, setStructuredCase] = useState<StructuredCase | null>(null)
  const [activeTab, setActiveTab] = useState<"context" | "enrichment" | "abstraction" | "feedback">("context")

  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null)
  const [enrichmentPromptVersion, setEnrichmentPromptVersion] = useState<string | null>(null)

  const [abstractionLoading, setAbstractionLoading] = useState(false)
  const [abstractionError, setAbstractionError] = useState<string | null>(null)
  const [abstractionPromptVersion, setAbstractionPromptVersion] = useState<string | null>(null)

  const [showQAHistory, setShowQAHistory] = useState(false)
  const [askLoading, setAskLoading] = useState(false)

  // Load case data
  useEffect(() => {
    const loadCase = async () => {
      const caseData = await getStructuredCase(id)
      setStructuredCase(caseData)
    }
    loadCase()
  }, [id])

  // Auto-run enrichment when tab is activated
  useEffect(() => {
    if (
      activeTab === "enrichment" &&
      structuredCase?.patient &&
      (!structuredCase.enrichment || structuredCase.enrichment.task_metadata.status === "pending")
    ) {
      handleRunEnrichment()
    }
  }, [activeTab, structuredCase])

  // Auto-run abstraction when tab is activated
  useEffect(() => {
    if (
      activeTab === "abstraction" &&
      structuredCase?.enrichment?.task_metadata.status === "completed" &&
      (!structuredCase.abstraction || structuredCase.abstraction.task_metadata.status === "pending")
    ) {
      handleRunAbstraction()
    }
  }, [activeTab, structuredCase])

  const handleRunEnrichment = useCallback(async () => {
    if (!structuredCase?.concern_id) return

    setEnrichmentLoading(true)
    setEnrichmentError(null)

    try {
      const promptVersion = await getLatestPrompt(structuredCase.concern_id, "enrichment")
      setEnrichmentPromptVersion(promptVersion)

      const result = await runEnrichment(id, promptVersion)

      setStructuredCase((prev) => (prev ? { ...prev, enrichment: result } : null))
    } catch (error) {
      setEnrichmentError(error instanceof Error ? error.message : "Failed to run enrichment")
    } finally {
      setEnrichmentLoading(false)
    }
  }, [id, structuredCase?.concern_id])

  const handleRunAbstraction = useCallback(async () => {
    if (!structuredCase?.concern_id) return

    setAbstractionLoading(true)
    setAbstractionError(null)

    try {
      const promptVersion = await getLatestPrompt(structuredCase.concern_id, "abstraction")
      setAbstractionPromptVersion(promptVersion)

      const result = await runAbstraction(id, promptVersion)

      setStructuredCase((prev) => ({
        ...prev!,
        abstraction: result,
      }))
    } catch (error) {
      setAbstractionError(error instanceof Error ? error.message : "Failed to run abstraction")
    } finally {
      setAbstractionLoading(false)
    }
  }, [id, structuredCase?.concern_id])

  const handleAskQuestion = async (question: string) => {
    setAskLoading(true)
    try {
      const result = await interrogateTask(id, question)
      const newInterrogation = {
        question,
        answer: result.answer,
        timestamp: new Date().toISOString(),
        confidence: result.confidence,
      }

      setStructuredCase((prev) => ({
        ...prev!,
        interrogations: [...(prev?.interrogations || []), newInterrogation],
      }))
    } finally {
      setAskLoading(false)
    }
  }

  const handleQuestionClick = (question: any) => {
    handleAskQuestion(question.text)
  }

  if (!structuredCase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Determine pipeline stage statuses
  const enrichmentStatus: TaskStatus = enrichmentLoading
    ? "in_progress"
    : enrichmentError
      ? "failed"
      : structuredCase.enrichment?.task_metadata.status || "pending"

  const abstractionStatus: TaskStatus = abstractionLoading
    ? "in_progress"
    : abstractionError
      ? "failed"
      : structuredCase.abstraction?.task_metadata.status || "pending"

  const pipelineSteps = [
    { id: "context", label: "Context", status: "completed" as TaskStatus },
    { id: "enrichment", label: "Enrichment", status: enrichmentStatus },
    { id: "abstraction", label: "Clinical Review", status: abstractionStatus },
    { id: "feedback", label: "Feedback", status: "pending" as TaskStatus },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      {structuredCase.demo_mode && (
        <Alert className="rounded-none border-x-0 border-t-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Demo Mode: This is a demonstration case with mock data</AlertDescription>
        </Alert>
      )}

      {/* Case Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold mb-2">Case Review</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Patient Age: {structuredCase.patient.age}</span>
            <span>•</span>
            <span>Sex: {structuredCase.patient.sex}</span>
            <span>•</span>
            <span>Case ID: {structuredCase.patient.case_id}</span>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <PipelineStepper
        steps={pipelineSteps}
        activeStep={activeTab}
        onStepClick={(stepId) => setActiveTab(stepId as typeof activeTab)}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          {/* Context Phase */}
          <TabsContent value="context" className="mt-0">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Patient Context</h2>
              <div className="space-y-4">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">Age:</span> {structuredCase.patient.age}
                  </div>
                  <div>
                    <span className="font-medium">Sex:</span> {structuredCase.patient.sex}
                  </div>
                  <div>
                    <span className="font-medium">Case ID:</span> {structuredCase.patient.case_id}
                  </div>
                </div>

                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Future: display demographics, timeline, and raw clinical data here (devices, labs, notes, events).
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Enrichment Phase */}
          <TabsContent value="enrichment" className="mt-0">
            {enrichmentLoading && !structuredCase.enrichment ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Running enrichment...</p>
                  {enrichmentPromptVersion && (
                    <p className="text-xs text-muted-foreground">Using prompt version {enrichmentPromptVersion}</p>
                  )}
                </div>
              </Card>
            ) : enrichmentError ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Enrichment Failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{enrichmentError}</p>
                  <Button onClick={handleRunEnrichment} variant="outline">
                    Retry Enrichment
                  </Button>
                </div>
              </Card>
            ) : structuredCase.enrichment ? (
              <Card className="p-6 space-y-6">
                <PhaseHeader
                  title="Enrichment"
                  status={enrichmentStatus}
                  executedAt={structuredCase.enrichment.task_metadata.executed_at}
                  promptVersion={enrichmentPromptVersion || structuredCase.enrichment.task_metadata.prompt_version}
                  isRunning={enrichmentLoading}
                  onRun={handleRunEnrichment}
                />

                {/* Summary Section */}
                <div className="space-y-3">
                  <TaskMetadataBadge metadata={structuredCase.enrichment.task_metadata} />
                  <EnrichmentSummaryPanel
                    summary={structuredCase.enrichment.summary}
                    promptContent={structuredCase.enrichment.prompt_content}
                  />
                </div>

                {/* Signals and Timeline */}
                {((structuredCase.enrichment.signal_groups && structuredCase.enrichment.signal_groups.length > 0) ||
                  (structuredCase.enrichment.timeline_phases &&
                    structuredCase.enrichment.timeline_phases.length > 0)) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <SignalsPanel signalGroups={structuredCase.enrichment.signal_groups} />
                    <TimelinePanel timelinePhases={structuredCase.enrichment.timeline_phases} />
                  </div>
                )}

                {/* Action Area */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Enrichment based on latest prompt version</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRunEnrichment}>
                      Re-run Enrichment
                    </Button>
                    <Button variant="outline" size="sm">
                      View Task Details
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">No enrichment data yet</p>
                  <Button onClick={handleRunEnrichment}>Run Enrichment</Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Clinical Review (Abstraction) Phase */}
          <TabsContent value="abstraction" className="mt-0">
            {abstractionLoading && !structuredCase.abstraction ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Running clinical abstraction...</p>
                  {abstractionPromptVersion && (
                    <p className="text-xs text-muted-foreground">Using prompt version {abstractionPromptVersion}</p>
                  )}
                </div>
              </Card>
            ) : abstractionError ||
              !structuredCase.enrichment ||
              structuredCase.enrichment.task_metadata.status !== "completed" ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {abstractionError ? "Clinical Review Failed" : "Enrichment Required"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {abstractionError || "Please complete enrichment first"}
                  </p>
                  {abstractionError && structuredCase.enrichment?.task_metadata.status === "completed" && (
                    <Button onClick={handleRunAbstraction} variant="outline">
                      Retry Clinical Review
                    </Button>
                  )}
                </div>
              </Card>
            ) : structuredCase.abstraction ? (
              <div className="space-y-6">
                <ClinicalReasoningFlow />

                <Card className="p-6 space-y-6">
                  <PhaseHeader
                    title="Clinical Review"
                    status={abstractionStatus}
                    executedAt={structuredCase.abstraction.task_metadata.executed_at}
                    promptVersion={abstractionPromptVersion || structuredCase.abstraction.task_metadata.prompt_version}
                    llmModel="GPT-4"
                    isRunning={abstractionLoading}
                    onRun={handleRunAbstraction}
                    disableRun={structuredCase.enrichment?.task_metadata.status !== "completed"}
                  />

                  <div className="space-y-6">
                    {/* 20/80 Summary at top */}
                    {structuredCase.enrichment?.summary && (
                      <EnrichmentSummaryPanel
                        summary={structuredCase.enrichment.summary}
                        promptContent={structuredCase.enrichment.prompt_content}
                      />
                    )}

                    {/* Narrative & Criteria Grid */}
                    <div className="space-y-6">
                      <div className="border-l-4 border-primary pl-4">
                        <h2 className="text-lg font-bold mb-1">Clinical Assessment</h2>
                        <p className="text-sm text-muted-foreground">
                          Narrative summary and specification criteria evaluation
                        </p>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Clinical Narrative */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold">Clinical Narrative</h3>
                            <p className="text-xs text-muted-foreground">Comprehensive case summary</p>
                          </div>
                          <div className="p-4 rounded-lg border bg-muted/50 max-h-[300px] overflow-y-auto">
                            <p className="text-sm leading-relaxed">{structuredCase.abstraction.narrative}</p>
                          </div>
                        </div>

                        {/* Specification Criteria Summary */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold">Specification Determination</h3>
                            <p className="text-xs text-muted-foreground">Criteria evaluation summary</p>
                          </div>
                          <div className="p-4 rounded-lg border space-y-3">
                            {structuredCase.abstraction.determination && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm px-3 py-1">
                                {structuredCase.abstraction.determination}
                              </Badge>
                            )}
                            <div className="text-sm space-y-1.5">
                              <div>
                                <span className="font-medium">Criteria met:</span>{" "}
                                {structuredCase.abstraction.criteria_evaluation.met_count} of{" "}
                                {structuredCase.abstraction.criteria_evaluation.total_criteria}
                              </div>
                              {structuredCase.abstraction.criteria_evaluation.overall_confidence && (
                                <div>
                                  <span className="font-medium">Confidence:</span>{" "}
                                  {(structuredCase.abstraction.criteria_evaluation.overall_confidence * 100).toFixed(0)}
                                  %
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Evidence Grid */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-primary pl-4">
                        <h2 className="text-lg font-bold mb-1">Evidence Grid</h2>
                        <p className="text-sm text-muted-foreground">Detailed criteria with supporting evidence</p>
                      </div>

                      <div className="space-y-2">
                        {structuredCase.abstraction.criteria_evaluation.criteria_met.map((criterion) => (
                          <div key={criterion.criterion_id} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{criterion.criterion_name}</span>
                              <Badge variant={criterion.met ? "default" : "secondary"}>
                                {criterion.met ? "MET" : "NOT MET"}
                              </Badge>
                            </div>
                            {criterion.evidence && (
                              <p className="text-sm text-muted-foreground">{criterion.evidence}</p>
                            )}
                            {criterion.confidence && (
                              <p className="text-xs text-muted-foreground">
                                Confidence: {(criterion.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {structuredCase.enrichment && (
                      <SuggestedQuestionsPanel
                        concernId={structuredCase.concern_id}
                        hacType="CLABSI"
                        summary={structuredCase.enrichment.summary}
                        signalGroups={structuredCase.enrichment.signal_groups || []}
                        suggestedQuestions={structuredCase.abstraction.suggested_questions}
                        onQuestionClick={handleQuestionClick}
                      />
                    )}

                    {/* Interactive Q&A Section */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-primary pl-4">
                        <h2 className="text-lg font-bold mb-1">Interactive Q&A</h2>
                        <p className="text-sm text-muted-foreground">Ask questions about this case</p>
                      </div>

                      <AskTheCasePanel
                        onAsk={handleAskQuestion}
                        isLoading={askLoading}
                        promptContent={structuredCase.abstraction.prompt_content}
                      />

                      {structuredCase.interrogations && structuredCase.interrogations.length > 0 && (
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" onClick={() => setShowQAHistory(!showQAHistory)}>
                            {showQAHistory ? "Hide" : "Show"} Q&A History ({structuredCase.interrogations.length})
                          </Button>
                          {showQAHistory && <InterrogationPanel interrogations={structuredCase.interrogations} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={handleRunAbstraction}>
                      Re-run Clinical Review
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {structuredCase.enrichment?.task_metadata.status !== "completed"
                      ? "Please complete enrichment first"
                      : "No clinical review data yet"}
                  </p>
                  <Button
                    onClick={handleRunAbstraction}
                    disabled={structuredCase.enrichment?.task_metadata.status !== "completed"}
                  >
                    Run Clinical Abstraction
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Feedback Phase */}
          <TabsContent value="feedback" className="mt-0">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Feedback</h2>
              <FeedbackForm />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
