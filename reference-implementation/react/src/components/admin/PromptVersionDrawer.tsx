/**
 * Prompt Version Drawer Component
 * Shows read-only details of a specific prompt version
 * Phase 1: Read-only with disabled Edit/Promote button
 */

import React from 'react';
import { X, Info, Calendar, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { PromptVersion, TaskDefinition } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatDate } from '../../lib/utils';
import './PromptVersionDrawer.css';

interface PromptVersionDrawerProps {
  version: PromptVersion | null;
  task: TaskDefinition | null;
  onClose: () => void;
}

export function PromptVersionDrawer({ version, task, onClose }: PromptVersionDrawerProps) {
  if (!version || !task) {
    return null;
  }

  const getStatusColor = (status: PromptVersion['status']) => {
    switch (status) {
      case 'stable':
        return 'default';
      case 'experimental':
        return 'secondary';
      case 'deprecated':
        return 'destructive';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="prompt-version-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="header-content">
            <div className="header-title-section">
              <h2 className="drawer-title">
                {task.task_id} {version.version_id}
              </h2>
              <div className="header-badges">
                <Badge variant={getStatusColor(version.status)}>
                  {version.status}
                </Badge>
                {version.is_active && (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
            </div>
            <p className="drawer-subtitle">{task.description}</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">
          {/* Metadata Section */}
          <Card>
            <div className="card-header">
              <h3 className="card-title">
                <Info size={18} />
                Version Information
              </h3>
            </div>
            <div className="card-content">
              <div className="metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">Version ID:</span>
                  <span className="metadata-value">{version.version_id}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Status:</span>
                  <Badge variant={getStatusColor(version.status)}>
                    {version.status}
                  </Badge>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Created:</span>
                  <span className="metadata-value">
                    <Calendar size={14} />
                    {formatDate(version.created_at)}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Active:</span>
                  <span className="metadata-value">
                    {version.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
                {version.cases_run !== undefined && (
                  <div className="metadata-item">
                    <span className="metadata-label">Cases Run:</span>
                    <span className="metadata-value">{version.cases_run}</span>
                  </div>
                )}
                {version.last_used_at && (
                  <div className="metadata-item">
                    <span className="metadata-label">Last Used:</span>
                    <span className="metadata-value">
                      <Calendar size={14} />
                      {formatDate(version.last_used_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Changelog Section */}
          <Card>
            <div className="card-header">
              <h3 className="card-title">
                <Activity size={18} />
                Changelog
              </h3>
            </div>
            <div className="card-content">
              <p className="changelog-text">{version.changelog}</p>
            </div>
          </Card>

          {/* Performance Metrics Section */}
          {version.performance_metrics && (
            <Card>
              <div className="card-header">
                <h3 className="card-title">
                  <TrendingUp size={18} />
                  Performance Metrics
                </h3>
              </div>
              <div className="card-content">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Avg Confidence</div>
                    <div className="metric-value">
                      {(version.performance_metrics.avg_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Avg Latency</div>
                    <div className="metric-value">
                      {version.performance_metrics.avg_latency_ms}ms
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Avg Tokens</div>
                    <div className="metric-value">
                      {version.performance_metrics.avg_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-value">
                      {(version.performance_metrics.success_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* System Prompt Section */}
          <Card>
            <div className="card-header">
              <h3 className="card-title">System Prompt</h3>
            </div>
            <div className="card-content">
              <pre className="prompt-text">{version.system_prompt}</pre>
            </div>
          </Card>

          {/* Task-Specific Additions */}
          {version.task_specific_additions && (
            <Card>
              <div className="card-header">
                <h3 className="card-title">Task-Specific Additions</h3>
              </div>
              <div className="card-content">
                <pre className="prompt-text">{version.task_specific_additions}</pre>
              </div>
            </Card>
          )}

          {/* Phase 2 Notice */}
          <div className="phase2-notice">
            <AlertCircle size={16} />
            <span>
              Editing and version management will be available in Phase 2
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="drawer-footer">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            disabled
            title="Phase 2: Prompt management and version control"
          >
            Edit / Promote Version
          </Button>
        </div>
      </div>
    </>
  );
}
