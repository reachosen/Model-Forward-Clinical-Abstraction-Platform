import { Card } from "@/components/ui/card"
import { ArrowDown, FileSearch, Stethoscope, ClipboardCheck, MessageSquareText } from "lucide-react"

export function ClinicalReasoningFlow() {
  const steps = [
    {
      icon: FileSearch,
      label: "Clinical Summary",
      description: "20/80 findings and key signals",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      icon: MessageSquareText,
      label: "Suggested Questions",
      description: "HAC-relevant inquiries",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      icon: Stethoscope,
      label: "Clinical Narrative",
      description: "Comprehensive case assessment",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      icon: ClipboardCheck,
      label: "Specification Criteria", // Updated from "NHSN Criteria" to "Specification Criteria"
      description: "Evidence-based evaluation",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ]

  return (
    <Card className="p-6 bg-muted/30">
      <h3 className="text-sm font-semibold mb-4 text-center">Clinical Reasoning Flow</h3>
      <div className="flex items-center justify-between gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={idx} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`rounded-full ${step.bgColor} p-3`}>
                  <Icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">{step.label}</div>
                  <div className="text-xs text-muted-foreground max-w-[100px]">{step.description}</div>
                </div>
              </div>
              {idx < steps.length - 1 && <ArrowDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
