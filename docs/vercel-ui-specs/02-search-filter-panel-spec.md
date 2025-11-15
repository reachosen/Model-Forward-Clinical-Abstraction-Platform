# Vercel v0.dev Spec: Search & Filter Panel

## Component Overview

**Component Name:** `SearchFilterPanel`

**Purpose:** Multi-faceted search and filtering interface for the case list page that enables clinicians to quickly find specific cases by patient identifiers, filter by risk level, determination status, and domain, with real-time search results and clear visual feedback.

**Critical for:** Scalability - as case volume grows, clinicians need efficient search and filtering to find relevant cases quickly.

---

## Component Behavior

### Primary Features

1. **Real-Time Search**
   - Search across: Patient ID, MRN, Patient Name, Scenario
   - Debounced input (300ms) to prevent excessive filtering
   - Clear button to reset search
   - Search highlights matching text in results

2. **Multi-Select Filters**
   - **Risk Level:** LOW, MODERATE, HIGH, CRITICAL
   - **Determination:** Likely Infection, Not Infection, Borderline, Indeterminate
   - **Domain:** CLABSI, CAUTI, SSI (dynamic based on available domains)
   - Filters applied with AND logic (all must match)

3. **Active Filter Chips**
   - Show all active filters as removable chips
   - Click chip "x" to remove individual filter
   - "Clear All Filters" button to reset everything

4. **Sort Controls**
   - Sort by: Date (newest/oldest), Risk Score (high/low), Patient Name (A-Z)
   - Visual indicator of active sort

5. **Result Count**
   - Display "Showing X of Y cases"
   - Update in real-time as filters change

---

## Data Structure

### Input Props

```typescript
interface CaseInfo {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  name: string;
  scenario: string;
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  determination?: string; // "Likely CLABSI", "Not CLABSI", etc.
  domain?: string; // "CLABSI", "CAUTI", "SSI"
  abstraction_datetime?: string;
  risk_score?: number;
}

interface FilterOptions {
  riskLevels: Array<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>;
  determinations: string[]; // e.g., ["Likely CLABSI", "Not CLABSI", "Borderline"]
  domains: string[]; // e.g., ["CLABSI", "CAUTI", "SSI"]
}

interface SearchFilterPanelProps {
  cases: CaseInfo[];
  onFilteredCasesChange: (filteredCases: CaseInfo[]) => void;
  filterOptions?: FilterOptions; // Optional - derives from cases if not provided
}
```

### Sample Data

```typescript
const sampleCases: CaseInfo[] = [
  {
    patient_id: "PAT001",
    encounter_id: "ENC001",
    episode_id: "EP001",
    mrn: "MRN100001",
    name: "John Doe",
    scenario: "Clear Positive CLABSI",
    risk_level: "HIGH",
    determination: "Likely CLABSI",
    domain: "CLABSI",
    abstraction_datetime: "2024-01-20T10:00:00",
    risk_score: 0.87
  },
  {
    patient_id: "PAT002",
    encounter_id: "ENC002",
    episode_id: "EP002",
    mrn: "MRN100002",
    name: "Jane Smith",
    scenario: "Clear Negative",
    risk_level: "LOW",
    determination: "Not CLABSI",
    domain: "CLABSI",
    abstraction_datetime: "2024-01-19T14:30:00",
    risk_score: 0.12
  },
  {
    patient_id: "PAT003",
    encounter_id: "ENC003",
    episode_id: "EP003",
    mrn: "MRN100003",
    name: "Robert Johnson",
    scenario: "Borderline Case",
    risk_level: "MODERATE",
    determination: "Borderline",
    domain: "CAUTI",
    abstraction_datetime: "2024-01-18T09:15:00",
    risk_score: 0.56
  }
];
```

---

## Visual Design Requirements

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search & Filter                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍  Search patients, MRN, ID...                    [×] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Filters ─────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Risk Level: [▼ All Levels      ]                       │   │
│  │  Determination: [▼ All          ]                       │   │
│  │  Domain: [▼ All Domains         ]                       │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Active Filters ──────────────────────────────────────┐   │
│  │  [HIGH ×]  [Likely CLABSI ×]              Clear All     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Sort By ─────────────────────────────────────────────┐   │
│  │  ( ) Date - Newest First                                │   │
│  │  (•) Risk Score - High to Low                           │   │
│  │  ( ) Patient Name - A to Z                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 12 of 47 cases                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Styling Guidelines

