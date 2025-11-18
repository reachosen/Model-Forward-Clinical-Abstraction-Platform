/**
 * TimelinePanel - Latest from Vercel (Nov 18 00:07)
 * Timeline phases with significance levels and date ranges
 */

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { EnrichmentTimelinePhase } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import './TimelinePanel_New.css';

interface TimelinePanelProps {
  timelinePhases: EnrichmentTimelinePhase[];
}

export function TimelinePanelNew({ timelinePhases }: TimelinePanelProps) {
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

  const getPhaseColorClass = (significance: string) => {
    switch (significance.toLowerCase()) {
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

  const getSignificanceBadgeVariant = (significance: string): 'destructive' | 'default' | 'secondary' => {
    switch (significance.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="timeline-panel-card">
      <div className="timeline-header">
        <div className="timeline-title-row">
          <Calendar className="timeline-icon" />
          <h3 className="timeline-title">Timeline Phases</h3>
        </div>
      </div>

      <div className="timeline-content">
        <div className="timeline-phases-list">
          {timelinePhases.map((phase, index) => (
            <div key={phase.phase_id || index}>
              <div className={`timeline-phase ${getPhaseColorClass(phase.significance || 'low')}`}>
                <div className="phase-header">
                  <div className="phase-info">
                    <h4 className="phase-name">{phase.phase_name}</h4>
                    <div className="phase-date-row">
                      <Clock className="clock-icon" />
                      <span>{formatDateRange(phase.start_date, phase.end_date)}</span>
                    </div>
                  </div>
                  <div className="phase-badges">
                    <Badge variant="outline">
                      {phase.events_in_phase} events
                    </Badge>
                    <Badge variant={getSignificanceBadgeVariant(phase.significance || 'low')}>
                      {phase.significance || 'low'}
                    </Badge>
                  </div>
                </div>
              </div>

              {index < timelinePhases.length - 1 && (
                <div className="phase-separator" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
