/**
 * Case List Page
 * Displays list of available cases for review
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CaseInfo } from '../types';
import { useDomainConfig } from '../contexts/DomainConfigContext';
import SearchFilterPanel from '../components/SearchFilterPanel';
import { CaseCard } from '../components/CaseCard';
import './CaseListPage.css';

const CaseListPage: React.FC = () => {
  const { config } = useDomainConfig();
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getCases();
      setCases(data.cases);
    } catch (err) {
      setError('Failed to load cases. Please try again.');
      console.error('Error loading cases:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="case-list-page"><div className="loading">Loading cases...</div></div>;
  }

  if (error) {
    return (
      <div className="case-list-page">
        <div className="error">
          {error}
          <button onClick={loadCases}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="case-list-page">
      <div className="page-header">
        <h1>{config.domain_name} Cases for Review</h1>
        <p className="description">
          {config.short_description} - Select a case to view detailed abstraction and provide feedback
        </p>
      </div>

      <div className="case-list-layout">
        {/* Search & Filter Sidebar */}
        <aside className="filter-sidebar">
          <SearchFilterPanel
            cases={cases}
            onFilteredCasesChange={setFilteredCases}
          />
        </aside>

        {/* Cases Grid */}
        <div className="cases-content">
          <div className="cases-grid">
            {filteredCases.map((caseInfo) => (
              <CaseCard
                key={caseInfo.patient_id}
                caseSummary={{
                  case_id: caseInfo.patient_id,
                  concern_id: caseInfo.domain || 'CLABSI',
                  patient_summary: `${caseInfo.name} (${caseInfo.mrn}) - ${caseInfo.scenario}`,
                  latest_task_state: {
                    stage: 'abstraction',
                    status: caseInfo.status?.toLowerCase() || 'pending',
                    version: 'v1',
                    timestamp: caseInfo.abstraction_datetime || new Date().toISOString()
                  },
                  risk_level: caseInfo.risk_level,
                  flags: []
                }}
              />
            ))}
          </div>

          {filteredCases.length === 0 && cases.length > 0 && (
            <div className="no-cases">No cases match your filters</div>
          )}

          {cases.length === 0 && (
            <div className="no-cases">No cases available for review</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseListPage;
