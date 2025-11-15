/**
 * Signals Panel Component
 * Displays clinical signals with severity indicators
 */

import React from 'react';
import { Signal } from '../types';
import './SignalsPanel.css';

interface SignalsPanelProps {
  signals: Signal[];
}

const SignalsPanel: React.FC<SignalsPanelProps> = ({ signals }) => {
  const getSeverityClass = (severity: string) => {
    return `severity-${severity.toLowerCase()}`;
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Group signals by severity
  const criticalSignals = signals.filter(s => s.severity === 'CRITICAL');
  const warningSignals = signals.filter(s => s.severity === 'WARNING');
  const infoSignals = signals.filter(s => s.severity === 'INFO');

  const SignalGroup: React.FC<{ title: string; signals: Signal[]; className: string }> = ({
    title,
    signals,
    className,
  }) => {
    if (signals.length === 0) return null;

    return (
      <div className={`signal-group ${className}`}>
        <h3>{title} ({signals.length})</h3>
        <div className="signals-list">
          {signals.map((signal) => (
            <div key={signal.signal_id} className="signal-card">
              <div className="signal-header">
                <span className={`signal-badge ${getSeverityClass(signal.severity)}`}>
                  {signal.signal_type}
                </span>
                <span className="signal-confidence">{formatConfidence(signal.confidence)}</span>
              </div>
              <div className="signal-name">{signal.signal_name.replace(/_/g, ' ')}</div>
              <div className="signal-value">{signal.value}</div>
              <div className="signal-rationale">{signal.rationale}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="signals-panel panel">
      <h2>Clinical Signals</h2>

      <SignalGroup title="Critical Signals" signals={criticalSignals} className="critical-group" />
      <SignalGroup title="Warning Signals" signals={warningSignals} className="warning-group" />
      <SignalGroup title="Information Signals" signals={infoSignals} className="info-group" />

      {signals.length === 0 && (
        <div className="no-data">No signals detected</div>
      )}
    </div>
  );
};

export default SignalsPanel;
