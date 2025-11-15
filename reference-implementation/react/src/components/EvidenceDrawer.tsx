/**
 * Evidence Drawer Component
 * Side panel showing underlying evidence for a signal
 */

import React, { useState, useEffect } from 'react';
import { Signal, Evidence } from '../types';
import api from '../api/client';
import './EvidenceDrawer.css';

interface EvidenceDrawerProps {
  signal: Signal | null;
  onClose: () => void;
}

const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ signal, onClose }) => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signal) {
      loadEvidence(signal.signal_id);
    }
  }, [signal]);

  const loadEvidence = async (signalId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getEvidence(signalId);
      setEvidence(data.evidence || []);
    } catch (err) {
      console.error('Error loading evidence:', err);
      setError('Failed to load evidence');
      setEvidence([]);
    } finally {
      setLoading(false);
    }
  };

  if (!signal) return null;

  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case 'LAB': return '🧪';
      case 'VITAL': return '❤️';
      case 'DEVICE': return '🔌';
      case 'PROCEDURE': return '🏥';
      case 'NOTE': return '📝';
      case 'EVENT': return '📅';
      default: return '📄';
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <>
      {/* Overlay */}
      <div className="evidence-drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="evidence-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="header-content">
            <h2>Evidence for Signal</h2>
            <button className="close-button" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="signal-summary">
            <div className="signal-name">{signal.signal_name.replace(/_/g, ' ')}</div>
            <div className="signal-details">
              <span className={`severity-badge ${signal.severity.toLowerCase()}`}>
                {signal.severity}
              </span>
              <span className="signal-value">{signal.value}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading evidence...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={() => loadEvidence(signal.signal_id)}>Retry</button>
            </div>
          )}

          {!loading && !error && evidence.length === 0 && (
            <div className="empty-state">
              <p>No evidence linked to this signal</p>
              <small>Evidence linking may not be available for all signals</small>
            </div>
          )}

          {!loading && !error && evidence.length > 0 && (
            <div className="evidence-list">
              <div className="evidence-count">
                {evidence.length} {evidence.length === 1 ? 'item' : 'items'} found
              </div>

              {evidence.map((item) => (
                <div key={item.evidence_id} className="evidence-item">
                  <div className="evidence-header">
                    <span className="evidence-type-icon">
                      {getEvidenceTypeIcon(item.evidence_type)}
                    </span>
                    <span className="evidence-type-label">
                      {getEvidenceTypeLabel(item.evidence_type)}
                    </span>
                    <span className="evidence-timestamp">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>

                  <div className="evidence-description">
                    {item.description}
                  </div>

                  <div className="evidence-metadata">
                    <div className="metadata-item">
                      <span className="label">Source:</span>
                      <span className="value">{item.source_system}</span>
                    </div>
                    {item.source_table && (
                      <div className="metadata-item">
                        <span className="label">Table:</span>
                        <span className="value">{item.source_table}</span>
                      </div>
                    )}
                    {item.relevance_score !== undefined && (
                      <div className="metadata-item">
                        <span className="label">Relevance:</span>
                        <span className="value">{(item.relevance_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  {item.raw_data && (
                    <details className="raw-data-section">
                      <summary>View Raw Data</summary>
                      <pre className="raw-data">
                        {JSON.stringify(item.raw_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EvidenceDrawer;
