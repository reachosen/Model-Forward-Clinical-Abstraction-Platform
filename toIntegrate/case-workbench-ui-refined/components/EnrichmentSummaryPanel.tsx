import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { PromptViewer } from "./PromptViewer"

interface EnrichmentSummaryPanelProps {
  summary?: string
  promptContent?: string
}

export function EnrichmentSummaryPanel({ summary, promptContent }: EnrichmentSummaryPanelProps) {
  if (!summary) return null

  return (
    <div className="space-y-2">
      <Card className="p-5 border-2 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">20/80 Clinical Summary</h3>
            <p className="text-xs text-muted-foreground font-medium">High-Yield Summary (20/80)</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
          </div>
        </div>
      </Card>

      {promptContent && (
        <div className="pl-1">
          <PromptViewer promptContent={promptContent} />
        </div>
      )}
    </div>
  )
}
