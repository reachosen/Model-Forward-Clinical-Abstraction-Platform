/**
 * Timeline Panel Component
 * Displays timeline phases with date ranges and significance
 * Adapted from Vercel UI for Create React App
 */

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Separator } from './ui/Separator';
import { cn } from '../lib/utils';
import './TimelinePanel.css';

export interface TimelinePhase {
  phase_id?: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  day_number?: number;
  events?: string[];
  events_in_phase?: number;
  description?: string;
  significance?: 'high' | 'medium' | 'low';
}

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

  const getPhaseColorClass = (significance?: string) => {
    switch (significance?.toLowerCase()) {
      case 'high':
        return 'phase-high';
      case 'medium':
        return 'phase-medium';
      case 'low':
        return 'phase-low';
      default:
        return 'phase-default';
    }
  };

  const getBadgeVariant = (significance?: string): 'default' | 'destructive' | 'secondary' => {
    switch (significance?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="timeline-panel">
      <CardHeader>
        <div className="timeline-panel-header">
          <Calendar size={20} className="timeline-icon" />
          <CardTitle>Timeline Phases</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="timeline-phases">
          {timelinePhases.map((phase, index) => (
            <div key={phase.phase_id || index}>
              <div className={cn('timeline-phase', getPhaseColorClass(phase.significance))}>
                <div className="timeline-phase-header">
                  <div className="timeline-phase-info">
                    <h4 className="timeline-phase-name">{phase.phase_name}</h4>
                    <div className="timeline-phase-date">
                      <Clock size={12} />
                      <span>{formatDateRange(phase.start_date, phase.end_date)}</span>
                    </div>
                  </div>
                  <div className="timeline-phase-badges">
                    {phase.events_in_phase !== undefined && (
                      <Badge variant="outline">
                        {phase.events_in_phase} events
                      </Badge>
                    )}
                    {phase.significance && (
                      <Badge variant={getBadgeVariant(phase.significance)}>
                        {phase.significance}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {index < timelinePhases.length - 1 && (
                <Separator className="timeline-separator" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
