/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CaseListPage from './pages/CaseListPage';
import CaseViewPage from './pages/CaseViewPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>🏥 CLABSI Clinical Abstraction Platform</h1>
          <p className="subtitle">Model-Forward Clinical Decision Support</p>
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
    </Router>
  );
};

export default App;
