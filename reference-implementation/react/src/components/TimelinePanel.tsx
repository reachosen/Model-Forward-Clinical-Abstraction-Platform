/**
 * Timeline Panel Component
 * Displays clinical timeline with key events
 */

import React from 'react';
import { TimelineEvent } from '../types';
import './TimelinePanel.css';

interface TimelinePanelProps {
  timeline: TimelineEvent[];
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({ timeline }) => {
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
    };
    return colors[phase] || '#f5f5f5';
  };

  return (
    <div className="timeline-panel panel">
      <h2>Clinical Timeline</h2>

      <div className="timeline-container">
        {timeline.map((event, idx) => (
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

      {timeline.length === 0 && (
        <div className="no-data">No timeline events available</div>
      )}
    </div>
  );
};

export default TimelinePanel;
