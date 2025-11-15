# Vercel v0.dev UI Component Specifications

This directory contains detailed specifications for UI components to be generated using [Vercel v0.dev](https://v0.dev).

## Available Specifications

### 1. Enhanced Timeline Visualization
**File:** `01-enhanced-timeline-spec.md`
**Priority:** Critical (Tier 1)
**Complexity:** High
**Clinical Impact:** ⭐⭐⭐⭐⭐

Interactive horizontal timeline with phase swimlanes, event markers, and visual connections to clinical signals. Essential for understanding temporal sequence of infection events.

**Key Features:**
- Phase-based swimlanes (PRE_LINE, LINE_PLACEMENT, CULTURE, etc.)
- Color-coded event markers by severity
- Interactive hover tooltips
- Phase filtering
- Responsive (vertical layout on mobile)

---

### 2. Search & Filter Panel
**File:** `02-search-filter-panel-spec.md`
**Priority:** Important (Tier 2)
**Complexity:** Medium
**Clinical Impact:** ⭐⭐⭐⭐

Multi-faceted search and filtering interface for case list with real-time updates, active filter chips, and sort controls. Critical for scalability as case volume grows.

**Key Features:**
- Real-time search (debounced)
- Multi-select filters (Risk Level, Determination, Domain)
- Active filter chips with remove buttons
- Sort controls (Date, Risk Score, Name)
- Result count display

---

## How to Use These Specs with Vercel v0.dev

### Step 1: Visit v0.dev
Navigate to [https://v0.dev](https://v0.dev)

### Step 2: Submit Specification
Copy the **entire contents** of the spec file you want to generate.

**Example prompt format:**
```
I need a React + TypeScript component for a clinical application.
Please generate the component based on this detailed specification:

[PASTE ENTIRE SPEC HERE]
```

### Step 3: Review & Iterate
- Review the generated component
- Test with sample data (provided in spec)
- Request modifications if needed
- Iterate until component matches requirements

### Step 4: Integration
1. Download generated component files (`.tsx`, `.css`)
2. Place in `reference-implementation/react/src/components/`
3. Import TypeScript interfaces from `src/types/index.ts`
4. Integrate into parent components (usage examples in spec)
5. Test with real data from Python backend

---

## Component Integration Guide

### Enhanced Timeline

**Where it goes:**
```typescript
// In: reference-implementation/react/src/pages/CaseViewPage.tsx

import EnhancedTimeline from '../components/EnhancedTimeline';

<EnhancedTimeline
  timeline={caseData.timeline}
  phaseConfig={domainConfig.timeline_phases}
  onEventClick={(event) => handleEventClick(event)}
/>
```

**Data source:** `caseData.timeline` from `/api/cases/:patientId`

---

### Search & Filter Panel

**Where it goes:**
```typescript
// In: reference-implementation/react/src/pages/CaseListPage.tsx

import SearchFilterPanel from '../components/SearchFilterPanel';

const [filteredCases, setFilteredCases] = useState<CaseInfo[]>(allCases);

<SearchFilterPanel
  cases={allCases}
  onFilteredCasesChange={(filtered) => setFilteredCases(filtered)}
/>

<CaseList cases={filteredCases} />
```

**Data source:** `allCases` from `/api/cases`

---

## TypeScript Interfaces

All required TypeScript interfaces are already defined in:
```
reference-implementation/react/src/types/index.ts
```

**Existing interfaces you can use:**
- `TimelineEvent` - Timeline event structure
- `CaseInfo` - Case metadata for list
- `CaseView` - Full case view with all details
- `Signal` - Clinical signal
- `Evidence` - Evidence items

---

## Testing Checklist

### After Generating Each Component

- [ ] Component compiles without TypeScript errors
- [ ] Component renders with sample data from spec
- [ ] All interactive features work (click, hover, filter, etc.)
- [ ] Responsive behavior works (test mobile/tablet/desktop)
- [ ] Accessibility features present (keyboard nav, ARIA labels, focus)
- [ ] Performance is acceptable (<100ms for interactions)
- [ ] Integrates with existing TypeScript interfaces
- [ ] Matches visual design in spec

### Integration Testing

- [ ] Component receives data from parent correctly
- [ ] Callbacks (onEventClick, onFilteredCasesChange) fire correctly
- [ ] Component updates when data changes
- [ ] No console errors or warnings
- [ ] Works with domain switching (CLABSI → CAUTI → SSI)

---

## Customization After Generation

You may need to adjust generated components for:

1. **Domain Configuration Integration**
   - Use `useDomainConfig()` hook for domain-specific labels
   - Replace hardcoded labels with config values

2. **API Integration**
   - Connect to actual API endpoints
   - Handle loading states
   - Handle error states

3. **Styling Consistency**
   - Match existing app color scheme
   - Use consistent spacing/typography
   - Ensure dark mode support (if applicable)

4. **Performance Optimization**
   - Add virtualization for large lists (>100 items)
   - Memoize expensive calculations
   - Debounce user inputs

---

## Example: Domain Configuration Usage

```typescript
import { useDomainConfig } from '../contexts/DomainConfigContext';

const EnhancedTimeline: React.FC<Props> = ({ timeline }) => {
  const { config } = useDomainConfig();

  // Use domain-specific phase configuration
  const phaseConfig = config.timeline_phases || defaultPhases;

  return (
    <div className="enhanced-timeline">
      {phaseConfig.map(phase => (
        <Swimlane key={phase.phase_id} phase={phase} />
      ))}
    </div>
  );
};
```

---

## Questions or Issues?

If you encounter issues during generation or integration:

1. **Component doesn't compile:**
   - Check TypeScript interfaces match spec exactly
   - Ensure all imports are correct
   - Verify React version compatibility (18.x)

2. **Component doesn't match spec:**
   - Try rephrasing prompt with more emphasis on specific requirement
   - Provide visual examples or diagrams
   - Iterate with v0.dev chat

3. **Performance issues:**
   - Check for unnecessary re-renders (use React DevTools)
   - Add memoization (`useMemo`, `useCallback`)
   - Consider virtualization for large data sets

---

## Next Steps After Component Generation

1. **Generate Component 1 (Enhanced Timeline)** - Critical for MVP
2. Test and integrate Timeline
3. **Generate Component 2 (Search & Filter Panel)** - Important for scalability
4. Test and integrate Search/Filter
5. End-to-end testing with both components
6. User acceptance testing with clinicians

---

## Spec Version History

- **v1.0** (2025-01-15) - Initial specs for Enhanced Timeline and Search/Filter Panel
