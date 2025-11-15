/**
 * Case List Page
 * Displays list of available CLABSI cases for review
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CaseInfo } from '../types';
import './CaseListPage.css';

const CaseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseInfo[]>([]);
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

  const handleCaseClick = (patientId: string) => {
    navigate(`/case/${patientId}`);
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
        <h1>CLABSI Cases for Review</h1>
        <p className="description">
          Select a case to view detailed abstraction and provide feedback
        </p>
      </div>

      <div className="cases-grid">
        {cases.map((caseInfo) => (
          <div
            key={caseInfo.patient_id}
            className="case-card"
            onClick={() => handleCaseClick(caseInfo.patient_id)}
          >
            <div className="case-header">
              <h3>{caseInfo.name}</h3>
              <span className="mrn">{caseInfo.mrn}</span>
            </div>
            <div className="case-body">
              <div className="case-field">
                <span className="label">Encounter:</span>
                <span className="value">{caseInfo.encounter_id}</span>
              </div>
              <div className="case-field">
                <span className="label">Scenario:</span>
                <span className="value scenario">{caseInfo.scenario}</span>
              </div>
            </div>
            <div className="case-footer">
              <button className="review-button">Review Case →</button>
            </div>
          </div>
        ))}
      </div>

      {cases.length === 0 && (
        <div className="no-cases">No cases available for review</div>
      )}
    </div>
  );
};

export default CaseListPage;
