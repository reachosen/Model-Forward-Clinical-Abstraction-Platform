# Vercel v0.dev Spec: Enhanced Timeline Visualization

## Component Overview

**Component Name:** `EnhancedTimeline`

**Purpose:** Interactive horizontal timeline visualization for clinical infection surveillance that displays events across clinical phases, shows visual connections to related signals, and enables filtering and highlighting of relevant events.

**Critical for:** Understanding the temporal sequence of clinical events, identifying infection patterns, and correlating timeline events with clinical signals.

---

## Component Behavior

### Primary Features

1. **Horizontal Timeline with Phase Swimlanes**
   - Display events along a horizontal time axis
   - Group events into phase-based swimlanes (e.g., PRE_LINE, LINE_PLACEMENT, MONITORING, CULTURE, POST_CULTURE)
   - Each phase has distinct background color for visual separation

2. **Event Markers**
   - Visual markers for each event positioned on timeline
   - Color-coded by severity (INFO: blue, WARNING: amber, CRITICAL: red)
   - Event type icon displayed on marker
   - Hover shows event details tooltip

3. **Interactive Features**
   - Click event to see full details in expanded card
   - Hover over event to highlight related signals
   - Filter by phase (toggle phase visibility)
   - Zoom in/out on timeline (optional)
   - Responsive: vertical layout on mobile

4. **Visual Connections** (Advanced - if feasible)
   - Show dotted lines connecting timeline events to related signals
   - Highlight both event and signal when hovering either one

---

## Data Structure

### Input Props

```typescript
interface TimelineEvent {
  event_id: string;
  event_datetime: string; // ISO 8601 format: "2024-01-15T14:00:00"
  event_type: string; // e.g., "LINE_INSERTION", "CULTURE_DRAWN", "ANTIBIOTIC_STARTED"
  description: string;
  phase: 'PRE_LINE' | 'LINE_PLACEMENT' | 'MONITORING' | 'CULTURE' | 'POST_CULTURE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface EnhancedTimelineProps {
  timeline: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  selectedEventId?: string;
  phaseConfig?: {
    phase_id: string;
    label: string;
    color: string; // Background color for swimlane
  }[];
}
```

### Sample Data

```typescript
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
];

const samplePhaseConfig = [
  { phase_id: "PRE_LINE", label: "Pre-Line Placement", color: "#f0f4f8" },
  { phase_id: "LINE_PLACEMENT", label: "Line Placement", color: "#dbeafe" },
  { phase_id: "MONITORING", label: "Monitoring Period", color: "#fef3c7" },
  { phase_id: "CULTURE", label: "Culture Collection", color: "#fed7aa" },
  { phase_id: "POST_CULTURE", label: "Post-Culture", color: "#fecaca" }
];
```

---

## Visual Design Requirements

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Enhanced Timeline                                    [Filter]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌── PRE_LINE ──────────────────────────────────────────────┐  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── LINE_PLACEMENT ────────────────────────────────────────┐  │
│  │             ⦿ LINE_INSERTION (Day 0)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── MONITORING ────────────────────────────────────────────┐  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── CULTURE ───────────────────────────────────────────────┐  │
│  │                                  ⚠ CULTURE_DRAWN (Day 5)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── POST_CULTURE ──────────────────────────────────────────┐  │
│  │                    🔴 CULTURE_POSITIVE (Day 6)           │  │
│  │                                       ⦿ LINE_REMOVAL     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  └─────────────────────────────────────────────────────────────┘
│  Jan 10          Jan 13          Jan 16          Jan 19        │
│  (Day 0)         (Day 3)         (Day 6)         (Day 9)       │
└─────────────────────────────────────────────────────────────────┘
```

### Styling Guidelines

**Event Markers:**
- Size: 32px × 32px circle
- Severity colors:
  - INFO: `#3b82f6` (blue-500)
  - WARNING: `#f59e0b` (amber-500)
  - CRITICAL: `#ef4444` (red-500)
- Border: 3px solid white
- Shadow: `0 2px 8px rgba(0,0,0,0.15)`
- Hover: Scale to 1.15x, increase shadow

**Phase Swimlanes:**
- Height: 80px per lane
- Padding: 16px vertical, 24px horizontal
- Border: 1px solid `#e5e7eb`
- Border radius: 6px
- Background: From phaseConfig or defaults

