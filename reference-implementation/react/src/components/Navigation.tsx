/**
 * Navigation - Latest from Vercel (Nov 18 00:37)
 * Modern app-wide navigation with Home, Cases, Demo links
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Beaker, Settings, History } from 'lucide-react';
import './Navigation.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    description: "Concern selection and case overview"
  },
  {
    label: "Cases",
    href: "/cases",
    icon: FolderOpen,
    description: "Browse and filter cases"
  },
  {
    label: "Demo",
    href: "/case/clabsi_demo_001",
    icon: Beaker,
    description: "Interactive CLABSI demo"
  },
  {
    label: "Task History",
    href: "#",
    icon: History,
    description: "Coming soon",
    disabled: true
  },
  {
    label: "Admin",
    href: "/admin/prompts",
    icon: Settings,
    description: "Prompt Explorer - View concerns, tasks, and prompt versions",
    disabled: false
  }
];

export function Navigation() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        <div className="nav-content">
          {/* Logo/Brand */}
          <Link to="/" className="nav-brand">
            <div className="brand-icon">
              CA
            </div>
            <span className="brand-text">CA Factory</span>
          </Link>

          {/* Navigation Links */}
          <div className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.disabled ? "#" : item.href}
                  className={`nav-link ${active ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                  aria-disabled={item.disabled}
                  onClick={(e) => item.disabled && e.preventDefault()}
                  title={item.description}
                >
                  <Icon className="nav-link-icon" />
                  <span className="nav-link-text">{item.label}</span>
                  {item.disabled && (
                    <span className="nav-link-badge">
                      (Soon)
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