**Container:**
- Background: `#ffffff`
- Border: 1px solid `#e5e7eb`
- Border radius: 8px
- Padding: 24px
- Box shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Sticky position on scroll (optional)

**Search Input:**
- Height: 48px
- Font size: 16px
- Border: 1px solid `#d1d5db`
- Border radius: 6px
- Padding: 12px 16px 12px 48px (space for icon)
- Focus: Border color `#3b82f6`, shadow `0 0 0 3px rgba(59,130,246,0.1)`
- Icon: 20px search icon, positioned left, color `#9ca3af`
- Clear button: 16px "×" icon, right side, appears when input has value

**Filter Dropdowns:**
- Height: 44px
- Border: 1px solid `#d1d5db`
- Border radius: 6px
- Padding: 10px 14px
- Chevron icon: right aligned
- Hover: Border color `#9ca3af`
- Active: Border color `#3b82f6`
- Dropdown menu:
  - Background: `#ffffff`
  - Border: 1px solid `#e5e7eb`
  - Shadow: `0 4px 12px rgba(0,0,0,0.15)`
  - Max height: 320px (scrollable)
  - Checkboxes for multi-select

**Active Filter Chips:**
- Background: `#dbeafe` (blue-100)
- Color: `#1e40af` (blue-800)
- Padding: 6px 12px
- Border radius: 16px (pill shape)
- Font size: 14px
- Remove "×" button:
  - Size: 16px
  - Color: `#3b82f6`
  - Hover: Color `#1e40af`, background `#bfdbfe`

**"Clear All" Button:**
- Text button, no background
- Color: `#3b82f6`
- Hover: Color `#1e40af`, underline
- Font size: 14px

**Sort Radio Buttons:**
- Standard radio inputs with labels
- Spacing: 12px between options
- Label font size: 14px
- Color: `#374151`
- Selected: Radio filled with `#3b82f6`

**Result Count:**
- Font size: 14px
- Color: `#6b7280`
- Margin top: 16px
- Format: "Showing X of Y cases"

---

## Responsive Behavior

### Desktop (≥1024px)
- Full panel with all filters visible
- Side panel layout (300px fixed width)
- Sticky positioning on scroll

### Tablet (768px - 1023px)
- Collapsible accordion sections for filters
- Full width layout above case list
- Filters collapsed by default

### Mobile (<768px)
- Modal overlay triggered by "Filter" button
- Full screen filter interface
- "Apply" and "Cancel" buttons at bottom
- Search bar sticky at top

---

## Interaction States

### Default State
- All filters set to "All" (no filters applied)
- Search input empty
- No active filter chips
- Default sort: Date - Newest First
- Result count shows total cases

### Searching State
- Show loading spinner in search input (if async search)
- Debounce input (300ms delay before filtering)
- Highlight matching text in results (optional integration point)

### Filtered State
- Active filters shown as chips
- Result count updates: "Showing X of Y cases"
- "Clear All" button visible
- Dropdown shows selected count badge (e.g., "Risk Level (2)")

### Empty Results State
- Show message: "No cases match your filters"
- Suggest: "Try removing some filters or adjusting your search"
- "Clear All Filters" button prominently displayed

---

## Filter Logic

### AND Logic (All Filters)
When multiple filter categories are active:
- Risk Level: Match ANY selected level (OR within category)
- Determination: Match ANY selected determination (OR within category)
- Domain: Match ANY selected domain (OR within category)
- **Between categories:** ALL must match (AND across categories)

Example:
```
Risk: [HIGH, CRITICAL]
Determination: [Likely CLABSI]
→ Show cases that are (HIGH OR CRITICAL) AND (Likely CLABSI)
```

### Search Logic
Search term matches if found in ANY of:
- `patient_id` (case-insensitive, partial match)
- `mrn` (case-insensitive, partial match)
- `name` (case-insensitive, partial match)
- `scenario` (case-insensitive, partial match)

Example:
```
Search: "john"
→ Matches: name="John Doe", name="Johnson", scenario="John's case"
```

### Sort Logic

**Date - Newest First:**
```typescript
cases.sort((a, b) =>
  new Date(b.abstraction_datetime).getTime() -
  new Date(a.abstraction_datetime).getTime()
)
```

**Risk Score - High to Low:**
```typescript
cases.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
```

