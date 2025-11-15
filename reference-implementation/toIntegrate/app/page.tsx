'use client'

import { useState } from 'react'
import EnhancedTimeline from '@/components/enhanced-timeline'
import { TimelineEvent, PhaseConfig } from '@/types/timeline'

const sampleTimeline: TimelineEvent[] = [
  {
    event_id: "TL001",
    event_datetime: "2024-01-10T16:00:00",
    event_type: "LINE_INSERTION",
    description: "Right subclavian triple-lumen central line placed",
    phase: "LINE_PLACEMENT",
    severity: "INFO"
  },
  {
    event_id: "TL002",
    event_datetime: "2024-01-15T08:30:00",
    event_type: "CULTURE_DRAWN",
    description: "Blood culture drawn from central line due to fever",
    phase: "CULTURE",
    severity: "WARNING"
  },
  {
    event_id: "TL003",
    event_datetime: "2024-01-15T10:00:00",
    event_type: "ANTIBIOTIC_STARTED",
    description: "Empiric vancomycin and cefepime initiated",
    phase: "POST_CULTURE",
    severity: "INFO"
  },
  {
    event_id: "TL004",
    event_datetime: "2024-01-16T14:00:00",
    event_type: "CULTURE_POSITIVE",
    description: "Blood culture positive for S. aureus",
    phase: "POST_CULTURE",
    severity: "CRITICAL"
  },
  {
    event_id: "TL005",
    event_datetime: "2024-01-20T10:00:00",
    event_type: "LINE_REMOVAL",
    description: "Central line removed due to suspected infection",
    phase: "POST_CULTURE",
    severity: "INFO"
  }
]

const samplePhaseConfig: PhaseConfig[] = [
  { phase_id: "PRE_LINE", label: "Pre-Line Placement", color: "#f0f4f8" },
  { phase_id: "LINE_PLACEMENT", label: "Line Placement", color: "#dbeafe" },
  { phase_id: "MONITORING", label: "Monitoring Period", color: "#fef3c7" },
  { phase_id: "CULTURE", label: "Culture Collection", color: "#fed7aa" },
  { phase_id: "POST_CULTURE", label: "Post-Culture", color: "#fecaca" }
]

export default function TimelinePage() {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Clinical Timeline Visualization</h1>
          <p className="text-lg text-muted-foreground">
            Interactive timeline for clinical infection surveillance and event tracking
          </p>
        </div>

        <EnhancedTimeline
          timeline={sampleTimeline}
          phaseConfig={samplePhaseConfig}
          selectedEventId={selectedEventId}
          onEventClick={(event) => {
            setSelectedEventId(event.event_id === selectedEventId ? undefined : event.event_id)
          }}
        />
      </div>
    </main>
  )
}
