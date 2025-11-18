/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DomainConfigProvider, useDomainConfig } from './contexts/DomainConfigContext';
import { Navigation } from './components/Navigation';
import CaseListPage from './pages/CaseListPage';
import CaseViewPage from './pages/CaseViewPage';
import RuleEvaluationPage from './pages/RuleEvaluationPage';
import './App.css';

const AppContent: React.FC = () => {
  const { loading } = useDomainConfig();

  if (loading) {
    return (
      <div className="app">
        <div className="app-loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navigation />

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
