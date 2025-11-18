/**
 * SignalsPanel - Latest from Vercel (Nov 18 00:07)
 * Modern signal groups display with timeline phase integration
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { SignalGroup, EnrichmentTimelinePhase } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import './SignalsPanel.css';

interface SignalsPanelProps {
  signalGroups: SignalGroup[];
  timelinePhases?: EnrichmentTimelinePhase[];
}

export function SignalsPanel({ signalGroups, timelinePhases }: SignalsPanelProps) {
  return (
    <div className="signals-panel-new">
      {signalGroups.map((group, index) => (
        <Card key={index} className="signal-group-card">
          <div className="signal-card-header">
            <div className="signal-header-row">
              <div className="signal-header-left">
                <Sparkles className="signal-icon" />
                <h3 className="signal-type-title">{group.signal_type}</h3>
              </div>
              <div className="signal-header-right">
                <Badge variant="outline">
                  Confidence: {(group.group_confidence * 100).toFixed(0)}%
                </Badge>
                <Badge variant="secondary">
                  {group.signals.length} signals
                </Badge>
              </div>
            </div>
          </div>

          <div className="signal-card-body">
            <div className="signals-list">
              {group.signals.map((signal) => {
                const phase = timelinePhases?.find(p => {
                  const signalDate = new Date(signal.timestamp);
                  return signalDate >= new Date(p.start_date) && signalDate <= new Date(p.end_date);
                });

                return (
                  <div
                    key={signal.signal_id}
                    className="signal-item-card"
                  >
                    <div className="signal-item-top">
                      <div className="signal-item-content">
                        <div className="signal-title-row">
                          <span className="signal-name">{signal.signal_name}</span>
                          {phase && (
                            <Badge variant="outline" className="phase-badge">
                              {phase.phase_name}
                            </Badge>
                          )}
                        </div>
                        <p className="signal-value-text">
                          {typeof signal.value === 'object'
                            ? JSON.stringify(signal.value)
                            : String(signal.value)}
                        </p>
                      </div>
                      <div className="signal-item-meta">
                        <div className="signal-date">
                          {new Date(signal.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {signal.confidence !== undefined && (
                      <div className="signal-confidence-bar">
                        <Progress value={signal.confidence * 100} className="confidence-progress" />
                        <span className="confidence-percent">
                          {(signal.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
