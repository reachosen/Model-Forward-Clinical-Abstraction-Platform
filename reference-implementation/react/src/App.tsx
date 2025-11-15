/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DomainConfigProvider, useDomainConfig } from './contexts/DomainConfigContext';
import DomainSwitcher from './components/DomainSwitcher';
import CaseListPage from './pages/CaseListPage';
import CaseViewPage from './pages/CaseViewPage';
import './App.css';

const AppContent: React.FC = () => {
  const { config, loading } = useDomainConfig();

  if (loading) {
    return (
      <div className="app">
        <div className="app-loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏥 {config.display_name} Platform</h1>
            <p className="subtitle">Model-Forward Clinical Decision Support</p>
          </div>
          <div className="header-right">
            <DomainSwitcher />
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<CaseListPage />} />
          <Route path="/case/:patientId" element={<CaseViewPage />} />
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
