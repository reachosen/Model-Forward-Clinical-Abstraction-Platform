/**
 * Navigation Menu Component
 * Comprehensive navigation with desktop/mobile layouts, breadcrumbs, and contextual case navigation
 */

import React, { useState } from 'react';
import {
  FolderOpen,
  BarChart3,
  Settings,
  Eye,
  Clock,
  Activity,
  MessageSquare,
  CheckSquare,
  Send,
  Plus,
  Search,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  Home,
  type LucideIcon,
} from 'lucide-react';
import DomainSwitcher from './DomainSwitcher';
import './NavigationMenu.css';

// Types
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
  disabled?: boolean;
  requiresCase?: boolean;
}

export interface UserInfo {
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface CaseContext {
  patientId: string;
  patientName: string;
}

export interface NavigationMenuProps {
  currentPath: string;
  userInfo: UserInfo;
  currentDomain: string;
  onNavigate: (path: string) => void;
  onDomainChange: (domain: string) => void;
  onLogout: () => void;
  breadcrumbs?: BreadcrumbItem[];
  caseContext?: CaseContext;
  className?: string;
}

// Navigation data
const primaryNavigation: NavigationItem[] = [
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
];

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

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  FolderOpen,
  BarChart3,
  Settings,
  Eye,
  Clock,
  Activity,
  MessageSquare,
  CheckSquare,
  Send,
  Plus,
  Search,
  Home,
};

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  currentPath,
  userInfo,
  currentDomain,
  onNavigate,
  onDomainChange,
  onLogout,
  breadcrumbs,
  caseContext,
  className = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Determine if we're in a case view
  const isCaseView = Boolean(caseContext);

  // Replace :patientId in paths with actual patient ID
  const resolvePath = (path: string) => {
    if (caseContext) {
      return path.replace(':patientId', caseContext.patientId);
    }
    return path;
  };

  // Check if a nav item is active
  const isActive = (path: string) => {
    const resolvedPath = resolvePath(path);
    if (resolvedPath.includes('#')) {
      const [pathPart, hashPart] = resolvedPath.split('#');
      return currentPath === pathPart && window.location.hash === `#${hashPart}`;
    }
    return currentPath === resolvedPath;
  };

  // Handle navigation
  const handleNavigate = (path: string) => {
    const resolvedPath = resolvePath(path);
    onNavigate(resolvedPath);
    setMobileMenuOpen(false);
  };

  // Render navigation item
  const renderNavItem = (
    item: NavigationItem,
    variant: 'primary' | 'case' | 'mobile' = 'primary'
  ) => {
    const Icon = iconMap[item.icon];
    const active = isActive(item.path);

    if (variant === 'mobile') {
      return (
        <button
          key={item.id}
          onClick={() => !item.disabled && handleNavigate(item.path)}
          disabled={item.disabled}
          className={`nav-item-mobile ${active ? 'active' : ''} ${
            item.disabled ? 'disabled' : ''
          }`}
        >
          <div className="nav-item-mobile-content">
            {Icon && <Icon className="nav-item-mobile-icon" />}
            <span>{item.label}</span>
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="nav-badge nav-badge-destructive">{item.badge}</span>
          )}
          {item.disabled && <span className="nav-badge nav-badge-secondary">Soon</span>}
        </button>
      );
    }

    if (variant === 'case') {
      return (
        <button
          key={item.id}
          onClick={() => handleNavigate(item.path)}
          className={`nav-item-case ${active ? 'active' : ''}`}
        >
          {Icon && <Icon className="nav-item-case-icon" />}
          <span>{item.label}</span>
        </button>
      );
    }

    // Primary navigation
    return (
      <button
        key={item.id}
        onClick={() => !item.disabled && handleNavigate(item.path)}
        disabled={item.disabled}
        className={`nav-item-primary ${active ? 'active' : ''} ${
          item.disabled ? 'disabled' : ''
        }`}
      >
        {Icon && <Icon className="nav-item-primary-icon" />}
        <span>{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="nav-badge nav-badge-destructive">{item.badge}</span>
        )}
        {item.disabled && <span className="nav-badge nav-badge-secondary">Soon</span>}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`navigation-menu-desktop ${className}`}>
        {/* Primary Row */}
        <div className="nav-container">
          <div className="nav-header">
            {/* Left: Brand + Domain Switcher + Primary Nav */}
            <div className="nav-left">
              <div className="nav-brand-section">
                <div className="nav-brand-title">Clinical Abstraction</div>
                <DomainSwitcher />
              </div>

              <div className="nav-items-primary">
                {primaryNavigation.map((item) => renderNavItem(item, 'primary'))}
              </div>
            </div>

            {/* Right: User Menu */}
            <div className="nav-user-menu">
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  <User className="user-avatar-icon" />
                </div>
                <div className="user-info">
                  <span className="user-name">{userInfo.name}</span>
                  <span className="user-role">{userInfo.role}</span>
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="dropdown-overlay"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <span className="user-dropdown-name">{userInfo.name}</span>
                      <span className="user-dropdown-role">{userInfo.role}</span>
                      {userInfo.email && (
                        <span className="user-dropdown-email">{userInfo.email}</span>
                      )}
                    </div>
                    <div className="user-dropdown-separator" />
                    <button className="user-dropdown-logout" onClick={onLogout}>
                      <LogOut className="user-dropdown-logout-icon" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Row: Breadcrumbs or Case Navigation */}
        {(breadcrumbs || isCaseView) && (
          <div className="nav-secondary">
            <div className="nav-container">
              {isCaseView && caseContext ? (
                <div className="nav-case-section">
                  <div className="nav-case-header">
                    Patient: {caseContext.patientName} ({caseContext.patientId})
                  </div>
                  <div className="nav-items-case">
                    {caseNavigation.map((item) => renderNavItem(item, 'case'))}
                  </div>
                </div>
              ) : breadcrumbs && breadcrumbs.length > 0 ? (
                <div className="nav-breadcrumbs">
                  <Home className="breadcrumb-home-icon" />
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight className="breadcrumb-separator" />
                      {crumb.path ? (
                        <button
                          onClick={() => onNavigate(crumb.path!)}
                          className="breadcrumb-link"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="breadcrumb-current">{crumb.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Navigation */}
      <nav className="navigation-menu-mobile">
        <div className="mobile-header">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="mobile-menu-icon" />
          </button>

          <div className="mobile-brand">
            <span className="mobile-brand-text">Clinical Abstraction</span>
            <DomainSwitcher />
          </div>

          <button
            className="mobile-user-button"
            onClick={() => setUserMenuOpen(true)}
            aria-label="User menu"
          >
            <User className="mobile-user-icon" />
          </button>
        </div>

        {/* Mobile breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mobile-breadcrumbs-container">
            <div className="mobile-breadcrumbs">
              <Home className="mobile-breadcrumb-home" />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="mobile-breadcrumb-separator" />
                  {crumb.path ? (
                    <button
                      onClick={() => onNavigate(crumb.path!)}
                      className="mobile-breadcrumb-link"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="mobile-breadcrumb-current">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Slide-in Menu */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-panel">
            <div className="mobile-panel-content">
              {/* Header */}
              <div className="mobile-panel-header">
                <span className="mobile-panel-title">Menu</span>
                <button
                  className="mobile-panel-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="mobile-panel-close-icon" />
                </button>
              </div>

              {/* Menu Content */}
              <div className="mobile-panel-body">
                {/* Domain Switcher */}
                <div className="mobile-panel-section">
                  <DomainSwitcher />
                </div>

                {/* Primary Navigation */}
                <div className="mobile-panel-section">
                  <div className="mobile-panel-section-title">Main</div>
                  <div className="mobile-panel-section-items">
                    {primaryNavigation.map((item) => renderNavItem(item, 'mobile'))}
                  </div>
                </div>

                {/* Case Navigation */}
                {isCaseView && caseContext && (
                  <div className="mobile-panel-section">
                    <div className="mobile-panel-section-title">
                      Current Case: {caseContext.patientName}
                    </div>
                    <div className="mobile-panel-section-items">
                      {caseNavigation.map((item) => renderNavItem(item, 'mobile'))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mobile-panel-section">
                  <div className="mobile-panel-section-title">Quick Actions</div>
                  <div className="mobile-panel-section-items">
                    {quickActions.map((item) => renderNavItem(item, 'mobile'))}
                  </div>
                </div>
              </div>

              {/* User Section */}
              <div className="mobile-panel-footer">
                <div className="mobile-panel-user">
                  <div className="mobile-panel-user-avatar">
                    <User className="mobile-panel-user-icon" />
                  </div>
                  <div className="mobile-panel-user-info">
                    <div className="mobile-panel-user-name">{userInfo.name}</div>
                    <div className="mobile-panel-user-role">{userInfo.role}</div>
                  </div>
                </div>
                <button
                  className="mobile-panel-logout"
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="mobile-panel-logout-icon" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default NavigationMenu;
