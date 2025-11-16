# Navigation Menu Component Specification

## Component Overview
A comprehensive responsive navigation menu for the Clinical Abstraction Platform that provides access to all major sections and features. The menu should reflect the actual application structure with the components we've built:
- Case list with SearchFilterPanel and EnhancedCaseCard
- Case view with EnhancedTimeline, SignalsPanel, QAPanel, AskTheCasePanel
- Rule Evaluation with RuleEvaluationVisualizer
- Domain switcher integration

## Current Application Architecture

### Pages & Routes
1. **Case List Page** (`/`) - Browse and filter cases
   - Components: SearchFilterPanel, EnhancedCaseCard
2. **Case View Page** (`/case/:patientId`) - View individual case details
   - Components: CaseOverview, CaseSummaryStrip, EnhancedTimeline, SignalsPanel, QAPanel, FeedbackPanel, AskTheCasePanel
3. **Rule Evaluation Page** (`/rules/:patientId`) - NHSN criteria evaluation
   - Components: RuleEvaluationVisualizer
4. **Analytics Dashboard** (future) - Analytics and reports
5. **Settings** (future) - Configuration and preferences

### Components Inventory
**Integrated Components:**
- ✅ EnhancedCaseCard - Visual case cards with risk indicators
- ✅ SearchFilterPanel - Advanced search and filtering
- ✅ EnhancedTimeline - Interactive patient timeline
- ✅ AskTheCasePanel - AI-powered Q&A with evidence citations
- ✅ RuleEvaluationVisualizer - NHSN criteria checklist with pass/fail
- ✅ CitationCard - Evidence source display
- ✅ ConfidenceIndicator - AI confidence visualization
- ✅ SignalsPanel - Clinical signals display
- ✅ QAPanel - Quality assurance panel
- ✅ FeedbackPanel - User feedback collection
- ✅ CaseOverview - Case summary overview
- ✅ CaseSummaryStrip - 80/20 summary strip
- ✅ DomainSwitcher - Switch between infection types (CLABSI, CAUTI, etc.)

## Requirements

### Functional Requirements
1. Display all main navigation sections with current routes
2. Show contextual navigation when viewing a case
3. Highlight the currently active page/section
4. Responsive design with mobile hamburger menu
5. Integrate DomainSwitcher in header
6. User profile section with logout option
7. Breadcrumb navigation for nested pages (e.g., Cases > Patient XYZ > Rules)
8. Quick actions menu for common tasks
9. Notification indicators for pending reviews

### Visual Requirements
1. Professional medical application aesthetic
2. Clear visual hierarchy
3. WCAG AA compliant color contrast
4. Smooth animations for menu interactions
5. Icons for each navigation item using lucide-react
6. Active state with accent color
7. Hover states for all interactive elements
8. Badge counters for pending items

## TypeScript Interfaces

```typescript
interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string; // Icon name from lucide-react
  badge?: number; // Optional notification count
  disabled?: boolean;
  children?: NavigationItem[]; // For sub-navigation
  requiresCase?: boolean; // Only show when viewing a case
}

interface UserInfo {
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

interface BreadcrumbItem {
  label: string;
  path?: string; // Optional - last item has no path
}

interface NavigationMenuProps {
  currentPath: string;
  userInfo: UserInfo;
  currentDomain: string; // CLABSI, CAUTI, etc.
  onNavigate: (path: string) => void;
  onDomainChange: (domain: string) => void;
  onLogout: () => void;
  breadcrumbs?: BreadcrumbItem[];
  caseContext?: {
    patientId: string;
    patientName: string;
  };
  className?: string;
}
```

## Navigation Structure

### Primary Navigation Items

```typescript
const primaryNavigation: NavigationItem[] = [
  {
    id: 'cases',
    label: 'Cases',
    path: '/',
    icon: 'FolderOpen',
    badge: 12, // Number of pending cases
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: 'BarChart3',
    disabled: true, // Future feature
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
  },
];
```

### Case Contextual Navigation
When viewing a specific case (`/case/:patientId`), show additional navigation:

