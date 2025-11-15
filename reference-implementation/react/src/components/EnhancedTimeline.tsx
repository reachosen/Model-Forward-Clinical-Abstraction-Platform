/**
 * Enhanced Timeline Component
 * Interactive horizontal timeline with phase swimlanes
 * Adapted from Vercel v0.dev generation
 */

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Activity, AlertTriangle, AlertCircle, Calendar, Clock, Filter, ChevronDown } from 'lucide-react';
import { TimelineEvent } from '../types';
import './EnhancedTimeline.css';

interface PhaseConfig {
  phase_id: string;
  label: string;
  color: string;
}

interface EnhancedTimelineProps {
  timeline: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  selectedEventId?: string;
  phaseConfig?: PhaseConfig[];
}

const defaultPhaseConfig: PhaseConfig[] = [
  { phase_id: "PRE_LINE", label: "Pre-Line Placement", color: "#f0f4f8" },
  { phase_id: "LINE_PLACEMENT", label: "Line Placement", color: "#dbeafe" },
  { phase_id: "MONITORING", label: "Monitoring Period", color: "#fef3c7" },
  { phase_id: "CULTURE", label: "Culture Collection", color: "#fed7aa" },
  { phase_id: "POST_CULTURE", label: "Post-Culture", color: "#fecaca" }
];

const severityConfig = {
  INFO: { color: '#3b82f6', icon: Activity, label: 'Info' },
  WARNING: { color: '#f59e0b', icon: AlertTriangle, label: 'Warning' },
  CRITICAL: { color: '#ef4444', icon: AlertCircle, label: 'Critical' }
};