**Timeline Axis:**
- Line: 2px solid `#d1d5db`
- Date labels: 12px, `#6b7280`, positioned below axis
- Tick marks: 1px vertical lines at date intervals

**Event Tooltip (Hover):**
- Background: `#1f2937` (dark gray)
- Text color: `#ffffff`
- Padding: 12px 16px
- Border radius: 6px
- Shadow: `0 4px 12px rgba(0,0,0,0.25)`
- Max width: 320px
- Contents:
  - Event type (bold, 14px)
  - Description (regular, 13px)
  - Timestamp (small, 12px, muted)

**Filter Panel:**
- Position: Top right corner
- Dropdown with checkboxes for each phase
- "Show All" / "Hide All" quick actions
- Active filters shown as chips

---

## Responsive Behavior

### Desktop (≥1024px)
- Horizontal timeline with phase swimlanes
- Full event details on hover
- Side-by-side phase lanes

### Tablet (768px - 1023px)
- Horizontal timeline with compressed swimlanes
- Reduced padding and marker sizes
- Abbreviated date labels

### Mobile (<768px)
- **Switch to vertical timeline layout**
- Events stacked vertically by chronological order
- Phase indicated by colored left border
- Tap to expand event details
- Sticky date headers

---

## Interaction States

### Default State
- All phases visible
- Events positioned chronologically
- Timeline spans from earliest to latest event
- No event selected

### Hover State (Desktop)
- Hovered event marker scales up (1.15x)
- Tooltip appears above/below marker
- Related signals highlighted (if integration exists)

### Active/Selected State
- Selected event has thicker border (5px)
- Event details expanded below timeline
- Background highlight on parent swimlane

### Filtered State
- Hidden phases have 0 height (collapse animation)
- Remaining phases expand to fill space
- Filter chips show active filters

---

## Accessibility

- **Keyboard Navigation:**
  - Tab through event markers
  - Enter/Space to select event
  - Arrow keys to navigate between events

- **Screen Reader:**
  - Semantic HTML (`<article>`, `<section>`, `<time>`)
  - ARIA labels for event markers
  - ARIA-live region announces event selection

- **Color Contrast:**
  - All text meets WCAG AA standards (4.5:1 minimum)
  - Don't rely solely on color for severity (use icons too)

---

## Performance Considerations

- Virtualize events if timeline has >50 events
- Lazy load tooltip content
- Use CSS transforms for animations (GPU acceleration)
- Debounce hover events (150ms)

---

## Integration Notes

### File Location
`reference-implementation/react/src/components/EnhancedTimeline.tsx`
`reference-implementation/react/src/components/EnhancedTimeline.css`

### Usage in CaseViewPage

```typescript
import EnhancedTimeline from '../components/EnhancedTimeline';

<EnhancedTimeline
  timeline={caseData.timeline}
  phaseConfig={domainConfig.timeline_phases}
  onEventClick={(event) => console.log('Event clicked:', event)}
/>
```

### TypeScript Interface Import
```typescript
import { TimelineEvent } from '../types';
```

---

## Example Implementation Notes

**Do:**
- Use `date-fns` for date parsing and formatting
- Implement smooth transitions between states (200-300ms)
- Calculate timeline scale dynamically based on date range
- Use flexbox for swimlane layout

**Don't:**
- Hardcode phase colors or labels (use props)
- Assume fixed number of phases
- Block main thread with heavy calculations
- Forget empty state (no events)

---

## Edge Cases to Handle

1. **No Events:** Show empty state with message
2. **Single Event:** Show timeline with single marker
3. **Same Timestamp:** Stack events vertically at same position
4. **Missing Phase:** Create "UNKNOWN" phase at bottom
5. **Invalid Date:** Show error toast, skip event
6. **Very Long Timeline (>30 days):** Add zoom controls or pagination

---

## Testing Scenarios

1. Render timeline with 5 events across 3 phases
2. Click event marker → verify onEventClick called
3. Filter to single phase → verify other phases hidden
4. Hover event → verify tooltip displays
5. Resize to mobile → verify vertical layout
6. Test with no events → verify empty state
7. Test with 100 events → verify performance (should render <100ms)

---

## Future Enhancements (Not Required for v1)

- Drag to zoom date range
- Connect timeline events to signals with visual lines
- Export timeline as image
- Print-friendly view
- Real-time event updates (WebSocket)
