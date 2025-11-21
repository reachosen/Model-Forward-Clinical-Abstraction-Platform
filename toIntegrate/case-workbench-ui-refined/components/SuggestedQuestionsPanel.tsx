"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Signal, CheckCircle2, Clock, FileText } from "lucide-react"
import type { SuggestedQuestion, SignalGroup } from "@/types/case"

interface SuggestedQuestionsPanelProps {
  concernId: string
  hacType: string
  summary?: string
  signalGroups: SignalGroup[]
  suggestedQuestions?: SuggestedQuestion[]
  onQuestionClick: (question: SuggestedQuestion) => void
}

export function SuggestedQuestionsPanel({
  concernId,
  hacType,
  summary,
  signalGroups,
  suggestedQuestions,
  onQuestionClick,
}: SuggestedQuestionsPanelProps) {
  // Generate questions if not provided by backend
  const questions = suggestedQuestions || generateDefaultQuestions(hacType, signalGroups, summary)

  const questionsByScope = {
    signal: questions.filter((q) => q.scope === "signal"),
    criterion: questions.filter((q) => q.scope === "criterion"),
    timeline: questions.filter((q) => q.scope === "timeline"),
    overall: questions.filter((q) => q.scope === "overall"),
  }

  const scopeConfig = {
    signal: { label: "Signal-Based", icon: Signal, color: "text-blue-600 dark:text-blue-400" },
    criterion: { label: "Criteria", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
    timeline: { label: "Timeline", icon: Clock, color: "text-purple-600 dark:text-purple-400" },
    overall: { label: "Overall Case", icon: FileText, color: "text-orange-600 dark:text-orange-400" },
  }

  const priorityConfig = {
    high: { label: "High Priority", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
    low: { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  }

  return (
    <Card className="p-6 lg:sticky lg:top-6 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">HAC-Relevant Questions</h3>
        <Badge variant="secondary">{hacType}</Badge>
      </div>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {(Object.entries(questionsByScope) as [keyof typeof questionsByScope, SuggestedQuestion[]][]).map(
          ([scope, scopeQuestions]) => {
            if (scopeQuestions.length === 0) return null

            const config = scopeConfig[scope]
            const Icon = config.icon

            return (
              <div key={scope} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <h4 className="text-sm font-semibold">{config.label}</h4>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {scopeQuestions.length}
                  </Badge>
                </div>

                {scopeQuestions.map((question) => {
                  const priorityConf = priorityConfig[question.priority]
                  const basedOnText = getBasedOnText(question, signalGroups)

                  return (
                    <div key={question.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm leading-relaxed flex-1">{question.text}</p>
                        <Badge variant="secondary" className={`${priorityConf.className} text-xs shrink-0`}>
                          {question.priority}
                        </Badge>
                      </div>

                      {basedOnText && <p className="text-xs text-muted-foreground mb-2">Based on: {basedOnText}</p>}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onQuestionClick(question)}
                        className="w-full text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Ask This
                      </Button>
                    </div>
                  )
                })}
              </div>
            )
          },
        )}
      </div>
    </Card>
  )
}

// Helper to generate default questions if backend doesn't provide them
function generateDefaultQuestions(hacType: string, signalGroups: SignalGroup[], summary?: string): SuggestedQuestion[] {
  const allSignals = signalGroups.flatMap((g) => g.signals)

  // HAC-specific question templates
  if (hacType.toUpperCase().includes("CLABSI")) {
    return [
      {
        id: "q1",
        text: "Given the documented fever and positive blood culture, could an alternative infection source reduce the likelihood of CLABSI for this case?",
        priority: "high",
        scope: "signal",
        hac_type: "CLABSI",
        source_signal_ids: allSignals.slice(0, 2).map((s) => s.id),
      },
      {
        id: "q2",
        text: "Does the documentation confirm the central line was in place for at least 2 calendar days as required by specification criteria?", // Updated from "NHSN criteria" to "specification criteria"
        priority: "high",
        scope: "criterion",
        hac_type: "CLABSI",
        source_criterion_keys: ["line_days"],
      },
      {
        id: "q3",
        text: "What is the timeline between line insertion and the first positive blood culture?",
        priority: "medium",
        scope: "timeline",
        hac_type: "CLABSI",
      },
      {
        id: "q4",
        text: "Is there missing documentation that may change the specification determination for this case?", // Updated from "NHSN determination" to "specification determination"
        priority: "medium",
        scope: "overall",
        hac_type: "CLABSI",
      },
    ]
  }

  // Generic fallback questions
  return [
    {
      id: "q1",
      text: "What are the key clinical indicators that support or contradict the HAC determination?",
      priority: "high",
      scope: "signal",
      hac_type: hacType,
    },
    {
      id: "q2",
      text: "Are all required specification criteria documented and verified in this case?", // Updated from "NHSN criteria" to "specification criteria"
      priority: "high",
      scope: "criterion",
      hac_type: hacType,
    },
    {
      id: "q3",
      text: "What is the temporal sequence of events relevant to this HAC?",
      priority: "medium",
      scope: "timeline",
      hac_type: hacType,
    },
    {
      id: "q4",
      text: "What additional documentation would strengthen or weaken this determination?",
      priority: "medium",
      scope: "overall",
      hac_type: hacType,
    },
  ]
}

// Helper to format "Based on" text
function getBasedOnText(question: SuggestedQuestion, signalGroups: SignalGroup[]): string {
  const allSignals = signalGroups.flatMap((g) => g.signals)

  if (question.source_signal_ids && question.source_signal_ids.length > 0) {
    const signals = question.source_signal_ids
      .map((id) => allSignals.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => `${s!.name} ${s!.value}${s!.unit || ""}`)
      .join(", ")
    return signals
  }

  if (question.source_criterion_keys && question.source_criterion_keys.length > 0) {
    return `Criterion: ${question.source_criterion_keys.join(", ")}`
  }

  return ""
}
