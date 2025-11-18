# CA Factory - Routes and Navigation

## Route Structure

### 1. **Home Page** - `/`
- **File**: `app/page.tsx`
- **Purpose**: Concern selection and quick access to demo cases
- **Components Used**:
  - `ConcernCard` - Displays CLABSI, CAUTI, SSI cards with "View Cases" and "Demo Case" buttons
  - Quick Start section with direct link to CLABSI demo
- **User Actions**:
  - Click "View Cases" → Navigate to `/concern/[concernId]/cases`
  - Click "Demo Case" → Navigate to `/case/[demo_case_id]`
  - Click "Start with CLABSI Demo" → Navigate to `/case/clabsi_demo_001`

### 2. **Case List Page** - `/concern/[concernId]/cases`
- **File**: `app/concern/[concernId]/cases/page.tsx`
- **Purpose**: Browse and filter cases for a specific HAC (CLABSI, CAUTI, SSI)
- **Components Used**:
  - `CaseCard` - Individual case summary cards
  - Filters: Task State, Risk Level, Search
- **Mock Data**: Contains demo cases for clabsi, cauti, and ssi
- **User Actions**:
  - Click on any case card → Navigate to `/case/[caseId]`
  - Click "Back" → Navigate to `/`
  - Use filters to refine case list

### 3. **Case Workbench Page** - `/case/[caseId]`
- **File**: `app/case/[caseId]/page.tsx`
- **Purpose**: Main clinical review interface for a single case
- **Components Used**:
  - `PipelineStepper` - Shows progress through 4 stages (Context → Enrichment → Abstraction → Feedback)
  - `TaskMetadataBadge` - Displays task_id, version, mode, timestamp, confidence for enrichment and abstraction
  - `EnrichmentSummaryPanel` - Summary statistics and key findings
  - `SignalsPanel` - Clinical signals grouped by type
  - `TimelinePanel` - Timeline phases with significance levels
  - `AskTheCasePanel` - Interactive interrogation interface
  - `InterrogationPanel` - QA history
  - `CriteriaDetailModal` - Detailed NHSN criteria evaluation (accessible via button)
  - `TaskHistoryDrawer` - Task execution history (accessible via button)
  - `DemoModeBanner` - Shows when in demo mode
- **Data Source**: Fetches from `/api/cases/[caseId]`
- **User Actions**:
  - Navigate between sections using tabs or pipeline stepper
  - Click pipeline stage → Scroll to that section
  - Submit questions via Ask panel
  - View detailed criteria evaluation
  - View task execution history

### 4. **API Route** - `/api/cases/[caseId]`
- **File**: `app/api/cases/[caseId]/route.ts`
- **Purpose**: Returns mock StructuredCase data
- **Returns**: Complete case data with patient, enrichment, abstraction, and qa sections

## Navigation Bar

The app-wide navigation is implemented in `components/navigation.tsx` and included in `app/layout.tsx`:

**Navigation Items**:
1. **Home** (/) - Concern selection
2. **Cases** (/concern/clabsi/cases) - CLABSI case list (default)
3. **Demo** (/case/clabsi_demo_001) - Direct link to demo case
4. **Task History** (#) - Coming soon (disabled)
5. **Admin** (#) - Coming soon (disabled)

**Features**:
- Active link highlighting based on current pathname
- Responsive design (icons only on mobile, labels on desktop)
- Disabled state for upcoming features
- Tooltips showing description on hover

## User Flow

### Flow 1: Home → Case List → Case Workbench
```
1. User lands on Home page (/)
2. Clicks "View Cases" on CLABSI card
3. Navigates to /concern/clabsi/cases
4. Filters/searches for cases
5. Clicks on a case card
6. Navigates to /case/[caseId]
7. Reviews case in workbench
```

### Flow 2: Quick Start Demo
```
1. User lands on Home page (/)
2. Clicks "Start with CLABSI Demo" in Quick Start card
3. Directly navigates to /case/clabsi_demo_001
4. Immediately sees demo case workbench
```

### Flow 3: Demo from Concern Card
```
1. User lands on Home page (/)
2. Clicks "Demo Case" on any HAC card
3. Navigates to /case/[demo_case_id]
4. Sees demo case for that specific HAC
```

### Flow 4: Navigation Bar
```
1. User can click "Cases" in nav bar from any page
2. Navigates to /concern/clabsi/cases
3. Or clicks "Demo" to jump directly to demo case
4. Or clicks "Home" to return to concern selection
```

## Case IDs and Mock Data

**CLABSI Cases**:
- `clabsi_demo_001` - Demo case (68M with S. aureus bacteremia)
- `clabsi_002` - 45F with PICC line
- `clabsi_003` - 72M ICU patient

**CAUTI Cases**:
- `cauti_demo_001` - Demo case (55F with Foley catheter)

**SSI Cases**:
- `ssi_demo_001` - Demo case (62M post-op cardiac surgery)

## Component Hierarchy

```
app/layout.tsx
└── Navigation (app-wide)
└── main
    ├── app/page.tsx (Home)
    │   └── ConcernCard (x3: CLABSI, CAUTI, SSI)
    │
    ├── app/concern/[concernId]/cases/page.tsx (Case List)
    │   └── CaseCard (multiple)
    │
    └── app/case/[caseId]/page.tsx (Case Workbench)
        ├── DemoModeBanner (conditional)
        ├── PipelineStepper
        ├── TaskMetadataBadge (enrichment, abstraction)
        ├── Tabs
        │   ├── Context Tab
        │   │   └── Patient demographics, timeline
        │   ├── Enrichment Tab
        │   │   ├── EnrichmentSummaryPanel
        │   │   ├── SignalsPanel
        │   │   └── TimelinePanel
        │   ├── Abstraction Tab
        │   │   └── Narrative, criteria, exclusions
        │   └── Feedback Tab
        │       ├── InterrogationPanel
        │       └── AskTheCasePanel
        ├── TaskHistoryDrawer (accessible via button)
        └── CriteriaDetailModal (accessible via button)
```

## Phase 1 Scope

**Implemented**:
- ✅ Home page with concern selection
- ✅ Case list with filters
- ✅ Case workbench with pipeline visualization
- ✅ Task metadata badges showing execution details
- ✅ Navigation bar with active link highlighting
- ✅ Demo mode support
- ✅ All Phase 1 components from VERCEL_UI_SPECIFICATION

**Coming in Later Phases**:
- ⏳ Task History page (currently accessible via drawer in workbench)
- ⏳ Admin interface
- ⏳ Real API integration (currently using mock data)
- ⏳ Authentication and user management
- ⏳ Task execution/re-run capabilities

## Key Features

1. **Responsive Design**: Works on mobile, tablet, and desktop
2. **Mock Data**: Complete demo data for all HACs
3. **Pipeline Visualization**: Clear progress tracking through 4 stages
4. **Task Transparency**: Metadata badges show who, what, when, how for every AI task
5. **Interactive Interrogation**: Ask questions about the case
6. **Detailed Criteria**: Modal showing evidence and confidence for each NHSN criterion
7. **Clean Navigation**: Consistent nav bar on all pages
8. **Demo Mode Indicator**: Clear visual indicator when viewing demo data

## Technical Notes

- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Icons**: lucide-react
- **Type Safety**: Full TypeScript coverage with StructuredCase types
- **Data Fetching**: Client-side fetching in Case Workbench, static rendering for Home/List pages
