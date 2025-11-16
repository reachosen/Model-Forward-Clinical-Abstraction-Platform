/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { DomainConfigProvider, useDomainConfig } from './contexts/DomainConfigContext';
import NavigationMenu, { type BreadcrumbItem, type CaseContext } from './components/NavigationMenu';
import CaseListPage from './pages/CaseListPage';
import CaseViewPage from './pages/CaseViewPage';
import RuleEvaluationPage from './pages/RuleEvaluationPage';
import './App.css';

const AppContent: React.FC = () => {
  const { config, loading, setDomain } = useDomainConfig();
  const location = useLocation();
  const navigate = useNavigate();

  // Sample user info (in a real app, this would come from auth context)
  const userInfo = {
    name: 'Dr. Sarah Johnson',
    role: 'Clinical Abstractor',
    email: 'sarah.johnson@hospital.com',
  };

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] | undefined => {
    const path = location.pathname;

    if (path === '/') {
      return undefined; // No breadcrumbs on home page
    }

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

    if (path === '/analytics') {
      return [
        { label: 'Cases', path: '/' },
        { label: 'Analytics' },
      ];
    }

    if (path === '/settings') {
      return [
        { label: 'Cases', path: '/' },
        { label: 'Settings' },
      ];
    }

    return undefined;
  };

  // Determine case context
  const getCaseContext = (): CaseContext | undefined => {
    const path = location.pathname;
    if (path.startsWith('/case/') || path.startsWith('/rules/')) {
      const patientId = path.split('/')[2];
      // In a real app, this would fetch the patient name from the case data
      return {
        patientId,
        patientName: `Patient ${patientId}`,
      };
    }
    return undefined;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleDomainChange = (domain: string) => {
    setDomain(domain);
  };

  const handleLogout = () => {
    // In a real app, this would handle logout logic
    console.log('Logout clicked');
    alert('Logout functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="app-loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <NavigationMenu
        currentPath={location.pathname}
        userInfo={userInfo}
        currentDomain={config.domain_name}
        onNavigate={handleNavigate}
        onDomainChange={handleDomainChange}
        onLogout={handleLogout}
        breadcrumbs={generateBreadcrumbs()}
        caseContext={getCaseContext()}
      />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<CaseListPage />} />
          <Route path="/case/:patientId" element={<CaseViewPage />} />
          <Route path="/rules/:patientId" element={<RuleEvaluationPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>Reference Implementation - Model-Forward Clinical Abstraction Platform</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DomainConfigProvider initialDomain="CLABSI">
      <Router>
        <AppContent />
      </Router>
    </DomainConfigProvider>
  );
};

export default App;
