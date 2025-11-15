'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Activity, AlertTriangle, AlertCircle, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimelineEvent, PhaseConfig, EnhancedTimelineProps } from '@/types/timeline'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'

const defaultPhaseConfig: PhaseConfig[] = [
  { phase_id: "PRE_LINE", label: "Pre-Line Placement", color: "#f0f4f8" },
  { phase_id: "LINE_PLACEMENT", label: "Line Placement", color: "#dbeafe" },
  { phase_id: "MONITORING", label: "Monitoring Period", color: "#fef3c7" },
  { phase_id: "CULTURE", label: "Culture Collection", color: "#fed7aa" },
  { phase_id: "POST_CULTURE", label: "Post-Culture", color: "#fecaca" }
]

const severityConfig = {
  INFO: { color: '#3b82f6', icon: Activity, label: 'Info' },
  WARNING: { color: '#f59e0b', icon: AlertTriangle, label: 'Warning' },
  CRITICAL: { color: '#ef4444', icon: AlertCircle, label: 'Critical' }
}

export default function EnhancedTimeline({
  timeline,
  onEventClick,
  selectedEventId,
  phaseConfig = defaultPhaseConfig
}: EnhancedTimelineProps) {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [visiblePhases, setVisiblePhases] = useState<Set<string>>(
    new Set(phaseConfig.map(p => p.phase_id))
  )

  // Calculate timeline bounds
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (timeline.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 0 }
    }
    
    const dates = timeline.map(e => parseISO(e.event_datetime))
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    const days = differenceInDays(max, min)
    
    return { minDate: min, maxDate: max, totalDays: days }
  }, [timeline])

  // Calculate position for each event (0-100%)
  const getEventPosition = (eventDate: string): number => {
    if (totalDays === 0) return 50
    const date = parseISO(eventDate)
    const daysSinceStart = differenceInDays(date, minDate)
    return (daysSinceStart / totalDays) * 100
  }

  // Group events by phase
  const eventsByPhase = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {}
    phaseConfig.forEach(phase => {
      grouped[phase.phase_id] = timeline.filter(e => e.phase === phase.phase_id)
    })
    return grouped
  }, [timeline, phaseConfig])

  const togglePhase = (phaseId: string) => {
    setVisiblePhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const showAll = () => {
    setVisiblePhases(new Set(phaseConfig.map(p => p.phase_id)))
  }

  const hideAll = () => {
    setVisiblePhases(new Set())
  }

  if (timeline.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Enhanced Timeline</CardTitle>
          <CardDescription>No events to display</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No timeline events available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enhanced Timeline</h2>
          <p className="text-sm text-muted-foreground">
            {timeline.length} events across {totalDays + 1} days
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter Phases
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Phase Visibility</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex gap-2 px-2 py-1">
              <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={showAll}>
                Show All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={hideAll}>
                Hide All
              </Button>
            </div>
            <DropdownMenuSeparator />
            {phaseConfig.map((phase) => (
              <DropdownMenuCheckboxItem
                key={phase.phase_id}
                checked={visiblePhases.has(phase.phase_id)}
                onCheckedChange={() => togglePhase(phase.phase_id)}
              >
                {phase.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Chips */}
      {visiblePhases.size < phaseConfig.length && visiblePhases.size > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from(visiblePhases).map(phaseId => {
            const phase = phaseConfig.find(p => p.phase_id === phaseId)
            return phase ? (
              <Badge key={phaseId} variant="secondary">
                {phase.label}
              </Badge>
            ) : null
          })}
        </div>
      )}

      {/* Timeline Container */}
      <Card>
        <CardContent className="p-6">
          {/* Desktop Horizontal Timeline */}
          <div className="hidden lg:block space-y-4">
            {phaseConfig.map((phase) => {
              const isVisible = visiblePhases.has(phase.phase_id)
              const phaseEvents = eventsByPhase[phase.phase_id] || []
              
              if (!isVisible) return null

              return (
                <div
                  key={phase.phase_id}
                  className="relative rounded-lg border transition-all duration-300"
                  style={{ backgroundColor: phase.color }}
                >
                  {/* Phase Label */}
                  <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      {phase.label}
                    </h3>
                  </div>

                  {/* Timeline Track */}
                  <div className="relative h-20 px-6 pb-4">
                    {/* Horizontal line */}
                    <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-border" />
                    
                    {/* Event Markers */}
                    {phaseEvents.map((event) => {
                      const position = getEventPosition(event.event_datetime)
                      const SeverityIcon = severityConfig[event.severity].icon
                      const isHovered = hoveredEventId === event.event_id
                      const isSelected = selectedEventId === event.event_id
                      
                      return (
                        <div
                          key={event.event_id}
                          className="absolute top-1/2 -translate-y-1/2"
                          style={{ left: `${position}%` }}
                        >
                          {/* Event Marker */}
                          <button
                            className={cn(
                              "relative flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-md transition-all duration-200 hover:scale-115",
                              isSelected && "ring-4 ring-ring border-[5px]",
                              isHovered && "scale-115 shadow-lg"
                            )}
                            style={{ backgroundColor: severityConfig[event.severity].color }}
                            onClick={() => onEventClick?.(event)}
                            onMouseEnter={() => setHoveredEventId(event.event_id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                            aria-label={`${event.event_type} - ${event.description}`}
                          >
                            <SeverityIcon className="w-4 h-4 text-white" />
                          </button>

                          {/* Hover Tooltip */}
                          {isHovered && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                              <div className="bg-gray-900 text-white rounded-md shadow-lg p-3 max-w-xs">
                                <div className="text-sm font-bold mb-1">
                                  {event.event_type.replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs mb-2">
                                  {event.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(event.event_datetime), 'MMM d, yyyy HH:mm')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Date Axis */}
            <div className="relative px-6 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <div className="text-center">
                  <div className="font-medium">{format(minDate, 'MMM d')}</div>
                  <div className="text-[10px]">(Day 0)</div>
                </div>
                {totalDays > 2 && (
                  <div className="text-center">
                    <div className="font-medium">
                      {format(new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) / 2), 'MMM d')}
                    </div>
                    <div className="text-[10px]">(Day {Math.floor(totalDays / 2)})</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="font-medium">{format(maxDate, 'MMM d')}</div>
                  <div className="text-[10px]">(Day {totalDays})</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="lg:hidden space-y-4">
            {timeline
              .filter(event => visiblePhases.has(event.phase))
              .sort((a, b) => parseISO(a.event_datetime).getTime() - parseISO(b.event_datetime).getTime())
              .map((event, index) => {
                const phase = phaseConfig.find(p => p.phase_id === event.phase)
                const SeverityIcon = severityConfig[event.severity].icon
                const isSelected = selectedEventId === event.event_id

                return (
                  <div
                    key={event.event_id}
                    className={cn(
                      "relative pl-4 border-l-4 pb-4 last:pb-0",
                      isSelected && "border-l-ring"
                    )}
                    style={{ borderLeftColor: isSelected ? undefined : phase?.color }}
                  >
                    {/* Event Marker */}
                    <div className="absolute -left-[13px] top-0">
                      <button
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md",
                          isSelected && "ring-2 ring-ring"
                        )}
                        style={{ backgroundColor: severityConfig[event.severity].color }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <SeverityIcon className="w-3 h-3 text-white" />
                      </button>
                    </div>

                    {/* Event Content */}
                    <div className="ml-4">
                      <div className="flex items-start gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {phase?.label}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${severityConfig[event.severity].color}20`,
                            color: severityConfig[event.severity].color,
                            borderColor: severityConfig[event.severity].color
                          }}
                          className="text-[10px] border"
                        >
                          {severityConfig[event.severity].label}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">
                        {event.event_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(event.event_datetime), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Details */}
      {selectedEventId && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const event = timeline.find(e => e.event_id === selectedEventId)
              if (!event) return null
              
              const phase = phaseConfig.find(p => p.phase_id === event.phase)
              const SeverityIcon = severityConfig[event.severity].icon

              return (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-md"
                      style={{ backgroundColor: severityConfig[event.severity].color }}
                    >
                      <SeverityIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">
                        {event.event_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Phase</div>
                      <Badge variant="outline">{phase?.label}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Severity</div>
                      <Badge
                        style={{ 
                          backgroundColor: `${severityConfig[event.severity].color}20`,
                          color: severityConfig[event.severity].color,
                          borderColor: severityConfig[event.severity].color
                        }}
                        className="border"
                      >
                        {severityConfig[event.severity].label}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {format(parseISO(event.event_datetime), 'MMMM d, yyyy • HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
