import { Card } from "@/components/ui/card"
import type { TimelinePhase } from "@/types/case"
import { format } from "date-fns"

interface TimelinePanelProps {
  timelinePhases?: TimelinePhase[]
}

export function TimelinePanel({ timelinePhases }: TimelinePanelProps) {
  if (!timelinePhases || timelinePhases.length === 0) {
    return null
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">Clinical Timeline</h3>
      <div className="space-y-4">
        {timelinePhases.map((phase, idx) => (
          <div key={idx} className="relative pl-6 pb-4 border-l-2 border-border last:border-0">
            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
            <h4 className="text-sm font-medium mb-1">{phase.phase}</h4>
            <p className="text-xs text-muted-foreground mb-2">
              {format(new Date(phase.start_date), "MMM d, yyyy")}
              {phase.end_date && ` - ${format(new Date(phase.end_date), "MMM d, yyyy")}`}
            </p>
            {phase.events.length > 0 && (
              <div className="space-y-1">
                {phase.events.map((event, eventIdx) => (
                  <div key={eventIdx} className="text-sm text-muted-foreground">
                    • {event.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
