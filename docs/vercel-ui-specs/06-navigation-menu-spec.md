# Navigation Menu Component Specification

## Component Overview
A responsive navigation menu for the Clinical Abstraction Platform that provides easy access to all major sections of the application. The menu should work on desktop, tablet, and mobile devices with a clean, professional medical application aesthetic.

## Requirements

### Functional Requirements
1. Display all main navigation links
2. Highlight the currently active page/section
3. Responsive design with hamburger menu for mobile
4. User profile section with logout option
5. Support for notification badges (optional counts)
6. Collapsible on mobile devices
7. Persist open/closed state in localStorage (mobile)

### Visual Requirements
1. Clean, modern healthcare application design
2. Clear visual hierarchy
3. Accessible color contrast (WCAG AA compliant)
4. Smooth animations for mobile menu open/close
5. Icons for each navigation item
6. Active state clearly visible
7. Hover states for interactive elements

## TypeScript Interfaces

```typescript
interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string; // Icon name from lucide-react
  badge?: number; // Optional notification count
  disabled?: boolean;
}

interface UserInfo {
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

interface NavigationMenuProps {
  currentPath: string;
  userInfo: UserInfo;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  className?: string;
}
```

## Component Structure

### Desktop Layout (>768px)
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Clinical Abstraction Platform    [User] John Doe ▼  │
├─────────────────────────────────────────────────────────────┤
│ [🏠 Dashboard] [📋 Cases] [📊 Analytics] [⚙️ Settings]      │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)
```
┌─────────────────────────────────────────┐
│ [☰] Clinical Abstraction    [User Icon] │
└─────────────────────────────────────────┘

When hamburger clicked:
┌─────────────────────────────────────────┐
│ [✕] Clinical Abstraction    [User Icon] │
├─────────────────────────────────────────┤
│                                         │
│  🏠 Dashboard                           │
│  📋 Cases                        (3)    │
│  📊 Analytics                           │
│  ⚙️ Settings                            │
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
--badge-bg: #dc2626
--badge-text: #ffffff
--mobile-overlay: rgba(0, 0, 0, 0.5)
```

### Typography
- Logo/Brand: 1.25rem (20px), font-weight: 700
- Navigation Items: 0.9375rem (15px), font-weight: 500
- User Name: 0.875rem (14px), font-weight: 600
- User Role: 0.75rem (12px), font-weight: 400

### Spacing
- Desktop nav height: 64px
- Mobile nav height: 56px
- Horizontal padding: 1rem (mobile), 1.5rem (desktop)
- Gap between nav items: 0.5rem
- Mobile menu padding: 1rem

### Component States

#### Default Navigation Item
- Background: transparent
- Text color: #374151
- Border: none

#### Hover Navigation Item
- Background: #f9fafb
- Text color: #111827
- Cursor: pointer

#### Active Navigation Item
- Background: #eff6ff
- Text color: #3b82f6
- Border-left: 4px solid #3b82f6 (mobile)
- Border-bottom: 3px solid #3b82f6 (desktop)

#### Disabled Navigation Item
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects

## Sample Data

```typescript
const sampleNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'Home',
  },
  {
    id: 'cases',
    label: 'Cases',
    path: '/cases',
    icon: 'FileText',
    badge: 3, // 3 new cases pending review
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: 'BarChart3',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: 'Calendar',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: 'FileBarChart',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
  },
];

const sampleUserInfo: UserInfo = {
  name: 'John Doe',
  role: 'Clinical Abstractor',
  email: 'john.doe@hospital.com',
};
```

## Component Implementation Example

