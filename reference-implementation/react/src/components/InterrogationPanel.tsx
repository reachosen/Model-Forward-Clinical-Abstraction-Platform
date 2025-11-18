/**
 * InterrogationPanel - Latest from Vercel (Nov 18 00:07)
 * Q&A history display with mode icons and confidence scores
 */

import React from 'react';
import { MessageCircle, Lightbulb, CheckCircle, FileQuestion } from 'lucide-react';
import { QAHistoryEntry } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import './InterrogationPanel.css';

interface InterrogationPanelProps {
  qaHistory: QAHistoryEntry[];
}

export function InterrogationPanel({ qaHistory }: InterrogationPanelProps) {
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'explain':
        return <Lightbulb className="mode-icon" />;
      case 'validate':
        return <CheckCircle className="mode-icon" />;
      case 'summarize':
        return <FileQuestion className="mode-icon" />;
      default:
        return <MessageCircle className="mode-icon" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (qaHistory.length === 0) {
    return (
      <Card className="interrogation-card">
        <div className="interrogation-header">
          <h4 className="interrogation-title">Q&A History</h4>
        </div>
        <div className="interrogation-body">
          <p className="empty-state">
            No questions asked yet. Use "Ask the Case" to start.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="interrogation-card">
      <div className="interrogation-header">
        <div className="interrogation-header-row">
          <h4 className="interrogation-title">Q&A History</h4>
          <Badge variant="secondary">{qaHistory.length} interactions</Badge>
        </div>
      </div>

      <div className="interrogation-body">
        <div className="qa-list">
          {qaHistory.map((qa, index) => (
            <div key={qa.qa_id} className="qa-item">
              <div className="qa-content">
                {/* Question */}
                <div className="question-section">
                  <div className="question-icon-wrapper">
                    {getModeIcon(qa.interrogation_context.mode)}
                  </div>
                  <div className="question-main">
                    <div className="question-header">
                      <p className="question-text">{qa.question}</p>
                      <Badge variant="outline" className="mode-badge">
                        {qa.interrogation_context.mode}
                      </Badge>
                    </div>

                    {qa.interrogation_context.target_type !== 'overall' && (
                      <Badge variant="secondary" className="target-badge">
                        Target: {qa.interrogation_context.target_type} - {qa.interrogation_context.target_id}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Answer */}
                <div className="answer-section">
                  <p className="answer-text">{qa.answer}</p>

                  {qa.citations && qa.citations.length > 0 && (
                    <div className="citations-row">
                      <span className="citations-label">Citations:</span> {qa.citations.length} sources
                    </div>
                  )}

                  <div className="answer-footer">
                    <span className="timestamp">{formatTimestamp(qa.task_metadata.executed_at)}</span>
                    <div className="confidence-section">
                      <Progress value={(qa.confidence || 0) * 100} className="confidence-progress" />
                      <span className="confidence-value">{((qa.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {index < qaHistory.length - 1 && <div className="qa-separator" />}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