```typescript
const caseNavigation: NavigationItem[] = [
  {
    id: 'case-overview',
    label: 'Overview',
    path: '/case/:patientId',
    icon: 'Eye',
    requiresCase: true,
  },
  {
    id: 'case-timeline',
    label: 'Timeline',
    path: '/case/:patientId#timeline',
    icon: 'Clock',
    requiresCase: true,
  },
  {
    id: 'case-signals',
    label: 'Signals',
    path: '/case/:patientId#signals',
    icon: 'Activity',
    requiresCase: true,
  },
  {
    id: 'case-qa',
    label: 'Ask the Case',
    path: '/case/:patientId#qa',
    icon: 'MessageSquare',
    requiresCase: true,
  },
  {
    id: 'case-rules',
    label: 'Rule Evaluation',
    path: '/rules/:patientId',
    icon: 'CheckSquare',
    requiresCase: true,
  },
  {
    id: 'case-feedback',
    label: 'Feedback',
    path: '/case/:patientId#feedback',
    icon: 'Send',
    requiresCase: true,
  },
];
```

### Quick Actions Menu

```typescript
const quickActions: NavigationItem[] = [
  {
    id: 'new-case-review',
    label: 'Start New Review',
    path: '/',
    icon: 'Plus',
  },
  {
    id: 'search-cases',
    label: 'Search Cases',
    path: '/#search',
    icon: 'Search',
  },
];
```

## Component Structure

### Desktop Layout (>1024px)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🏥 CLABSI Platform ▼    [Cases] [Analytics] [Settings]   John Doe ▼   │
├────────────────────────────────────────────────────────────────────────┤
│ Home > Cases > Patient ABC-001 > Rule Evaluation                       │
└────────────────────────────────────────────────────────────────────────┘
```

When viewing a case, show secondary nav:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🏥 CLABSI Platform ▼    [Cases] [Analytics] [Settings]   John Doe ▼   │
├────────────────────────────────────────────────────────────────────────┤
│ Patient ABC-001: John Smith                                            │
│ [Overview] [Timeline] [Signals] [Ask the Case] [Rules] [Feedback]     │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)
```
┌─────────────────────────────────────────┐
│ [☰] CLABSI Platform ▼      [User Icon]  │
└─────────────────────────────────────────┘

