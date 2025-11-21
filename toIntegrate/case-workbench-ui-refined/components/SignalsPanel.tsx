import { Card } from "@/components/ui/card"
import type { SignalGroup } from "@/types/case"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SignalsPanelProps {
  signalGroups?: SignalGroup[]
}

export function SignalsPanel({ signalGroups }: SignalsPanelProps) {
  if (!signalGroups || signalGroups.length === 0) {
    return null
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">Clinical Signals</h3>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-4">
          {signalGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-sm font-medium text-primary">{group.category}</h4>
              <div className="space-y-1 pl-3 border-l-2 border-border">
                {group.signals.map((signal) => (
                  <div key={signal.id} className="text-sm">
                    <span className="font-medium">{signal.name}:</span>{" "}
                    <span className="text-muted-foreground">
                      {signal.value}
                      {signal.unit && ` ${signal.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
