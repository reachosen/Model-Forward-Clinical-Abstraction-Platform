# Rule Evaluation Visualizer Component Specification

## Component Purpose
A visual checklist component that displays NHSN criteria evaluation results with clear pass/fail indicators, evidence links, confidence scores, and expandable details for each criterion. This makes the abstraction logic transparent, auditable, and clinically actionable.

## Component Name
`RuleEvaluationVisualizer`

## TypeScript Interfaces

```typescript
interface RuleEvaluationVisualizerProps {
  ruleEvaluations: RuleEvaluations;
  onEvidenceClick?: (evidenceId: string) => void;
  onRuleExpand?: (ruleId: string) => void;
  showOnlyFailed?: boolean;
}

interface RuleEvaluations {
  [ruleId: string]: RuleEvaluation;
}

interface RuleEvaluation {
  rule_id: string;
  rule_name: string;
  rule_description: string;
  result: boolean; // true = passed, false = failed
  evidence: string; // Human-readable evidence summary
  evidence_refs: EvidenceReference[];
  confidence: number; // 0-1
  severity: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  category: 'DEVICE' | 'LAB' | 'TEMPORAL' | 'CLINICAL' | 'EXCLUSION';
  nhsn_reference?: string; // e.g., "NHSN 2024 Protocol Section 4.2"
  last_evaluated?: string; // ISO timestamp
}

interface EvidenceReference {
  evidence_id: string;
  evidence_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'DEVICE';
  timestamp?: string;
  summary: string;
  strength: number; // 0-1, how strongly this supports the rule
}

interface RuleSummary {
  total_rules: number;
  passed: number;
  failed: number;
  required_passed: number;
  required_failed: number;
  overall_status: 'PASS' | 'PARTIAL' | 'FAIL';
}
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ NHSN Criteria Evaluation                                    │ ← Header
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ 4/5 Required Criteria Met                             │ │ ← Summary
│ │ ━━━━━━━━━━━━━━━━━ 80%                                   │ │
│ │ Status: PARTIAL (Review Required)                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [All] [Required Only] [Failed Only]     🔍 Filter       │ │ ← Filters
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔌 Device Exposure Criteria                             │ │ ← Category
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ Central Line Present                              │ │ │
│ │ │   REQUIRED • Confidence: 95%                        │ │ │
│ │ │   Evidence: Central venous catheter documented...   │ │ │
│ │ │   [View Evidence (2) →]                             │ │ │ ← Collapsed Rule
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ Line Present >2 Days       [Expand ▼]            │ │ │
│ │ │   REQUIRED • Confidence: 98%                        │ │ │
│ │ │                                                     │ │ │
│ │ │   ┌───────────────────────────────────────────────┐ │ │ │
│ │ │   │ Evidence Summary:                             │ │ │ │
│ │ │   │ Line insertion: Jan 12, 2025 14:30           │ │ │ │
│ │ │   │ Culture collection: Jan 15, 2025 08:00       │ │ │ │
│ │ │   │ Duration: 3 days, 17.5 hours                 │ │ │ │ ← Expanded Rule
│ │ │   │                                               │ │ │ │
│ │ │   │ 📎 Evidence References:                       │ │ │ │
│ │ │   │ • Line Insertion Event (100% strength) →     │ │ │ │
│ │ │   │ • Blood Culture Collection (95% strength) →  │ │ │ │
│ │ │   │                                               │ │ │ │
│ │ │   │ 📋 NHSN Reference: Section 4.2.1             │ │ │ │
│ │ │   └───────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧪 Laboratory Criteria                                  │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ Positive Blood Culture                            │ │ │
│ │ │   REQUIRED • Confidence: 99%                        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ Recognized Pathogen                               │ │ │
│ │ │   REQUIRED • Confidence: 95%                        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ❌ Exclusion Criteria                                    │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✗ No Alternative Infection Source                   │ │ │
│ │ │   REQUIRED • Confidence: 72%                        │ │ │
│ │ │   Evidence: Possible pneumonia indicated by...      │ │ │
│ │ │   ⚠️ Low confidence - manual review recommended     │ │ │ ← Failed Rule
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Overall Summary Card
- **Progress bar** showing percentage of criteria met
- **Pass/Fail counts** (e.g., "4/5 Required Criteria Met")
- **Overall status badge**:
  - PASS: All required criteria met (green)
  - PARTIAL: Some required criteria failed (yellow)
  - FAIL: Multiple required criteria failed (red)
- **Visual progress indicator** with color coding

### 2. Category Grouping
- **Collapsible categories**:
  - 🔌 Device Exposure Criteria
  - 🧪 Laboratory Criteria
  - ⏱️ Temporal Criteria
  - 🏥 Clinical Criteria
  - ❌ Exclusion Criteria
- **Category summary**: Shows passed/failed count per category
- **Expand/collapse** all rules in category

### 3. Rule Cards
- **Visual pass/fail indicator**:
  - ✓ Green checkmark for passed
  - ✗ Red X for failed
  - ⚠️ Yellow warning for low confidence
- **Rule severity badge**:
  - REQUIRED: Red badge
  - RECOMMENDED: Yellow badge
  - OPTIONAL: Gray badge
- **Confidence score** with visual indicator
- **One-line evidence summary** when collapsed
- **Expand button** to show full details

### 4. Expanded Rule Details
- **Full evidence summary** (human-readable text)
- **Evidence references list** with:
  - Evidence type icon
  - Summary text
  - Strength indicator (0-100%)
  - Clickable link to view source
- **NHSN reference** (if applicable)
- **Last evaluated timestamp**
- **Calculation details** (for temporal rules, show dates/durations)

### 5. Evidence Strength Indicators
- **Visual strength bars** for each evidence reference:
  - 100%: Dark green, "Strong"
  - 75-99%: Green, "Moderate"
  - 50-74%: Yellow, "Weak"
  - <50%: Orange, "Very Weak"

### 6. Filter Options
- **View All**: Show all rules
- **Required Only**: Show only REQUIRED severity rules
- **Failed Only**: Show only failed rules
- **Search/Filter**: Text search by rule name

### 7. Confidence Warnings
- **Low confidence alert** (<75%) with warning icon
- **Recommendation to manual review**
- **Tooltip explaining** what affects confidence

## Detailed Specifications

### Rule Status Icons
```typescript
const getRuleStatusIcon = (rule: RuleEvaluation) => {
  if (rule.result) {
    return '✓'; // Passed
  }
  if (rule.confidence < 0.75) {
    return '⚠️'; // Failed with low confidence
  }
  return '✗'; // Failed
};

