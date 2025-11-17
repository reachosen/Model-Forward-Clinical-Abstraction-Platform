/**
 * Interrogation Panel Component
 * Displays QA history from structured case interrogations
 * Shows questions, answers, confidence scores, and citations
 */

import React, { useState } from 'react';
import { QAHistoryEntry, QASection } from '../types';
import './InterrogationPanel.css';

interface InterrogationPanelProps {
  qaSection?: QASection | null;
  onAskQuestion?: (question: string, context: any) => Promise<void>;
}

const InterrogationPanel: React.FC<InterrogationPanelProps> = ({
  qaSection,
  onAskQuestion,
}) => {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (qaId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(qaId)) {
      newExpanded.delete(qaId);
    } else {
      newExpanded.add(qaId);
    }
    setExpandedEntries(newExpanded);
  };

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return 'N/A';
    return `${(confidence * 100).toFixed(0)}%`;
  };

  const getConfidenceClass = (confidence?: number) => {
    if (!confidence) return 'confidence-unknown';
    if (confidence >= 0.9) return 'confidence-high';
    if (confidence >= 0.7) return 'confidence-medium';
    return 'confidence-low';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'explain':
        return '📖';
      case 'summarize':
        return '📊';
      case 'validate':
        return '✓';
      default:
        return '❓';
    }
  };

  const getTargetTypeIcon = (targetType: string) => {
    switch (targetType) {
      case 'criterion':
        return '🎯';
      case 'signal':
        return '📡';
      case 'event':
        return '⏱️';
      case 'overall':
        return '🔍';
      default:
        return '📋';
    }
  };

  if (!qaSection || !qaSection.qa_history || qaSection.qa_history.length === 0) {
    return (
      <div className="interrogation-panel panel">
        <div className="panel-header">
          <h2>Interrogation History</h2>
          <span className="badge">0 queries</span>
        </div>
        <div className="no-data">
          <p>No interrogations have been performed on this case yet.</p>
          <p className="hint">
            Use the "Ask the Case" panel to interrogate specific aspects of this case.
          </p>
        </div>
      </div>
    );
  }

  const qaHistory = qaSection.qa_history;

  return (
    <div className="interrogation-panel panel">
      <div className="panel-header">
        <h2>Interrogation History</h2>
        <div className="panel-actions">
          <span className="badge">{qaHistory.length} queries</span>
          {qaSection.validation_status && (
            <span className={`status-badge status-${qaSection.validation_status}`}>
              {qaSection.validation_status}
            </span>
          )}
        </div>
      </div>

      <div className="qa-history-container">
        {qaHistory.map((entry) => {
          const isExpanded = expandedEntries.has(entry.qa_id);
          const context = entry.interrogation_context;

          return (
            <div
              key={entry.qa_id}
              className={`qa-entry ${isExpanded ? 'expanded' : 'collapsed'}`}
            >
              <div
                className="qa-entry-header"
                onClick={() => toggleEntry(entry.qa_id)}
              >
                <div className="header-left">
                  <span className="mode-icon" title={`Mode: ${context.mode}`}>
                    {getModeIcon(context.mode)}
                  </span>
                  <span className="target-icon" title={`Target: ${context.target_type}`}>
                    {getTargetTypeIcon(context.target_type)}
                  </span>
                  <span className="question-preview">{entry.question}</span>
                </div>
                <div className="header-right">
                  <span className={`confidence-badge ${getConfidenceClass(entry.confidence)}`}>
                    {formatConfidence(entry.confidence)}
                  </span>
                  <span className="timestamp">
                    {formatTimestamp(entry.task_metadata.executed_at)}
                  </span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="qa-entry-content">
                  {/* Question */}
                  <div className="qa-section">
                    <div className="section-label">Question</div>
                    <div className="question-text">{entry.question}</div>
                  </div>

                  {/* Context metadata */}
                  <div className="qa-section">
                    <div className="section-label">Context</div>
                    <div className="context-metadata">
                      <div className="context-item">
                        <span className="label">Mode:</span>
                        <span className="value">{context.mode}</span>
                      </div>
                      <div className="context-item">
                        <span className="label">Target:</span>
                        <span className="value">
                          {context.target_type}
                          {context.target_label && ` (${context.target_label})`}
                        </span>
                      </div>
                      {context.target_id && (
                        <div className="context-item">
                          <span className="label">Target ID:</span>
                          <span className="value code">{context.target_id}</span>
                        </div>
                      )}
                      {context.program_type && (
                        <div className="context-item">
                          <span className="label">Program:</span>
                          <span className="value">{context.program_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="qa-section">
                    <div className="section-label">Answer</div>
                    <div className="answer-text">{entry.answer}</div>
                  </div>

                  {/* Citations */}
                  {entry.citations && entry.citations.length > 0 && (
                    <div className="qa-section">
                      <div className="section-label">
                        Citations ({entry.citations.length})
                      </div>
                      <div className="citations-list">
                        {entry.citations.map((citation, idx) => (
                          <div key={idx} className="citation-item">
                            <span className="citation-number">[{idx + 1}]</span>
                            <span className="citation-text">{citation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task metadata */}
                  <div className="qa-section metadata">
                    <div className="section-label">Metadata</div>
                    <div className="task-metadata">
                      <div className="metadata-item">
                        <span className="label">Task ID:</span>
                        <span className="value code">{entry.task_metadata.task_id}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Task Type:</span>
                        <span className="value">{entry.task_metadata.task_type}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Executed by:</span>
                        <span className="value">{entry.task_metadata.executed_by}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Prompt Version:</span>
                        <span className="value">{entry.task_metadata.prompt_version}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InterrogationPanel;
