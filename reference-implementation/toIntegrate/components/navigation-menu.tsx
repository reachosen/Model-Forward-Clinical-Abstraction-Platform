"use client"

import * as React from "react"
import { FolderOpen, BarChart3, Settings, Eye, Clock, Activity, MessageSquare, CheckSquare, Send, Plus, Search, Menu, X, User, LogOut, ChevronRight, Home, Type as type, LucideIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DomainSwitcher } from "@/components/domain-switcher"
import { cn } from "@/lib/utils"
import {
  NavigationMenuProps,
  NavigationItem,
  BreadcrumbItem,
  primaryNavigation,
  caseNavigation,
  quickActions,
} from "@/lib/navigation-types"

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
}

export function NavigationMenu({
  currentPath,
  userInfo,
  currentDomain,
  onNavigate,
  onDomainChange,
  onLogout,
  breadcrumbs,
  caseContext,
  className,
}: NavigationMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  // Determine if we're in a case view
  const isCaseView = Boolean(caseContext)

  // Replace :patientId in paths with actual patient ID
  const resolvePath = (path: string) => {
    if (caseContext) {
      return path.replace(':patientId', caseContext.patientId)
    }
    return path
  }

  // Check if a nav item is active
  const isActive = (path: string) => {
    const resolvedPath = resolvePath(path)
    if (resolvedPath.includes('#')) {
      return currentPath === resolvedPath.split('#')[0] && window.location.hash === `#${resolvedPath.split('#')[1]}`
    }
    return currentPath === resolvedPath
  }

  // Handle navigation
  const handleNavigate = (path: string) => {
    const resolvedPath = resolvePath(path)
    onNavigate(resolvedPath)
    setMobileMenuOpen(false)
  }

  // Render navigation item
  const renderNavItem = (item: NavigationItem, variant: 'primary' | 'case' | 'mobile' = 'primary') => {
    const Icon = iconMap[item.icon]
    const active = isActive(item.path)
    const resolvedPath = resolvePath(item.path)

    if (variant === 'mobile') {
      return (
        <button
          key={item.id}
          onClick={() => !item.disabled && handleNavigate(item.path)}
          disabled={item.disabled}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
            active && "bg-accent text-accent-foreground",
            !active && !item.disabled && "hover:bg-muted text-foreground",
            item.disabled && "opacity-50 cursor-not-allowed text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{item.label}</span>
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
              {item.badge}
            </Badge>
          )}
          {item.disabled && (
            <Badge variant="secondary" className="text-xs">
              Soon
            </Badge>
          )}
        </button>
      )
    }

    if (variant === 'case') {
      return (
        <button
          key={item.id}
          onClick={() => handleNavigate(item.path)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
            active
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
        </button>
      )
    }

    // Primary navigation
    return (
      <button
        key={item.id}
        onClick={() => !item.disabled && handleNavigate(item.path)}
        disabled={item.disabled}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 text-[15px] font-medium rounded-md transition-colors",
          active && "bg-accent text-accent-foreground",
          !active && !item.disabled && "text-foreground hover:bg-muted/50",
          item.disabled && "opacity-50 cursor-not-allowed text-muted-foreground"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
            {item.badge}
          </Badge>
        )}
        {item.disabled && (
          <Badge variant="secondary" className="text-xs ml-1">
            Soon
          </Badge>
        )}
      </button>
    )
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={cn("hidden md:block border-b bg-background", className)}>
        {/* Primary Row */}
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between gap-6">
            {/* Left: Brand + Domain Switcher + Primary Nav */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold text-foreground">
                  Clinical Abstraction
                </div>
                <DomainSwitcher
                  currentDomain={currentDomain}
                  onDomainChange={onDomainChange}
                />
              </div>

              <div className="flex items-center gap-1">
                {primaryNavigation.map((item) => renderNavItem(item, 'primary'))}
              </div>
            </div>

            {/* Right: User Menu */}
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-semibold">{userInfo.name}</span>
                    <span className="text-xs text-muted-foreground">{userInfo.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{userInfo.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{userInfo.role}</span>
                    {userInfo.email && (
                      <span className="text-xs font-normal text-muted-foreground">{userInfo.email}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Row: Breadcrumbs or Case Navigation */}
        {(breadcrumbs || isCaseView) && (
          <div className="border-t bg-muted/30">
            <div className="container mx-auto px-6">
              {isCaseView ? (
                <div className="py-2">
                  <div className="text-sm font-semibold text-foreground mb-2">
                    Patient: {caseContext.patientName} ({caseContext.patientId})
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {caseNavigation.map((item) => renderNavItem(item, 'case'))}
                  </div>
                </div>
              ) : breadcrumbs && breadcrumbs.length > 0 ? (
                <div className="flex items-center gap-2 py-3 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      {crumb.path ? (
                        <button
                          onClick={() => onNavigate(crumb.path!)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="font-medium text-foreground">{crumb.label}</span>
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
      <nav className="md:hidden border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Clinical Abstraction</span>
            <DomainSwitcher
              currentDomain={currentDomain}
              onDomainChange={onDomainChange}
              className="h-8 text-xs"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUserMenuOpen(true)}
            aria-label="User menu"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-t px-4 py-2">
            <div className="flex items-center gap-1 text-xs overflow-x-auto">
              <Home className="h-3 w-3 text-muted-foreground shrink-0" />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  {crumb.path ? (
                    <button
                      onClick={() => onNavigate(crumb.path!)}
                      className="text-muted-foreground hover:text-foreground whitespace-nowrap"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-medium text-foreground whitespace-nowrap">{crumb.label}</span>
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
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-background shadow-xl md:hidden overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-4">
                <span className="text-lg font-bold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Domain Switcher */}
                <div>
                  <DomainSwitcher
                    currentDomain={currentDomain}
                    onDomainChange={onDomainChange}
                    className="w-full"
                  />
                </div>

                {/* Primary Navigation */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Main
                  </div>
                  <div className="space-y-1">
                    {primaryNavigation.map((item) => renderNavItem(item, 'mobile'))}
                  </div>
                </div>

                {/* Case Navigation */}
                {isCaseView && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Current Case: {caseContext.patientName}
                    </div>
                    <div className="space-y-1">
                      {caseNavigation.map((item) => renderNavItem(item, 'mobile'))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Quick Actions
                  </div>
                  <div className="space-y-1">
                    {quickActions.map((item) => renderNavItem(item, 'mobile'))}
                  </div>
                </div>
              </div>

              {/* User Section */}
              <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{userInfo.name}</div>
                    <div className="text-xs text-muted-foreground">{userInfo.role}</div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => {
                    onLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