const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({
  timeline,
  onEventClick,
  selectedEventId,
  phaseConfig = defaultPhaseConfig
}) => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [visiblePhases, setVisiblePhases] = useState<Set<string>>(
    new Set(phaseConfig.map(p => p.phase_id))
  );
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Calculate timeline bounds
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (timeline.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 0 };
    }

    const dates = timeline.map(e => parseISO(e.event_datetime));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const days = differenceInDays(max, min);

    return { minDate: min, maxDate: max, totalDays: days };
  }, [timeline]);

  // Calculate position for each event (0-100%)
  const getEventPosition = (eventDate: string): number => {
    if (totalDays === 0) return 50;
    const date = parseISO(eventDate);
    const daysSinceStart = differenceInDays(date, minDate);
    return (daysSinceStart / totalDays) * 100;
  };

  // Group events by phase
  const eventsByPhase = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    phaseConfig.forEach(phase => {
      grouped[phase.phase_id] = timeline.filter(e => e.phase === phase.phase_id);
    });
    return grouped;
  }, [timeline, phaseConfig]);

  const togglePhase = (phaseId: string) => {
    setVisiblePhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const showAll = () => {
    setVisiblePhases(new Set(phaseConfig.map(p => p.phase_id)));
  };

  const hideAll = () => {
    setVisiblePhases(new Set());
  };

  if (timeline.length === 0) {
    return (
      <div className="enhanced-timeline-container">
        <div className="timeline-header">
          <h2>Enhanced Timeline</h2>
        </div>
        <div className="timeline-empty">
          <Calendar size={48} />
          <p>No timeline events available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-timeline-container">
      {/* Header with Filter */}
      <div className="timeline-header">
        <div>
          <h2>Enhanced Timeline</h2>
          <p className="timeline-subtitle">
            {timeline.length} events across {totalDays + 1} days
          </p>
        </div>

        <div className="filter-dropdown-container">
          <button
            className="filter-button"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Filter size={16} />
            Filter Phases
            <ChevronDown size={16} />
          </button>

          {showFilterDropdown && (
            <div className="filter-dropdown">
              <div className="filter-dropdown-header">Phase Visibility</div>
              <div className="filter-actions">
                <button onClick={showAll}>Show All</button>
                <button onClick={hideAll}>Hide All</button>
              </div>
              <div className="filter-divider" />
              {phaseConfig.map((phase) => (
                <label key={phase.phase_id} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={visiblePhases.has(phase.phase_id)}
                    onChange={() => togglePhase(phase.phase_id)}
                  />
                  <span>{phase.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {visiblePhases.size < phaseConfig.length && visiblePhases.size > 0 && (
        <div className="filter-chips">
          {Array.from(visiblePhases).map(phaseId => {
            const phase = phaseConfig.find(p => p.phase_id === phaseId);
            return phase ? (
              <span key={phaseId} className="filter-chip">
                {phase.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Desktop Horizontal Timeline */}
      <div className="timeline-desktop">
        {phaseConfig.map((phase) => {
          const isVisible = visiblePhases.has(phase.phase_id);
          const phaseEvents = eventsByPhase[phase.phase_id] || [];

          if (!isVisible) return null;

          return (
            <div
              key={phase.phase_id}
              className="phase-swimlane"
              style={{ backgroundColor: phase.color }}
            >
              {/* Phase Label */}
              <div className="phase-label">
                <h3>{phase.label}</h3>
              </div>

              {/* Timeline Track */}
              <div className="timeline-track">
                {/* Horizontal line */}
                <div className="timeline-line" />

                {/* Event Markers */}
                {phaseEvents.map((event) => {
                  const position = getEventPosition(event.event_datetime);
                  const SeverityIcon = severityConfig[event.severity].icon;
                  const isHovered = hoveredEventId === event.event_id;
                  const isSelected = selectedEventId === event.event_id;

                  return (
                    <div
                      key={event.event_id}
                      className="event-marker-container"
                      style={{ left: `${position}%` }}
                    >
                      {/* Event Marker */}
                      <button
                        className={`event-marker ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                        style={{ backgroundColor: severityConfig[event.severity].color }}
                        onClick={() => onEventClick?.(event)}
                        onMouseEnter={() => setHoveredEventId(event.event_id)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        aria-label={`${event.event_type} - ${event.description}`}
                      >
                        <SeverityIcon size={16} color="white" />
                      </button>

                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="event-tooltip">
                          <div className="tooltip-title">
                            {event.event_type.replace(/_/g, ' ')}
                          </div>
                          <div className="tooltip-description">
                            {event.description}
                          </div>
                          <div className="tooltip-timestamp">
                            <Clock size={12} />
                            {format(parseISO(event.event_datetime), 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Date Axis */}
        <div className="timeline-axis">
          <div className="axis-label">
            <div className="axis-date">{format(minDate, 'MMM d')}</div>
            <div className="axis-day">(Day 0)</div>
          </div>
          {totalDays > 2 && (
            <div className="axis-label">
              <div className="axis-date">
                {format(new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) / 2), 'MMM d')}
              </div>
              <div className="axis-day">(Day {Math.floor(totalDays / 2)})</div>
            </div>
          )}
          <div className="axis-label">
            <div className="axis-date">{format(maxDate, 'MMM d')}</div>
            <div className="axis-day">(Day {totalDays})</div>
          </div>
        </div>
      </div>

      {/* Mobile Vertical Timeline */}
      <div className="timeline-mobile">
        {timeline
          .filter(event => visiblePhases.has(event.phase))
          .sort((a, b) => parseISO(a.event_datetime).getTime() - parseISO(b.event_datetime).getTime())
          .map((event) => {
            const phase = phaseConfig.find(p => p.phase_id === event.phase);
            const SeverityIcon = severityConfig[event.severity].icon;
            const isSelected = selectedEventId === event.event_id;

            return (
              <div
                key={event.event_id}
                className={`timeline-mobile-event ${isSelected ? 'selected' : ''}`}
                style={{ borderLeftColor: phase?.color }}
              >
                {/* Event Marker */}
                <div className="mobile-event-marker-container">
                  <button
                    className={`mobile-event-marker ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: severityConfig[event.severity].color }}
                    onClick={() => onEventClick?.(event)}
                  >
                    <SeverityIcon size={12} color="white" />
                  </button>
                </div>

                {/* Event Content */}
                <div className="mobile-event-content">
                  <div className="mobile-event-badges">
                    <span className="mobile-phase-badge">{phase?.label}</span>
                    <span
                      className="mobile-severity-badge"
                      style={{
                        backgroundColor: `${severityConfig[event.severity].color}20`,
                        color: severityConfig[event.severity].color,
                        borderColor: severityConfig[event.severity].color
                      }}
                    >
                      {severityConfig[event.severity].label}
                    </span>
                  </div>
                  <h4 className="mobile-event-title">
                    {event.event_type.replace(/_/g, ' ')}
                  </h4>
                  <p className="mobile-event-description">
                    {event.description}
                  </p>
                  <div className="mobile-event-timestamp">
                    <Clock size={12} />
                    {format(parseISO(event.event_datetime), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Selected Event Details */}
      {selectedEventId && (() => {
        const event = timeline.find(e => e.event_id === selectedEventId);
        if (!event) return null;

        const phase = phaseConfig.find(p => p.phase_id === event.phase);
        const SeverityIcon = severityConfig[event.severity].icon;

        return (
          <div className="event-details-card">
            <h3>Event Details</h3>
            <div className="event-details-content">
              <div className="event-details-header">
                <div
                  className="event-details-icon"
                  style={{ backgroundColor: severityConfig[event.severity].color }}
                >
                  <SeverityIcon size={24} color="white" />
                </div>
                <div className="event-details-info">
                  <h4>{event.event_type.replace(/_/g, ' ')}</h4>
                  <p>{event.description}</p>
                </div>
              </div>

              <div className="event-details-meta">
                <div className="meta-item">
                  <div className="meta-label">Phase</div>
                  <span className="meta-value-badge">{phase?.label}</span>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Severity</div>
                  <span
                    className="meta-severity-badge"
                    style={{
                      backgroundColor: `${severityConfig[event.severity].color}20`,
                      color: severityConfig[event.severity].color,
                      borderColor: severityConfig[event.severity].color
                    }}
                  >
                    {severityConfig[event.severity].label}
                  </span>
                </div>
                <div className="meta-item full-width">
                  <div className="meta-label">Timestamp</div>
                  <div className="meta-timestamp">
                    <Clock size={16} />
                    <span>{format(parseISO(event.event_datetime), 'MMMM d, yyyy • HH:mm')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EnhancedTimeline;
