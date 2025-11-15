/**
 * Signals Panel Component
 * Displays clinical signals grouped by type with collapsible sections
 */

import React, { useState } from 'react';
import { Signal } from '../types';
import './SignalsPanel.css';

interface SignalsPanelProps {
  signals: Signal[];
}

const SignalsPanel: React.FC<SignalsPanelProps> = ({ signals }) => {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['DEVICE', 'LAB', 'VITAL', 'MEDICATION', 'PROCEDURE'])
  );

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getSeverityClass = (severity: string) => {
    return `severity-${severity.toLowerCase()}`;
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Signal groups configuration
  const signalGroups = [
    { id: 'DEVICE', label: 'Device Exposure Signals', icon: '🔌' },
    { id: 'LAB', label: 'Laboratory Findings', icon: '🧪' },
    { id: 'VITAL', label: 'Clinical Symptoms', icon: '❤️' },
    { id: 'MEDICATION', label: 'Medication Signals', icon: '💊' },
    { id: 'PROCEDURE', label: 'Procedural Signals', icon: '🏥' },
  ];

  // Group signals by type
  const groupedSignals = signalGroups.map(group => ({
    ...group,
    signals: signals.filter(s => s.signal_type === group.id),
  })).filter(group => group.signals.length > 0);

  // Count critical signals per group
  const getCriticalCount = (groupSignals: Signal[]) => {
    return groupSignals.filter(s => s.severity === 'CRITICAL').length;
  };

  const SignalCard: React.FC<{ signal: Signal }> = ({ signal }) => (
    <div className={`signal-card ${getSeverityClass(signal.severity)}`}>
      <div className="signal-header">
        <div className="signal-badges">
          <span className={`signal-severity-badge ${getSeverityClass(signal.severity)}`}>
            {signal.severity}
          </span>
          <span className="signal-confidence">{formatConfidence(signal.confidence)}</span>
        </div>
      </div>
      <div className="signal-name">{signal.signal_name.replace(/_/g, ' ')}</div>
      <div className="signal-value"><strong>Value:</strong> {signal.value}</div>
      <div className="signal-rationale">{signal.rationale}</div>
      <div className="signal-timestamp">
        <small>Recorded: {new Date(signal.timestamp).toLocaleString()}</small>
      </div>
    </div>
  );

  const SignalGroup: React.FC<{
    group: typeof signalGroups[0] & { signals: Signal[] }
  }> = ({ group }) => {
    const isExpanded = expandedGroups.has(group.id);
    const criticalCount = getCriticalCount(group.signals);

    return (
      <div className="signal-group">
        <div
          className="signal-group-header"
          onClick={() => toggleGroup(group.id)}
        >
          <div className="group-header-left">
            <span className="group-icon">{group.icon}</span>
            <span className="group-label">{group.label}</span>
            <span className="group-count">({group.signals.length})</span>
            {criticalCount > 0 && (
              <span className="critical-count-badge">{criticalCount} critical</span>
            )}
          </div>
          <div className="group-header-right">
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="signal-group-content">
            {group.signals.map((signal) => (
              <SignalCard key={signal.signal_id} signal={signal} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="signals-panel panel">
      <div className="panel-header">
        <h2>Clinical Signals</h2>
        <div className="panel-actions">
          <button
            className="btn-expand-all"
            onClick={() => {
              if (expandedGroups.size === groupedSignals.length) {
                setExpandedGroups(new Set());
              } else {
                setExpandedGroups(new Set(groupedSignals.map(g => g.id)));
              }
            }}
          >
            {expandedGroups.size === groupedSignals.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      <div className="signals-groups">
        {groupedSignals.map((group) => (
          <SignalGroup key={group.id} group={group} />
        ))}
      </div>

      {signals.length === 0 && (
        <div className="no-data">No signals detected</div>
      )}
    </div>
  );
};

export default SignalsPanel;
