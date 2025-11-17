/**
 * Timeline Panel Component
 * Displays clinical timeline with key events
 * Updated to support timeline_phases from enrichment section
 */

import React from 'react';
import { TimelineEvent, EnrichmentSection } from '../types';
import './TimelinePanel.css';

interface TimelinePanelProps {
  timeline?: TimelineEvent[];
  timelinePhases?: EnrichmentSection['timeline_phases']; // Optional: from enrichment section
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({ timeline, timelinePhases }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'WARNING':
        return '🟠';
      default:
        return '🔵';
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors: { [key: string]: string } = {
      'PRE_LINE': '#e3f2fd',
      'LINE_PLACEMENT': '#fff3e0',
      'MONITORING': '#f3e5f5',
      'CULTURE': '#ffebee',
      'POST_CULTURE': '#e8f5e9',
      'Device Placement': '#fff3e0',
      'Infection Window': '#f3e5f5',
      'Symptom Onset': '#f3e5f5',
      'Diagnostic Workup': '#ffebee',
      'Post-Culture': '#e8f5e9',
    };
    return colors[phase] || '#f5f5f5';
  };

  // Convert timeline_phases to timeline events for display if provided
  const displayTimeline: TimelineEvent[] = timelinePhases
    ? timelinePhases.map((phase) => ({
        event_id: `phase-${phase.phase_name}`,
        event_datetime: phase.start_date,
        event_type: phase.phase_name,
        description: phase.description || phase.events?.join(', ') || '',
        phase: phase.phase_name as any,
        severity: 'INFO' as const,
      }))
    : timeline || [];

  return (
    <div className="timeline-panel panel">
      <div className="panel-header">
        <h2>Clinical Timeline</h2>
        {timelinePhases && (
          <div className="timeline-meta">
            <span className="phases-count">{timelinePhases.length} phases</span>
          </div>
        )}
      </div>

      <div className="timeline-container">
        {displayTimeline.map((event, idx) => (
          <div
            key={event.event_id}
            className="timeline-event"
            style={{ borderLeftColor: getPhaseColor(event.phase) }}
          >
            <div className="event-header">
              <span className="event-icon">{getSeverityIcon(event.severity)}</span>
              <span className="event-time">{formatDate(event.event_datetime)}</span>
              <span className="event-phase">{event.phase}</span>
            </div>
            <div className="event-body">
              <div className="event-type">{event.event_type}</div>
              <div className="event-description">{event.description}</div>
            </div>
          </div>
        ))}
      </div>

      {displayTimeline.length === 0 && (
        <div className="no-data">No timeline events available</div>
      )}
    </div>
  );
};

export default TimelinePanel;
