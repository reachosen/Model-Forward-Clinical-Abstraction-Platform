/**
 * Signals Panel Component
 * Displays clinical signals grouped by type with collapsible sections
 * Updated to support enrichment signal_groups from structured cases
 */

import React, { useState } from 'react';
import { Signal, SignalGroup as SignalGroupType } from '../types';
import EvidenceDrawer from './EvidenceDrawer';
import './SignalsPanel.css';

interface SignalsPanelProps {
  signals?: Signal[];
  signalGroups?: SignalGroupType[]; // Optional: from enrichment section
}

const SignalsPanel: React.FC<SignalsPanelProps> = ({ signals, signalGroups }) => {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['DEVICE', 'LAB', 'VITAL', 'MEDICATION', 'PROCEDURE', 'device', 'lab', 'vital_sign', 'medication', 'procedure'])
  );

  // Track selected signal for evidence drawer
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

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

  // Signal groups configuration for legacy format
  const signalGroupsConfig = [
    { id: 'DEVICE', label: 'Device Exposure Signals', icon: '🔌' },
    { id: 'LAB', label: 'Laboratory Findings', icon: '🧪' },
    { id: 'VITAL', label: 'Clinical Symptoms', icon: '❤️' },
    { id: 'MEDICATION', label: 'Medication Signals', icon: '💊' },
    { id: 'PROCEDURE', label: 'Procedural Signals', icon: '🏥' },
  ];

  // Map signal type to display config
  const getSignalGroupConfig = (signalType: string) => {
    const typeMap: Record<string, { label: string; icon: string }> = {
      device: { label: 'Device Exposure Signals', icon: '🔌' },
      lab: { label: 'Laboratory Findings', icon: '🧪' },
      vital_sign: { label: 'Clinical Symptoms', icon: '❤️' },
      medication: { label: 'Medication Signals', icon: '💊' },
      procedure: { label: 'Procedural Signals', icon: '🏥' },
    };
    return typeMap[signalType.toLowerCase()] || { label: signalType, icon: '📊' };
  };

  // Group signals by type - either use structured signal_groups or legacy signals
  const groupedSignals = signalGroups
    ? signalGroups.map(group => {
        const config = getSignalGroupConfig(group.signal_type);
        return {
          id: group.signal_type,
          label: config.label,
          icon: config.icon,
          signals: group.signals.map(s => ({
            signal_id: s.signal_id,
            signal_name: s.signal_name,
            signal_type: s.signal_type.toUpperCase() as Signal['signal_type'],
            value: s.value,
            severity: (s.severity as any) || 'INFO',
            rationale: `${group.signal_type} signal`,
            timestamp: s.timestamp,
            confidence: group.group_confidence, // Use group confidence
          })),
          groupConfidence: group.group_confidence,
        };
      })
    : signals
    ? signalGroupsConfig.map(group => ({
        ...group,
        signals: signals.filter(s => s.signal_type === group.id),
        groupConfidence: undefined,
      })).filter(group => group.signals.length > 0)
    : [];

  // Count critical signals per group
  const getCriticalCount = (groupSignals: Signal[]) => {
    return groupSignals.filter(s => s.severity === 'CRITICAL').length;
  };

  const SignalCard: React.FC<{ signal: Signal }> = ({ signal }) => {
    const hasEvidence = signal.evidence_refs && signal.evidence_refs.length > 0;

    return (
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
        {hasEvidence && (
          <div className="signal-actions">
            <button
              className="btn-view-evidence"
              onClick={() => setSelectedSignal(signal)}
              title="View supporting evidence"
            >
              📋 View Evidence ({signal.evidence_refs!.length})
            </button>
          </div>
        )}
      </div>
    );
  };

  const SignalGroup: React.FC<{
    group: typeof groupedSignals[0]
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
            {group.groupConfidence !== undefined && (
              <span className="group-confidence" title="Group confidence from enrichment">
                {formatConfidence(group.groupConfidence)}
              </span>
            )}
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
    <div className="signals-panel panel" data-testid="signal-list">
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

      {groupedSignals.length === 0 && (
        <div className="no-data">No signals detected</div>
      )}

      {selectedSignal && (
        <EvidenceDrawer
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  );
};

export default SignalsPanel;