**Patient Name - A to Z:**
```typescript
cases.sort((a, b) => a.name.localeCompare(b.name))
```

---

## Accessibility

- **Keyboard Navigation:**
  - Tab through all interactive elements
  - Enter/Space to open dropdowns
  - Arrow keys to navigate dropdown options
  - Escape to close dropdowns
  - Enter to toggle checkboxes

- **Screen Reader:**
  - Label all inputs with `<label>` or `aria-label`
  - Announce filter changes with `aria-live="polite"`
  - Result count in `aria-live` region
  - Checkbox states announced

- **Focus Management:**
  - Clear focus indicators (2px solid `#3b82f6` outline)
  - Return focus to trigger after closing dropdown
  - Skip link to results ("Skip to filtered cases")

---

## Performance Considerations

- **Debounce Search:** 300ms delay before filtering
- **Memoize Filter Function:** Use `useMemo` to cache filtered results
- **Virtual Scrolling:** If case list >100 items (integration with case list component)
- **Lazy Load Dropdowns:** Don't render dropdown content until opened

---

## Integration Notes

### File Location
`reference-implementation/react/src/components/SearchFilterPanel.tsx`
`reference-implementation/react/src/components/SearchFilterPanel.css`

### Usage in CaseListPage

```typescript
import SearchFilterPanel from '../components/SearchFilterPanel';

const [filteredCases, setFilteredCases] = useState<CaseInfo[]>(allCases);

<SearchFilterPanel
  cases={allCases}
  onFilteredCasesChange={(filtered) => setFilteredCases(filtered)}
/>

{/* Display filteredCases in table/list */}
<CaseList cases={filteredCases} />
```

### TypeScript Interface Import
```typescript
import { CaseInfo } from '../types';
```

---

## Example Implementation Notes

**Do:**
- Use `useState` for search term, active filters, sort option
- Use `useEffect` to recalculate filtered cases when filters change
- Extract filter options dynamically from cases array
- Persist filters to URL query params (optional, nice-to-have)

**Don't:**
- Filter on every keystroke (use debounce)
- Mutate original cases array
- Hardcode filter options (derive from data or props)
- Block UI during filtering (should be instant for <1000 cases)

**Libraries to Consider:**
- `lodash.debounce` - Debounce search input
- `react-select` - Advanced multi-select dropdowns (optional, if needed)

---

## Edge Cases to Handle

1. **No Cases:** Show empty state, disable filters
2. **Missing Fields:** Handle cases where `risk_level`, `determination`, or `domain` is undefined
3. **All Filters Result in 0 Cases:** Show helpful "no results" message
4. **Very Long Filter Lists:** Make dropdowns scrollable (max 320px height)
5. **Special Characters in Search:** Escape regex special chars or use simple includes()

---

## Testing Scenarios

1. **Search Functionality:**
   - Type "john" → verify cases with "John" in name appear
   - Clear search → verify all cases return
   - Search with no matches → verify empty state

2. **Filtering:**
   - Select "HIGH" risk → verify only HIGH risk cases shown
   - Select multiple risk levels → verify OR logic
   - Combine risk + determination filters → verify AND logic
   - Clear individual filter chip → verify filter removed
   - Clear all filters → verify all cases return

3. **Sorting:**
   - Sort by date → verify newest first
   - Sort by risk score → verify high to low
   - Sort by name → verify A-Z

4. **Combined:**
   - Search + Filter + Sort → verify all work together
   - Apply filters → sort → verify sort maintained
   - Change filters → verify sort preserved

5. **Performance:**
   - Test with 100 cases → search should respond <100ms
   - Rapid typing in search → verify debounce works

---

## State Management

```typescript
interface FilterState {
  searchTerm: string;
  selectedRiskLevels: string[];
  selectedDeterminations: string[];
  selectedDomains: string[];
  sortBy: 'date-desc' | 'date-asc' | 'risk-desc' | 'name-asc';
}

const [filterState, setFilterState] = useState<FilterState>({
  searchTerm: '',
  selectedRiskLevels: [],
  selectedDeterminations: [],
  selectedDomains: [],
  sortBy: 'date-desc'
});
```

---

## Future Enhancements (Not Required for v1)

- Save custom filter presets
- URL query param persistence (`?risk=HIGH&domain=CLABSI`)
- Advanced search (date ranges, numeric ranges)
- Bulk actions on filtered results
- Export filtered cases as CSV
