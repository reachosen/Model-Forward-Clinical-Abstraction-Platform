# Enhanced Case Card Component Specification

## Component Purpose
A visually rich case card component for the case list page that displays key clinical information at a glance, including risk indicators, status badges, quick metrics, and visual hierarchy to help abstractors prioritize their workflow.

## Component Name
`EnhancedCaseCard`

## TypeScript Interfaces

```typescript
interface EnhancedCaseCardProps {
  caseInfo: CaseCardInfo;
  onClick: (patientId: string) => void;
  isSelected?: boolean;
}

interface CaseCardInfo {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  name: string;
  scenario: string;

  // Risk & Status
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number; // 0-100
  status: 'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'FLAGGED';

  // Quick Metrics
  days_since_admission?: number;
  line_days?: number;
  culture_status?: 'NONE' | 'PENDING' | 'POSITIVE' | 'NEGATIVE';

  // Timestamps
  abstraction_datetime?: string; // ISO format
  last_updated?: string; // ISO format

  // Domain
  domain?: string; // e.g., "CLABSI", "CAUTI", "SSI"
}

// Risk level configuration
interface RiskLevelConfig {
  label: string;
  color: string; // hex color
  backgroundColor: string; // lighter version for badges
  borderColor: string;
}

const riskLevelConfig: Record<string, RiskLevelConfig> = {
  CRITICAL: {
    label: 'Critical',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444'
  },
  HIGH: {
    label: 'High',
    color: '#ea580c',
    backgroundColor: '#ffedd5',
    borderColor: '#f97316'
  },
  MODERATE: {
    label: 'Moderate',
    color: '#d97706',
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  LOW: {
    label: 'Low',
    color: '#059669',
    backgroundColor: '#d1fae5',
    borderColor: '#10b981'
  }
};
```

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────┐ │
│ │ [CRITICAL BADGE]         [PENDING STATUS BADGE] │ │ ← Top Badges Row
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ John Doe                           MRN100001    │ │ ← Header
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Encounter: ENC001                               │ │
│ │ Scenario: Clear Positive CLABSI                 │ │ ← Basic Info
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [📅 5 days]  [🔌 3 line days]  [🧪 POSITIVE]   │ │ ← Quick Metrics
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 85/100 │ │ ← Risk Score Bar
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Abstracted: Jan 15, 2025 10:30 AM               │ │ ← Footer
│ │                            [Review Case →]      │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Key Features

