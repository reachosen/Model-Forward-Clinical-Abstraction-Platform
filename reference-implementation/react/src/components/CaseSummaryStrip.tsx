/**
 * Case Summary Strip - 80/20 Overview
 * Compact header showing key facts for quick assessment
 */

import React from 'react';
import { AbstractionSummary, Signal } from '../types';
import './CaseSummaryStrip.css';

interface CaseSummaryStripProps {
  summary: AbstractionSummary;
  signals: Signal[];
  qaAnswered?: number;
  qaTotal?: number;
}

const CaseSummaryStrip: React.FC<CaseSummaryStripProps> = ({
  summary,
  signals,
  qaAnswered = 0,
  qaTotal = 0
}) => {
  // Get top 3 critical signals
  const topSignals = signals
    .filter(s => s.severity === 'CRITICAL')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const getRiskBadgeClass = (risk: string) => {
    return `risk-badge risk-${risk.toLowerCase()}`;
  };

  const getStatusBadgeClass = () => {
    if (summary.likely_clabsi) return 'status-badge status-positive';
    return 'status-badge status-negative';
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  const getQAProgress = () => {
    if (qaTotal === 0) return 100;
    return Math.round((qaAnswered / qaTotal) * 100);
  };

  return (
    <div className="case-summary-strip">
      <div className="summary-strip-content">
        {/* Left: Risk and Determination */}
        <div className="summary-section summary-primary">
          <div className={getRiskBadgeClass(summary.risk_level)}>
            {summary.risk_level} RISK
          </div>

          <div className="determination">
            <div className={getStatusBadgeClass()}>
              {summary.likely_clabsi ? 'Likely CLABSI' : 'Unlikely CLABSI'}
            </div>
            <div className="confidence-indicator">
              {formatConfidence(summary.confidence)} confidence
            </div>
          </div>
        </div>

        {/* Middle: Top Critical Signals */}
        <div className="summary-section summary-signals">
          <div className="section-label">Critical Signals:</div>
          <div className="signal-chips">
            {topSignals.length > 0 ? (
              topSignals.map(signal => (
                <div key={signal.signal_id} className="signal-chip">
                  <span className="chip-label">{signal.signal_name.replace(/_/g, ' ')}</span>
                  <span className="chip-value">{signal.value}</span>
                </div>
              ))
            ) : (
              <div className="no-signals">No critical signals</div>
            )}
          </div>
        </div>

        {/* Right: Q&A Status */}
        {qaTotal > 0 && (
          <div className="summary-section summary-qa">
            <div className="section-label">Q&A Status:</div>
            <div className="qa-status">
              <div className="qa-count">
                {qaAnswered}/{qaTotal} answered
              </div>
              <div className="qa-progress-bar">
                <div
                  className="qa-progress-fill"
                  style={{ width: `${getQAProgress()}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseSummaryStrip;
