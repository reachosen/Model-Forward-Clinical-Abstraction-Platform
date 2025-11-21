import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SignalGroup, Core2080Summary } from "@/types/case"

interface TwentyEightyPanelProps {
  summary?: string
  signalGroups: SignalGroup[]
  core2080Summary?: Core2080Summary
  keyFindings?: string[]
}

export function TwentyEightyPanel({ summary, signalGroups, core2080Summary, keyFindings }: TwentyEightyPanelProps) {
  // Derive 20/80 summary if not provided by backend
  const findings = core2080Summary?.findings || keyFindings?.slice(0, 5) || []

  // Get anchor signals for each finding
  const getAnchorSignals = () => {
    const allSignals = signalGroups.flatMap((group) =>
      group.signals.map((signal) => ({
        ...signal,
        category: group.category,
      })),
    )

    // Sort by timestamp (if available) and take first 2-3 signals
    return allSignals
      .filter((signal) => signal.timestamp || signal.value)
      .slice(0, 3)
      .map((signal) => ({
        text: `${signal.name} ${signal.value}${signal.unit || ""}`,
        timestamp: signal.timestamp,
      }))
  }

  const anchorSignals = getAnchorSignals()

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">20/80 Core Signals</h3>
        <Badge variant="secondary">Key Findings</Badge>
      </div>

      <div className="space-y-4">
        {findings.length > 0 ? (
          findings.map((finding, idx) => (
            <div key={idx} className="space-y-2">
              <p className="text-sm leading-relaxed font-semibold">{finding}</p>
              {anchorSignals.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-4">
                  {anchorSignals.map((signal, signalIdx) => (
                    <Badge key={signalIdx} variant="outline" className="text-xs bg-muted py-0.5 px-2">
                      {signal.text}
                      {signal.timestamp && (
                        <span className="ml-1 text-muted-foreground">
                          ({new Date(signal.timestamp).toLocaleDateString()})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No core findings available</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
        These findings drive the suggested questions below and provide the foundation for clinical review.
      </p>
    </Card>
  )
}
