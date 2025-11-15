/**
 * Case Overview Panel Component
 * Displays patient demographics and high-level case information
 */

import React from 'react';
import { AbstractionSummary, CaseInfo } from '../types';
import { useDomainConfig } from '../contexts/DomainConfigContext';
import './CaseOverview.css';

interface CaseOverviewProps {
  summary: AbstractionSummary;
  caseInfo: CaseInfo;
}

const CaseOverview: React.FC<CaseOverviewProps> = ({ summary, caseInfo }) => {
  const { config } = useDomainConfig();
  const getRiskBadgeClass = (risk: string) => {
    const baseClass = 'risk-badge';
    switch (risk) {
      case 'CRITICAL':
        return `${baseClass} risk-critical`;
      case 'HIGH':
        return `${baseClass} risk-high`;
      case 'MODERATE':
        return `${baseClass} risk-moderate`;
      default:
        return `${baseClass} risk-low`;
    }
  };

  return (
    <div className="case-overview panel">
      <h2>Case Overview</h2>

      <div className="demographics">
        <div className="demo-row">
          <span className="label">MRN:</span>
          <span className="value">{summary.mrn}</span>
        </div>
        <div className="demo-row">
          <span className="label">Age:</span>
          <span className="value">{summary.age} years</span>
        </div>
        <div className="demo-row">
          <span className="label">Gender:</span>
          <span className="value">{summary.gender}</span>
        </div>
        <div className="demo-row">
          <span className="label">Scenario:</span>
          <span className="value">{caseInfo.scenario}</span>
        </div>
      </div>

      <div className="risk-assessment">
        <h3>Risk Assessment</h3>
        <div className="risk-summary">
          <span className={getRiskBadgeClass(summary.risk_level)}>
            {summary.risk_level}
          </span>
          <span className="risk-score">
            Score: {summary.risk_score.toFixed(1)}/100
          </span>
        </div>

        <div className="determination">
          <div className="determination-row">
            <span className="label">{config.determination_label}:</span>
            <span className={`value ${summary.likely_clabsi ? 'yes' : 'no'}`}>
              {summary.likely_clabsi ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="determination-row">
            <span className="label">Confidence:</span>
            <span className="value">
              {(summary.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="determination-row">
            <span className="label">Meets Criteria:</span>
            <span className={`value ${summary.meets_nhsn_criteria ? 'yes' : 'no'}`}>
              {summary.meets_nhsn_criteria ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>

      <div className="key-findings">
        <h3>Key Findings</h3>
        <ul>
          {summary.key_findings.map((finding, idx) => (
            <li key={idx}>{finding}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CaseOverview;
