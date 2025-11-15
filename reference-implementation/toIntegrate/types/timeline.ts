export interface TimelineEvent {
  event_id: string;
  event_datetime: string; // ISO 8601 format: "2024-01-15T14:00:00"
  event_type: string; // e.g., "LINE_INSERTION", "CULTURE_DRAWN", "ANTIBIOTIC_STARTED"
  description: string;
  phase: 'PRE_LINE' | 'LINE_PLACEMENT' | 'MONITORING' | 'CULTURE' | 'POST_CULTURE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface PhaseConfig {
  phase_id: string;
  label: string;
  color: string; // Background color for swimlane
}

export interface EnhancedTimelineProps {
  timeline: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  selectedEventId?: string;
  phaseConfig?: PhaseConfig[];
}