When hamburger clicked:
┌─────────────────────────────────────────┐
│ [✕] CLABSI Platform                     │
├─────────────────────────────────────────┤
│                                         │
│  🏥 Domain: CLABSI ▼                    │
│  ────────────────────────────────       │
│  📁 Cases                        (12)   │
│  📊 Analytics              [Disabled]   │
│  ⚙️  Settings                           │
│                                         │
│  CURRENT CASE: Patient ABC-001          │
│  ────────────────────────────────       │
│  👁️  Overview                           │
│  🕐 Timeline                            │
│  📈 Signals                             │
│  💬 Ask the Case                        │
│  ✅ Rule Evaluation                     │
│  📤 Feedback                            │
│                                         │
│  QUICK ACTIONS                          │
│  ────────────────────────────────       │
│  ➕ Start New Review                    │
│  🔍 Search Cases                        │
│                                         │
│  ────────────────────────────────       │
│  👤 John Doe                            │
│     Clinical Abstractor                 │
│  🚪 Logout                              │
│                                         │
└─────────────────────────────────────────┘
```

## Visual Design Specifications

### Color Palette
```css
--nav-background: #ffffff
--nav-border: #e5e7eb
--nav-text: #374151
--nav-text-hover: #111827
--nav-active-bg: #eff6ff
--nav-active-text: #3b82f6
--nav-active-border: #3b82f6
--nav-disabled-text: #9ca3af
--badge-bg: #dc2626
--badge-text: #ffffff
--badge-info: #3b82f6
--mobile-overlay: rgba(0, 0, 0, 0.5)
--breadcrumb-separator: #d1d5db
--domain-switcher-bg: #f3f4f6
```

### Typography
- App Title/Brand: 1.25rem (20px), font-weight: 700
- Domain Name: 1rem (16px), font-weight: 600
- Primary Nav Items: 0.9375rem (15px), font-weight: 500
- Secondary Nav Items: 0.875rem (14px), font-weight: 500
- Breadcrumbs: 0.875rem (14px), font-weight: 400
- User Name: 0.875rem (14px), font-weight: 600
- User Role: 0.75rem (12px), font-weight: 400

### Spacing
- Desktop nav height: 64px
- Secondary nav height: 48px
- Mobile nav height: 56px
- Horizontal padding: 1rem (mobile), 1.5rem (desktop)
- Gap between nav items: 0.75rem
- Gap between sections: 1.5rem

### Component States

#### Primary Navigation Item
**Default:**
- Background: transparent
- Text color: #374151
- Border: none

**Hover:**
- Background: #f9fafb
- Text color: #111827
- Cursor: pointer

**Active:**
- Background: #eff6ff
- Text color: #3b82f6
- Border-bottom: 3px solid #3b82f6

**Disabled:**
- Opacity: 0.5
- Cursor: not-allowed
- Badge shows "Soon"

#### Secondary Navigation (Case Context)
**Tabs style with underline for active state**
- Active: Border-bottom: 2px solid #3b82f6

#### Domain Switcher
- Dropdown button style
- Shows current domain (CLABSI, CAUTI, etc.)
- Icon: ChevronDown

## Sample Data

```typescript
const sampleProps: NavigationMenuProps = {
  currentPath: '/case/PAT-001',
  userInfo: {
    name: 'Dr. Sarah Johnson',
    role: 'Clinical Abstractor',
    email: 'sarah.johnson@hospital.com',
  },
  currentDomain: 'CLABSI',
  breadcrumbs: [
    { label: 'Home', path: '/' },
    { label: 'Cases', path: '/' },
    { label: 'Patient ABC-001', path: '/case/PAT-001' },
    { label: 'Rule Evaluation' }, // No path - current page
  ],
  caseContext: {
    patientId: 'PAT-001',
    patientName: 'John Smith',
  },
  onNavigate: (path) => console.log('Navigate to:', path),
  onDomainChange: (domain) => console.log('Switch domain to:', domain),
  onLogout: () => console.log('Logout'),
};
```

## Component Implementation Guidance

### Key Features to Implement

1. **Responsive Navigation**
   - Desktop: Horizontal nav with all items visible
   - Mobile: Hamburger menu with slide-in panel

2. **Breadcrumb Trail**
   - Show current location hierarchy
   - Click to navigate to parent pages
   - Auto-generate from route

3. **Domain Switcher Integration**
   - Prominent placement in header
   - Dropdown to switch between CLABSI, CAUTI, SSI, etc.
   - Shows current domain

4. **Case Context Navigation**
   - Secondary nav bar when viewing a case
   - Tabs/pills style for case sections
   - Sticky/fixed position

5. **Badge Notifications**
   - Red badge for pending items
   - Blue badge for info
   - Update count dynamically

6. **User Menu**
   - Desktop: Dropdown from user info
   - Mobile: Integrated in slide-in panel
   - Shows user name, role, logout option

7. **Quick Actions**
   - Floating action button or dropdown
   - Common tasks easily accessible
   - Mobile: In hamburger menu

8. **Search Integration**
   - Quick search bar in navigation
   - Opens full SearchFilterPanel

### Icons from lucide-react

```typescript
import {
  // Primary Navigation
  FolderOpen,      // Cases
  BarChart3,       // Analytics
  Settings,        // Settings

  // Case Navigation
  Eye,             // Overview
  Clock,           // Timeline
  Activity,        // Signals
  MessageSquare,   // Ask the Case
  CheckSquare,     // Rule Evaluation
  Send,            // Feedback

  // Quick Actions
  Plus,            // New Review
  Search,          // Search

  // UI Elements
  Menu,            // Hamburger
  X,               // Close
  User,            // User avatar
  LogOut,          // Logout
  ChevronDown,     // Dropdown
  ChevronRight,    // Submenu
  Home,            // Breadcrumb home
} from 'lucide-react';
```

## Styling Guidelines

### Primary Navigation Bar
- Fixed/sticky top position
- White background with subtle shadow
- Two-row layout:
  - Row 1: Brand + Domain Switcher + Primary Nav + User Menu
  - Row 2: Breadcrumbs (if applicable)
- Border-bottom: 1px solid #e5e7eb

### Secondary Navigation (Case Context)
- Sticky below primary nav
- Tabs/pills style
- Background: #f9fafb
- Horizontal scroll on mobile

### Mobile Menu Panel
- Full-height slide-in from left
- Width: 280px (max)
- Organized sections with dividers
- Touch-friendly targets (min 44px)

### Breadcrumbs
- Font size: 0.875rem
- Separator: "/" or ">" in gray
- Last item (current) is not clickable
- Truncate long names with ellipsis

## Accessibility Requirements

1. **Keyboard Navigation**
   - Tab through all nav items
   - Enter/Space to activate
   - Escape to close menus

2. **ARIA Labels**
   - `role="navigation"` on nav elements
   - `aria-current="page"` for active item
   - `aria-expanded` for dropdowns
   - `aria-label` for icon-only buttons

3. **Screen Reader Support**
   - Announce active page
   - Announce badge counts
   - Skip navigation link

4. **Focus Management**
   - Visible focus indicators
   - Focus trap in mobile menu
   - Return focus when closing

## Interaction Behaviors

### Desktop
1. Click nav item → navigate to path
2. Click domain switcher → show domain dropdown
3. Click user menu → toggle user dropdown
4. Click outside dropdown → close dropdown
5. Hover nav items → show hover state
6. Breadcrumb click → navigate to parent

### Mobile
1. Click hamburger → slide-in menu panel
2. Click overlay → close menu
3. Click nav item → navigate and close menu
4. Swipe right on panel → close menu
5. Case navigation → horizontal scroll tabs

## Animation Specifications

```css
/* Mobile menu slide-in */
.mobile-nav-panel {
  transform: translateX(-100%);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-nav-panel.open {
  transform: translateX(0);
}

/* Dropdown menus */
.dropdown {
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 200ms ease, transform 200ms ease;
}

.dropdown.open {
  opacity: 1;
  transform: translateY(0);
}

/* Hover states */
.nav-item:hover {
  transition: background-color 150ms ease, color 150ms ease;
}

/* Badge pulse */
.badge.has-notification {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## Responsive Breakpoints

- **Mobile**: < 768px
  - Hamburger menu
  - Full-width layout
  - Stacked user info

- **Tablet**: 768px - 1024px
  - Horizontal primary nav
  - Condensed labels
  - Scrollable case tabs

- **Desktop**: > 1024px
  - Full horizontal layout
  - All features visible
  - Two-row header

## Advanced Features (Progressive Enhancement)

1. **Global Search**
   - Quick search in nav bar
   - Keyboard shortcut (Cmd/Ctrl + K)
   - Fuzzy search across cases

2. **Notifications Center**
   - Bell icon with badge
   - Dropdown notifications panel
   - Mark as read functionality

3. **Recent Cases**
   - Quick access to recently viewed cases
   - Stored in localStorage

4. **Keyboard Shortcuts**
   - Show shortcuts modal (?)
   - Navigate between sections (1-9)
   - Quick actions (Shift + N for new review)

5. **Theme Toggle**
   - Light/dark mode switcher
   - Persist preference

## Integration with Existing Components

### DomainSwitcher
Already exists - integrate into header
```tsx
<DomainSwitcher />
```

### Case Context Detection
```typescript
// Detect when viewing a case
const isCaseView = currentPath.startsWith('/case/');
const patientId = isCaseView ? currentPath.split('/')[2] : null;

// Show case navigation
{isCaseView && patientId && (
  <CaseNavigation patientId={patientId} />
)}
```

### Breadcrumb Generation
```typescript
const generateBreadcrumbs = (path: string): BreadcrumbItem[] => {
  if (path === '/') return [{ label: 'Cases' }];

  if (path.startsWith('/case/')) {
    const patientId = path.split('/')[2];
    return [
      { label: 'Cases', path: '/' },
      { label: `Patient ${patientId}` },
    ];
  }

  if (path.startsWith('/rules/')) {
    const patientId = path.split('/')[2];
    return [
      { label: 'Cases', path: '/' },
      { label: `Patient ${patientId}`, path: `/case/${patientId}` },
      { label: 'Rule Evaluation' },
    ];
  }

  return [];
};
```

## Testing Scenarios

1. ✅ All navigation items render correctly
2. ✅ Active state highlights current page
3. ✅ Breadcrumbs show correct path
4. ✅ Case navigation appears when viewing case
5. ✅ Domain switcher works
6. ✅ Mobile menu opens/closes properly
7. ✅ User dropdown toggles correctly
8. ✅ Badge counts display
9. ✅ Disabled items are not clickable
10. ✅ Keyboard navigation works
11. ✅ Screen reader compatibility
12. ✅ Responsive layout switches at breakpoints
13. ✅ Quick actions execute correctly
14. ✅ Logout function is called

## Design References

Professional medical/clinical software navigation:
- Epic EHR navigation patterns
- Cerner navigation design
- Modern SaaS application headers (Linear, Notion)
- Healthcare compliance focus (clean, uncluttered)

Focus on:
- Medical professionalism
- Information density without clutter
- Quick access to common tasks
- Clear wayfinding (breadcrumbs, active states)
- Accessibility compliance
