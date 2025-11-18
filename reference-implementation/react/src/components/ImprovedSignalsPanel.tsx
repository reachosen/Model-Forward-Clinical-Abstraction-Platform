/**
 * Improved Signals Panel Component
 * Displays signal groups with timeline phase integration and enhanced UI
 * Adapted from Vercel UI for Create React App
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { SignalGroup, EnrichmentTimelinePhase } from '../types';
import { cn } from '../lib/utils';
import './ImprovedSignalsPanel.css';

interface ImprovedSignalsPanelProps {
  signalGroups: SignalGroup[];
  timelinePhases?: EnrichmentTimelinePhase[];
}

export function ImprovedSignalsPanel({ signalGroups, timelinePhases }: ImprovedSignalsPanelProps) {
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

  return (
    <div className="improved-signals-panel">
      {signalGroups.map((group, index) => {
        const config = getSignalGroupConfig(group.signal_type);

        return (
          <Card key={index} className="signal-group-card">
            <CardHeader>
              <div className="signal-group-header">
                <div className="signal-group-title">
                  <Sparkles size={16} className="signal-icon-primary" />
                  <CardTitle className="signal-title">{config.label}</CardTitle>
                  <span className="signal-emoji">{config.icon}</span>
                </div>
                <div className="signal-group-badges">
                  <Badge variant="outline">
                    Confidence: {(group.group_confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="secondary">
                    {group.signals.length} signals
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="signals-list">
                {group.signals.map((signal) => {
                  // Find timeline phase for this signal
                  const phase = timelinePhases?.find(p => {
                    const signalDate = new Date(signal.timestamp);
                    const phaseStart = new Date(p.start_date);
                    const phaseEnd = new Date(p.end_date);
                    return signalDate >= phaseStart && signalDate <= phaseEnd;
                  });

                  return (
                    <div key={signal.signal_id} className="signal-item">
                      <div className="signal-item-header">
                        <div className="signal-item-info">
                          <div className="signal-item-name-row">
                            <span className="signal-name">{signal.signal_name}</span>
                            {phase && (
                              <Badge variant="outline" className="phase-badge">
                                {phase.phase_name}
                              </Badge>
                            )}
                          </div>
                          <p className="signal-value">
                            {typeof signal.value === 'object'
                              ? JSON.stringify(signal.value)
                              : String(signal.value)}
                            {signal.unit && ` ${signal.unit}`}
                          </p>
                        </div>
                        <div className="signal-item-meta">
                          <div className="signal-timestamp">
                            {new Date(signal.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="signal-confidence">
                        <Progress
                          value={(signal.confidence || group.group_confidence) * 100}
                          className="signal-confidence-bar"
                        />
                        <span className="signal-confidence-text">
                          {((signal.confidence || group.group_confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
