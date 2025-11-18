"use client";

import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TimelinePhase } from "@/types/case";

interface TimelinePanelProps {
  timelinePhases: TimelinePhase[];
}

export function TimelinePanel({ timelinePhases }: TimelinePanelProps) {
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const endDate = new Date(end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${startDate} - ${endDate}`;
  };

  const getPhaseColor = (significance: string) => {
    switch (significance.toLowerCase()) {
      case 'high':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'low':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      default:
        return 'border-l-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Timeline Phases</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {timelinePhases.map((phase, index) => (
            <div key={phase.phase_id}>
              <div className={`border-l-4 rounded-r-lg p-4 ${getPhaseColor(phase.significance)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{phase.phase_name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateRange(phase.start_date, phase.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">
                      {phase.events_in_phase} events
                    </Badge>
                    <Badge
                      variant={
                        phase.significance === 'high'
                          ? 'destructive'
                          : phase.significance === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {phase.significance}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {index < timelinePhases.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
