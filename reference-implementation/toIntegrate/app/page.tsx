"use client"

import * as React from "react"
import { NavigationMenu } from "@/components/navigation-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const [currentPath, setCurrentPath] = React.useState('/')
  const [currentDomain, setCurrentDomain] = React.useState('CLABSI')

  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path)
    setCurrentPath(path)
  }

  const handleDomainChange = (domain: string) => {
    console.log('Switch domain to:', domain)
    setCurrentDomain(domain)
  }

  const handleLogout = () => {
    console.log('Logout')
  }

  // Example 1: Simple navigation (no breadcrumbs, no case context)
  const simpleExample = (
    <div className="min-h-screen bg-background">
      <NavigationMenu
        currentPath="/"
        userInfo={{
          name: 'Dr. Sarah Johnson',
          role: 'Clinical Abstractor',
          email: 'sarah.johnson@hospital.com',
        }}
        currentDomain={currentDomain}
        onNavigate={handleNavigate}
        onDomainChange={handleDomainChange}
        onLogout={handleLogout}
      />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Cases Overview</CardTitle>
            <CardDescription>Browse and filter all clinical cases</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This demonstrates the navigation menu on the main Cases page with no contextual navigation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // Example 2: Case view with contextual navigation
  const caseExample = (
    <div className="min-h-screen bg-background">
      <NavigationMenu
        currentPath="/case/PAT-001"
        userInfo={{
          name: 'Dr. Sarah Johnson',
          role: 'Clinical Abstractor',
          email: 'sarah.johnson@hospital.com',
        }}
        currentDomain={currentDomain}
        onNavigate={handleNavigate}
        onDomainChange={handleDomainChange}
        onLogout={handleLogout}
        caseContext={{
          patientId: 'PAT-001',
          patientName: 'John Smith',
        }}
      />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient: John Smith (PAT-001)</CardTitle>
            <CardDescription>View patient case details with contextual navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This demonstrates the navigation menu when viewing a specific case. Notice the secondary navigation bar
              with Overview, Timeline, Signals, Ask the Case, Rule Evaluation, and Feedback tabs.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // Example 3: Breadcrumb navigation
  const breadcrumbExample = (
    <div className="min-h-screen bg-background">
      <NavigationMenu
        currentPath="/settings"
        userInfo={{
          name: 'Dr. Sarah Johnson',
          role: 'Clinical Abstractor',
          email: 'sarah.johnson@hospital.com',
        }}
        currentDomain={currentDomain}
        onNavigate={handleNavigate}
        onDomainChange={handleDomainChange}
        onLogout={handleLogout}
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Settings' },
        ]}
      />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure application preferences with breadcrumb navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This demonstrates the navigation menu with breadcrumbs showing the current location hierarchy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return caseExample // Change to simpleExample or breadcrumbExample to see different views
}