```tsx
import React, { useState, useEffect } from 'react';
import {
  Home,
  FileText,
  BarChart3,
  Calendar,
  FileBarChart,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import './NavigationMenu.css';

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  currentPath,
  userInfo,
  onNavigate,
  onLogout,
  className = '',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Icon mapping
  const iconMap = {
    Home, FileText, BarChart3, Calendar, FileBarChart, Settings,
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  return (
    <nav className={`navigation-menu ${className}`}>
      {/* Desktop/Tablet Header */}
      <div className="nav-header">
        <div className="nav-brand">
          <span className="brand-logo">🏥</span>
          <span className="brand-text">Clinical Abstraction</span>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Desktop Navigation Items */}
        <div className="nav-items desktop-only">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => !item.disabled && handleNavigate(item.path)}
                disabled={item.disabled}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop User Menu */}
        <div className="user-menu desktop-only">
          <button
            className="user-menu-trigger"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="user-avatar">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt={userInfo.name} />
              ) : (
                <User className="avatar-icon" />
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{userInfo.name}</span>
              <span className="user-role">{userInfo.role}</span>
            </div>
            <ChevronDown className="dropdown-icon" />
          </button>

          {isUserMenuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <p className="user-dropdown-name">{userInfo.name}</p>
                {userInfo.email && (
                  <p className="user-dropdown-email">{userInfo.email}</p>
                )}
              </div>
              <button className="logout-button" onClick={onLogout}>
                <LogOut className="logout-icon" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile User Icon */}
        <button className="mobile-user-icon mobile-only">
          <User />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={toggleMobileMenu} />
      )}

      {/* Mobile Navigation Panel */}
      <div className={`mobile-nav-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-items">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.id}
                className={`mobile-nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => !item.disabled && handleNavigate(item.path)}
                disabled={item.disabled}
              >
                <Icon className="mobile-nav-icon" />
                <span className="mobile-nav-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="mobile-nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mobile-user-section">
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt={userInfo.name} />
              ) : (
                <User className="mobile-avatar-icon" />
              )}
            </div>
            <div>
              <p className="mobile-user-name">{userInfo.name}</p>
              <p className="mobile-user-role">{userInfo.role}</p>
            </div>
          </div>
          <button className="mobile-logout-button" onClick={onLogout}>
            <LogOut className="mobile-logout-icon" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationMenu;
```

## Styling Guidelines

### Desktop Navigation
- Fixed top bar (position: sticky or fixed)
- White background with subtle bottom border
- Horizontal layout for nav items
- Items have rounded hover states
- Active item has bottom border accent

### Mobile Navigation
- Fixed top header
- Slide-in panel from left or right
- Full-height overlay when open
- Smooth transform/transition animations
- Touch-friendly tap targets (min 44x44px)

### Accessibility Requirements
1. Keyboard navigation support (Tab, Enter, Escape)
2. ARIA labels for icon-only buttons
3. Focus visible states
4. Screen reader announcements for active page
5. Semantic HTML (nav, button, etc.)

## Interaction Behaviors

### Desktop
1. Click nav item → navigate to path
2. Click user menu → toggle dropdown
3. Click outside user dropdown → close dropdown
4. Hover nav items → show hover state

### Mobile
1. Click hamburger → open/slide-in menu panel
2. Click overlay → close menu
3. Click nav item → navigate and close menu
4. Swipe left on panel → close menu (optional enhancement)

## Animation Specifications

```css
/* Mobile menu slide-in */
transition: transform 300ms ease-in-out;

/* Hover states */
transition: background-color 150ms ease, color 150ms ease;

/* Badge pulse (optional) */
animation: pulse 2s infinite;
```

## Responsive Breakpoints

- Mobile: < 768px (hamburger menu)
- Tablet/Desktop: ≥ 768px (horizontal menu)

## Additional Features (Optional Enhancements)

1. **Search Bar**: Add global search in navigation
2. **Notifications Panel**: Expandable notifications dropdown
3. **Breadcrumbs**: Show current location hierarchy
4. **Theme Toggle**: Light/dark mode switcher
5. **Quick Actions**: Frequently used actions in nav bar

## Integration Notes

- Component should work with React Router for navigation
- User info should come from authentication context/state
- Navigation items can be configured via props or config file
- Support for role-based item visibility (future enhancement)

## Testing Scenarios

1. ✅ Navigation items render correctly
2. ✅ Active state highlights current page
3. ✅ Mobile menu opens/closes properly
4. ✅ User dropdown works on desktop
5. ✅ Badge counts display correctly
6. ✅ Disabled items are not clickable
7. ✅ Logout function is called on click
8. ✅ Responsive layout switches at breakpoint
9. ✅ Keyboard navigation works
10. ✅ Screen reader announcements are correct

## Design References

Look similar to:
- Modern SaaS application navigation
- Clean healthcare/medical software UI
- Material Design navigation patterns
- Apple Human Interface Guidelines for navigation

Focus on:
- Professional medical application aesthetic
- Clean, uncluttered design
- Easy-to-read typography
- Intuitive iconography
- Smooth, polished interactions
