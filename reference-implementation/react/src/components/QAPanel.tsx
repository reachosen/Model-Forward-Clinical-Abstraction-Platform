/**
 * QA & Guardrails Panel Component
 * Displays QA validation results and issues
 */

import React from 'react';
import { QAResult } from '../types';
import './QAPanel.css';

interface QAPanelProps {
  qaResult: QAResult;
}

const QAPanel: React.FC<QAPanelProps> = ({ qaResult }) => {
  const getStatusClass = (status: string) => {
    return `qa-status-${status.toLowerCase()}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return '✓';
      case 'WARN':
        return '⚠';
      case 'FAIL':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className="qa-panel panel">
      <h2>QA & Guardrails</h2>

      <div className="qa-summary">
        <div className={`qa-status-badge ${getStatusClass(qaResult.qa_status)}`}>
          <span className="status-icon">{getStatusIcon(qaResult.qa_status)}</span>
          <span className="status-text">{qaResult.qa_status}</span>
        </div>
        <div className="qa-score">
          Score: {qaResult.qa_score.toFixed(1)}/100
        </div>
      </div>

      <div className="qa-metrics">
        <div className="metric">
          <span className="metric-label">Rules Evaluated:</span>
          <span className="metric-value">{qaResult.rules_evaluated}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Passed:</span>
          <span className="metric-value passed">{qaResult.rules_passed}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Warnings:</span>
          <span className="metric-value warnings">{qaResult.rules_warnings}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Failed:</span>
          <span className="metric-value failed">{qaResult.rules_failed}</span>
        </div>
      </div>

      {qaResult.rule_details && qaResult.rule_details.length > 0 && (
        <div className="rule-details">
          <h3>Rule Results</h3>
          {qaResult.rule_details.map((rule, idx) => (
            <div key={idx} className={`rule-result ${getStatusClass(rule.status)}`}>
              <div className="rule-header">
                <span className="rule-icon">{getStatusIcon(rule.status)}</span>
                <span className="rule-name">{rule.rule_name.replace(/_/g, ' ')}</span>
              </div>
              <div className="rule-message">{rule.message}</div>
            </div>
          ))}
        </div>
      )}

      {qaResult.validation_errors.length > 0 && (
        <div className="qa-issues">
          <h3>Validation Errors</h3>
          <ul className="issues-list">
            {qaResult.validation_errors.map((error, idx) => (
              <li key={idx} className="issue-item error">⚠ {error}</li>
            ))}
          </ul>
        </div>
      )}

      {qaResult.contradictions.length > 0 && (
        <div className="qa-issues">
          <h3>Contradictions</h3>
          <ul className="issues-list">
            {qaResult.contradictions.map((contradiction, idx) => (
              <li key={idx} className="issue-item contradiction">⚠ {contradiction}</li>
            ))}
          </ul>
        </div>
      )}

      {qaResult.missing_data_fields.length > 0 && (
        <div className="qa-issues">
          <h3>Missing Data</h3>
          <ul className="issues-list">
            {qaResult.missing_data_fields.map((field, idx) => (
              <li key={idx} className="issue-item missing">⚠ {field}</li>
            ))}
          </ul>
        </div>
      )}

      {qaResult.recommended_actions.length > 0 && (
        <div className="qa-recommendations">
          <h3>Recommended Actions</h3>
          <ul className="recommendations-list">
            {qaResult.recommended_actions.map((action, idx) => (
              <li key={idx}>→ {action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QAPanel;
