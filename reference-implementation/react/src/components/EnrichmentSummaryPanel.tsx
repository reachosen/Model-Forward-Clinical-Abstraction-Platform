/**
 * Enrichment Summary Panel Component
 * Displays summary statistics and key findings from enrichment task
 * Adapted from Vercel UI for Create React App
 */

import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { EnrichmentSummary } from '../types';
import './EnrichmentSummaryPanel.css';

interface EnrichmentSummaryPanelProps {
  summary: EnrichmentSummary;
}

export function EnrichmentSummaryPanel({ summary }: EnrichmentSummaryPanelProps) {
  return (
    <Card className="enrichment-summary-panel">
      <CardHeader>
        <div className="header-title">
          <Sparkles size={20} className="icon-primary" />
          <CardTitle>Enrichment Summary</CardTitle>
        </div>
        <CardDescription>
          What enrichment identified from the clinical data
        </CardDescription>
      </CardHeader>

      <CardContent className="summary-content">
        {/* Summary statistics */}
        <div className="stats-grid">
          <div className="stat-item">
            <p className="stat-label">Signals Identified</p>
            <p className="stat-value">{summary.signals_identified}</p>
          </div>

          <div className="stat-item">
            <p className="stat-label">Signal Groups</p>
            <p className="stat-value">{summary.signal_groups_count}</p>
          </div>

          <div className="stat-item">
            <p className="stat-label">Timeline Phases</p>
            <p className="stat-value">{summary.timeline_phases_identified}</p>
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="confidence-section">
          <div className="confidence-header">
            <span className="confidence-label">Overall Confidence</span>
            <span className="confidence-value">
              {(summary.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={summary.confidence * 100} className="confidence-progress" />
        </div>

        {/* Key findings */}
        {summary.key_findings && summary.key_findings.length > 0 && (
          <div className="findings-section">
            <div className="findings-header">
              <TrendingUp size={16} className="icon-muted" />
              <span className="findings-label">Key Findings</span>
            </div>

            <ul className="findings-list">
              {summary.key_findings.map((finding, index) => (
                <li key={index} className="finding-item">
                  <Badge variant="outline" className="finding-badge">
                    {index + 1}
                  </Badge>
                  <span className="finding-text">{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