### 1. Risk Level Indicator
- **Color-coded left border** (thick 4px border in risk color)
- **Risk badge** in top-left with icon and label
- **Risk score bar** at bottom showing 0-100 score with color gradient
- **Color scheme**:
  - Critical: Red (#dc2626)
  - High: Orange (#ea580c)
  - Moderate: Yellow (#d97706)
  - Low: Green (#059669)

### 2. Status Badge
- **Top-right badge** showing review status
- **Status options**:
  - PENDING: Gray with clock icon
  - IN_REVIEW: Blue with eye icon
  - REVIEWED: Green with checkmark icon
  - FLAGGED: Red with flag icon

### 3. Quick Metrics Row
- **Icon-based metrics** for at-a-glance information:
  - 📅 Days since admission
  - 🔌 Line days (central line duration)
  - 🧪 Culture status (NONE, PENDING, POSITIVE, NEGATIVE)
- **Color-coded culture status**:
  - POSITIVE: Red background
  - PENDING: Yellow background
  - NEGATIVE: Green background
  - NONE: Gray background

### 4. Visual Hierarchy
- **Prominent patient name** (larger font, bold)
- **MRN right-aligned** for easy scanning
- **Scenario text** with subtle styling
- **Abstraction timestamp** in footer (small, gray text)

### 5. Interactive States
- **Hover effect**: Slight elevation (shadow increase), scale transform
- **Click interaction**: Full card is clickable, calls onClick handler
- **Selected state**: Blue border overlay when isSelected=true
- **Smooth transitions** on all interactive states

## Detailed Specifications

### Risk Score Bar
```typescript
// Visual representation of risk_score (0-100)
// Progressive color gradient based on risk level
// Example: 85/100 score with CRITICAL risk level
<div className="risk-score-container">
  <div
    className="risk-score-bar"
    style={{
      width: `${riskScore}%`,
      backgroundColor: riskLevelConfig[riskLevel].color
    }}
  />
  <span className="risk-score-text">{riskScore}/100</span>
</div>
```

### Culture Status Badge
```typescript
// Color-coded pill badge
const cultureStatusConfig = {
  POSITIVE: { label: 'Positive', color: '#dc2626', bg: '#fee2e2' },
  PENDING: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  NEGATIVE: { label: 'Negative', color: '#059669', bg: '#d1fae5' },
  NONE: { label: 'No Culture', color: '#6b7280', bg: '#f3f4f6' }
};
```

### Metric Icons
```typescript
// Icon + value display
interface MetricDisplay {
  icon: string;
  value: string | number;
  label: string;
  tooltip?: string;
}

const metrics: MetricDisplay[] = [
  {
    icon: '📅',
    value: daysSinceAdmission,
    label: 'Days',
    tooltip: 'Days since admission'
  },
  {
    icon: '🔌',
    value: lineDays,
    label: 'Line Days',
    tooltip: 'Days with central line'
  },
  {
    icon: '🧪',
    value: cultureStatus,
    label: 'Culture',
    tooltip: 'Blood culture status'
  }
];
```

## Sample Data

```typescript
const sampleCases: CaseCardInfo[] = [
  {
    patient_id: 'PAT001',
    encounter_id: 'ENC001',
    episode_id: 'EP001',
    mrn: 'MRN100001',
    name: 'John Doe',
    scenario: 'Clear Positive CLABSI',
    risk_level: 'CRITICAL',
    risk_score: 95,
    status: 'PENDING',
    days_since_admission: 5,
    line_days: 3,
    culture_status: 'POSITIVE',
    abstraction_datetime: '2025-01-15T10:30:00Z',
    last_updated: '2025-01-15T14:22:00Z',
    domain: 'CLABSI'
  },
  {
    patient_id: 'PAT002',
    encounter_id: 'ENC002',
    episode_id: 'EP002',
    mrn: 'MRN100002',
    name: 'Jane Smith',
    scenario: 'Clear Negative',
    risk_level: 'LOW',
    risk_score: 15,
    status: 'REVIEWED',
    days_since_admission: 3,
    line_days: 2,
    culture_status: 'NEGATIVE',
    abstraction_datetime: '2025-01-14T08:15:00Z',
    last_updated: '2025-01-14T16:45:00Z',
    domain: 'CLABSI'
  },
  {
    patient_id: 'PAT003',
    encounter_id: 'ENC003',
    episode_id: 'EP003',
    mrn: 'MRN100003',
    name: 'Robert Johnson',
    scenario: 'Borderline Case',
    risk_level: 'MODERATE',
    risk_score: 62,
    status: 'FLAGGED',
    days_since_admission: 7,
    line_days: 5,
    culture_status: 'PENDING',
    abstraction_datetime: '2025-01-15T11:00:00Z',
    last_updated: '2025-01-15T13:30:00Z',
    domain: 'CLABSI'
  }
];
```

## Styling Guidelines

### Card Container
- **Background**: White (#ffffff)
- **Border radius**: 8px
- **Shadow**: 0 2px 4px rgba(0,0,0,0.1)
- **Padding**: 1.25rem
- **Left border**: 4px solid (risk color)
- **Transition**: all 0.2s ease

### Hover State
- **Shadow**: 0 4px 12px rgba(0,0,0,0.15)
- **Transform**: translateY(-2px)
- **Cursor**: pointer

### Selected State
- **Border**: 2px solid #3b82f6 (blue)
- **Shadow**: 0 0 0 4px rgba(59, 130, 246, 0.2)

### Risk Badge
- **Display**: inline-flex
- **Padding**: 0.375rem 0.75rem
- **Border radius**: 16px (pill shape)
- **Font size**: 0.75rem
- **Font weight**: 600
- **Background**: Risk-specific light color
- **Color**: Risk-specific dark color
- **Border**: 1px solid risk-specific border color

### Status Badge
- **Same styling as risk badge** but with status-specific colors
- **Icon + text** layout

### Quick Metrics
- **Display**: flex
- **Gap**: 0.75rem
- **Each metric**:
  - Icon (1.25rem)
  - Value (0.875rem, font-weight: 500)
  - Label (0.75rem, color: #6b7280)

### Risk Score Bar
- **Container**:
  - Height: 8px
  - Background: #f3f4f6
  - Border radius: 4px
  - Overflow: hidden
- **Bar**:
  - Height: 100%
  - Background: Risk color
  - Transition: width 0.3s ease
- **Score text**:
  - Position: absolute right
  - Font size: 0.75rem
  - Color: #6b7280
  - Font weight: 600

### Footer
- **Flex layout**: space-between
- **Font size**: 0.75rem
- **Color**: #9ca3af
- **Review button**:
  - Background: transparent
  - Color: #3b82f6
  - Font weight: 500
  - Hover: underline

## Responsive Behavior

### Desktop (>768px)
- Full card layout as shown
- All metrics visible
- Two-column or three-column grid in parent

### Tablet (768px - 1024px)
- Slightly reduced padding
- Two-column grid in parent
- All features remain visible

### Mobile (<768px)
- Single column layout in parent
- Stack badges vertically if needed
- Reduce padding to 1rem
- Smaller font sizes for metrics
- Risk score bar remains prominent

## Accessibility

- **Semantic HTML**: Use `<article>` for card container
- **ARIA labels**:
  - `aria-label="Case card for {patient_name}, risk level {risk_level}"`
  - `role="button"` on clickable card
- **Keyboard navigation**:
  - Tab-focusable
  - Enter/Space to click
- **Focus indicator**: Visible outline on focus
- **Color contrast**: Ensure all text meets WCAG AA standards
- **Screen reader**: Announce risk level and status

## Component Usage Example

```tsx
import EnhancedCaseCard from './components/EnhancedCaseCard';

function CaseListPage() {
  const handleCaseClick = (patientId: string) => {
    navigate(`/case/${patientId}`);
  };

  return (
    <div className="cases-grid">
      {cases.map((caseInfo) => (
        <EnhancedCaseCard
          key={caseInfo.patient_id}
          caseInfo={caseInfo}
          onClick={handleCaseClick}
          isSelected={selectedCaseId === caseInfo.patient_id}
        />
      ))}
    </div>
  );
}
```

## Design Notes

1. **Visual Priority**: Risk level is the most prominent visual element (border + badge + score bar)
2. **Scanability**: MRN and patient name are easy to scan across multiple cards
3. **Action-Oriented**: Quick metrics help abstractors decide which cases need immediate attention
4. **Status Clarity**: Review status helps track workflow progress
5. **Consistent Colors**: Use same color scheme across entire application for risk levels
6. **Performance**: Avoid expensive animations; use CSS transforms for smooth interactions

## Variants (Optional)

### Compact Mode
- Remove abstraction timestamp
- Show only top 2 metrics
- Reduce padding to 0.75rem

### Expanded Mode
- Show additional fields (admission date, attending physician)
- Display mini trend chart for risk score over time
- Show abstractor name who reviewed the case

## Implementation Priority
**HIGH** - This component significantly improves the user experience and workflow efficiency for the case list page.
