export interface NavigationItem {
  id: string
  label: string
  path: string
  icon: string // Icon name from lucide-react
  badge?: number // Optional notification count
  disabled?: boolean
  children?: NavigationItem[] // For sub-navigation
  requiresCase?: boolean // Only show when viewing a case
}

export interface UserInfo {
  name: string
  role: string
  email?: string
  avatar?: string
}

export interface BreadcrumbItem {
  label: string
  path?: string // Optional - last item has no path
}

export interface CaseContext {
  patientId: string
  patientName: string
}

export interface NavigationMenuProps {
  currentPath: string
  userInfo: UserInfo
  currentDomain: string // CLABSI, CAUTI, etc.
  onNavigate: (path: string) => void
  onDomainChange: (domain: string) => void
  onLogout: () => void
  breadcrumbs?: BreadcrumbItem[]
  caseContext?: CaseContext
  className?: string
}

// Navigation data
export const primaryNavigation: NavigationItem[] = [
  {
    id: 'cases',
    label: 'Cases',
    path: '/',
    icon: 'FolderOpen',
    badge: 12,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: 'BarChart3',
    disabled: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
  },
]

export const caseNavigation: NavigationItem[] = [
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
]

export const quickActions: NavigationItem[] = [
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
]