const getRuleStatusColor = (rule: RuleEvaluation) => {
  if (rule.result) {
    return '#059669'; // Green
  }
  if (rule.confidence < 0.75) {
    return '#f59e0b'; // Yellow/Orange
  }
  return '#dc2626'; // Red
};
```

### Severity Badge Styling
```typescript
const severityConfig = {
  REQUIRED: {
    label: 'Required',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444'
  },
  RECOMMENDED: {
    label: 'Recommended',
    color: '#d97706',
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  OPTIONAL: {
    label: 'Optional',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af'
  }
};
```

### Category Icons
```typescript
const categoryConfig = {
  DEVICE: { icon: '🔌', label: 'Device Exposure', color: '#3b82f6' },
  LAB: { icon: '🧪', label: 'Laboratory', color: '#8b5cf6' },
  TEMPORAL: { icon: '⏱️', label: 'Temporal', color: '#06b6d4' },
  CLINICAL: { icon: '🏥', label: 'Clinical', color: '#10b981' },
  EXCLUSION: { icon: '❌', label: 'Exclusion', color: '#ef4444' }
};
```

### Evidence Strength Display
```typescript
interface EvidenceStrengthProps {
  strength: number; // 0-1
}

const EvidenceStrength: React.FC<EvidenceStrengthProps> = ({ strength }) => {
  const percentage = (strength * 100).toFixed(0);

  const getStrengthConfig = (str: number) => {
    if (str >= 1.0) return { color: '#047857', label: 'Strong' };
    if (str >= 0.75) return { color: '#059669', label: 'Moderate' };
    if (str >= 0.5) return { color: '#d97706', label: 'Weak' };
    return { color: '#ea580c', label: 'Very Weak' };
  };

  const { color, label } = getStrengthConfig(strength);

  return (
    <div className="evidence-strength">
      <div className="strength-bar-container">
        <div
          className="strength-bar"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="strength-label" style={{ color }}>
        {percentage}% ({label})
      </span>
    </div>
  );
};
```

## Sample Data

```typescript
const sampleRuleEvaluations: RuleEvaluations = {
  has_central_line: {
    rule_id: 'has_central_line',
    rule_name: 'Central Line Present',
    rule_description: 'Patient must have a central venous catheter in place',
    result: true,
    evidence: 'Central venous catheter documented in procedure notes and device list. Subclavian triple-lumen catheter inserted on 2025-01-12.',
    evidence_refs: [
      {
        evidence_id: 'EVT_LINE_001',
        evidence_type: 'EVENT',
        timestamp: '2025-01-12T14:30:00Z',
        summary: 'Central line insertion procedure documented',
        strength: 1.0
      },
      {
        evidence_id: 'DEV_LIST_001',
        evidence_type: 'DEVICE',
        timestamp: '2025-01-15T00:00:00Z',
        summary: 'Central line listed in active devices',
        strength: 0.95
      }
    ],
    confidence: 0.98,
    severity: 'REQUIRED',
    category: 'DEVICE',
    nhsn_reference: 'NHSN 2024 CLABSI Protocol Section 4.1',
    last_evaluated: '2025-01-15T10:00:00Z'
  },
  line_present_gt_2days: {
    rule_id: 'line_present_gt_2days',
    rule_name: 'Line Present >2 Days',
    rule_description: 'Central line must be in place for more than 2 calendar days before culture collection',
    result: true,
    evidence: 'Line insertion: 2025-01-12 14:30. Culture collection: 2025-01-15 08:00. Duration: 3 days, 17.5 hours.',
    evidence_refs: [
      {
        evidence_id: 'EVT_LINE_001',
        evidence_type: 'EVENT',
        timestamp: '2025-01-12T14:30:00Z',
        summary: 'Line insertion timestamp',
        strength: 1.0
      },
      {
        evidence_id: 'LAB_BC_001',
        evidence_type: 'LAB',
        timestamp: '2025-01-15T08:00:00Z',
        summary: 'Blood culture collection timestamp',
        strength: 0.98
      }
    ],
    confidence: 0.99,
    severity: 'REQUIRED',
    category: 'TEMPORAL',
    nhsn_reference: 'NHSN 2024 CLABSI Protocol Section 4.2.1',
    last_evaluated: '2025-01-15T10:00:00Z'
  },
  positive_blood_culture: {
    rule_id: 'positive_blood_culture',
    rule_name: 'Positive Blood Culture',
    rule_description: 'At least one positive blood culture result',
    result: true,
    evidence: 'Blood culture positive for Staphylococcus aureus. Collection: 2025-01-15 08:00. Result reported: 2025-01-16 14:00.',
    evidence_refs: [
      {
        evidence_id: 'LAB_BC_001',
        evidence_type: 'LAB',
        timestamp: '2025-01-15T08:00:00Z',
        summary: 'Positive blood culture with S. aureus',
        strength: 1.0
      }
    ],
    confidence: 0.99,
    severity: 'REQUIRED',
    category: 'LAB',
    nhsn_reference: 'NHSN 2024 CLABSI Protocol Section 4.3',
    last_evaluated: '2025-01-15T10:00:00Z'
  },
  recognized_pathogen: {
    rule_id: 'recognized_pathogen',
    rule_name: 'Recognized Pathogen',
    rule_description: 'Pathogen must be on NHSN recognized pathogen list',
    result: true,
    evidence: 'Staphylococcus aureus is listed as a recognized pathogen per NHSN guidelines.',
    evidence_refs: [
      {
        evidence_id: 'LAB_BC_001',
        evidence_type: 'LAB',
        timestamp: '2025-01-15T08:00:00Z',
        summary: 'S. aureus identified',
        strength: 1.0
      }
    ],
    confidence: 0.98,
    severity: 'REQUIRED',
    category: 'LAB',
    nhsn_reference: 'NHSN 2024 Pathogen List Table 1',
    last_evaluated: '2025-01-15T10:00:00Z'
  },
  no_other_infection_source: {
    rule_id: 'no_other_infection_source',
    rule_name: 'No Alternative Infection Source',
    rule_description: 'No other identified source of bloodstream infection (e.g., UTI, pneumonia, SSI)',
    result: false,
    evidence: 'Possible pneumonia indicated by chest X-ray findings and respiratory symptoms. However, blood culture organism (S. aureus) is not typical for pneumonia. Requires clinical judgment.',
    evidence_refs: [
      {
        evidence_id: 'RAD_CXR_001',
        evidence_type: 'NOTE',
        timestamp: '2025-01-14T16:00:00Z',
        summary: 'Chest X-ray shows possible infiltrate',
        strength: 0.65
      },
      {
        evidence_id: 'CLIN_NOTE_001',
        evidence_type: 'NOTE',
        timestamp: '2025-01-14T18:00:00Z',
        summary: 'Respiratory symptoms documented',
        strength: 0.55
      }
    ],
    confidence: 0.72,
    severity: 'REQUIRED',
    category: 'EXCLUSION',
    nhsn_reference: 'NHSN 2024 CLABSI Protocol Section 4.5',
    last_evaluated: '2025-01-15T10:00:00Z'
  }
};

const ruleSummary: RuleSummary = {
  total_rules: 5,
  passed: 4,
  failed: 1,
  required_passed: 4,
  required_failed: 1,
  overall_status: 'PARTIAL'
};
```

## Styling Guidelines

### Summary Card
- **Background**: Linear gradient based on status
  - PASS: Green gradient (#d1fae5 to #ffffff)
  - PARTIAL: Yellow gradient (#fef3c7 to #ffffff)
  - FAIL: Red gradient (#fee2e2 to #ffffff)
- **Border**: 2px solid (status color)
- **Padding**: 1.5rem
- **Border radius**: 8px

### Progress Bar
- **Container**: Height 12px, background #f3f4f6, border-radius 6px
- **Bar**: Height 100%, dynamic width, color based on status
- **Animated**: Transition width 0.5s ease

### Category Section
- **Header**: Background #f9fafb, padding 0.75rem, border-radius 6px
- **Icon + label**: Flex layout, font-weight 600
- **Collapsible**: Smooth max-height transition

### Rule Card (Collapsed)
- **Background**: White
- **Border**: 1px solid #e5e7eb
- **Border-left**: 4px solid (status color)
- **Padding**: 1rem
- **Margin**: 0.5rem 0
- **Border-radius**: 6px
- **Hover**: Shadow increase, border color intensify

### Rule Card (Expanded)
- **Background**: White
- **Border**: 2px solid (status color)
- **Padding**: 1.5rem
- **Extra section**: Background #fafafa for evidence details

### Severity Badge
- **Padding**: 0.25rem 0.625rem
- **Border-radius**: 12px
- **Font size**: 0.75rem
- **Font weight**: 600
- **Border**: 1px solid (severity border color)

### Confidence Indicator
- **Font size**: 0.875rem
- **Color**: Based on confidence level
  - High (>80%): #059669
  - Medium (60-80%): #d97706
  - Low (<60%): #dc2626
- **Icon**: Add warning icon if low

### Evidence Reference
- **Padding**: 0.5rem 0.75rem
- **Background**: #fafafa
- **Border-left**: 3px solid #3b82f6
- **Margin**: 0.25rem 0
- **Clickable**: Cursor pointer, hover background #f3f4f6

## Responsive Behavior

### Desktop (>1024px)
- **Full layout** with all details
- **Side-by-side** evidence references (2 columns)

### Tablet (768px - 1024px)
- **Single column** evidence references
- **Reduced padding**

### Mobile (<768px)
- **Compact card layout**
- **Collapsible by default**
- **Stack all elements vertically**
- **Simplified evidence display**

## Interaction Patterns

### Expanding/Collapsing Rules
1. User clicks rule card or expand button
2. Smooth animation expands card
3. Evidence details render
4. Focus remains on card header

### Viewing Evidence Source
1. User clicks evidence reference
2. Call onEvidenceClick(evidenceId)
3. Parent component handles navigation/highlighting

### Filtering Rules
1. User clicks filter button (All/Required/Failed)
2. State updates
3. Cards fade out/in with animation
4. Update summary counts

## Accessibility

- **ARIA labels**: "Rule evaluation card", "Evidence reference"
- **Keyboard navigation**: Tab through cards, Enter to expand
- **Screen reader**: Announce pass/fail status, confidence level
- **Focus indicators**: Clear outline on focus
- **Color independence**: Don't rely solely on color for status

## Component Usage Example

```tsx
import RuleEvaluationVisualizer from './components/RuleEvaluationVisualizer';

function CaseViewPage() {
  const handleEvidenceClick = (evidenceId: string) => {
    // Navigate to evidence source
    scrollToElement(evidenceId);
  };

  return (
    <div className="case-view-layout">
      <RuleEvaluationVisualizer
        ruleEvaluations={caseData.rule_evaluations}
        onEvidenceClick={handleEvidenceClick}
        showOnlyFailed={false}
      />
    </div>
  );
}
```

## Implementation Priority
**HIGH** - Critical for making abstraction logic transparent and auditable. Essential for clinical validation and compliance.
