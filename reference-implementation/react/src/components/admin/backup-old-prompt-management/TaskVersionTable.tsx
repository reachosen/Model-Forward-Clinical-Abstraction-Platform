/**
 * Task Version Table Component
 * Displays prompt versions for a specific task in a table format
 * Phase 1: Read-only, clicking a row opens the PromptVersionDrawer
 */

import React from 'react';
import { CheckCircle2, Circle, Clock, TrendingUp } from 'lucide-react';
import { TaskDefinition, PromptVersion } from '../../types';
import { Badge } from '../ui/badge';
import { formatDate } from '../../lib/utils';
import './TaskVersionTable.css';

interface TaskVersionTableProps {
  task: TaskDefinition;
  onVersionClick: (version: PromptVersion) => void;
}

export function TaskVersionTable({ task, onVersionClick }: TaskVersionTableProps) {
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

  const getTaskTypeLabel = (type: TaskDefinition['task_type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="task-version-table-container">
      <div className="task-header">
        <div className="task-header-content">
          <h3 className="task-title">
            {task.task_id} - {getTaskTypeLabel(task.task_type)}
          </h3>
          <p className="task-description">{task.description}</p>
        </div>
        <div className="task-metadata">
          <div className="task-metadata-item">
            <span className="task-metadata-label">Default Mode:</span>
            <Badge variant="outline">{task.default_mode}</Badge>
          </div>
          <div className="task-metadata-item">
            <span className="task-metadata-label">Active Version:</span>
            <Badge variant="default">{task.active_version}</Badge>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="version-table">
          <thead>
            <tr>
              <th className="col-status">Status</th>
              <th className="col-version">Version</th>
              <th className="col-active">Active</th>
              <th className="col-created">Created</th>
              <th className="col-cases">Cases Run</th>
              <th className="col-last-used">Last Used</th>
              <th className="col-performance">Performance</th>
            </tr>
          </thead>
          <tbody>
            {task.prompt_versions.map((version) => (
              <tr
                key={version.version_id}
                className="version-row"
                onClick={() => onVersionClick(version)}
              >
                <td className="col-status">
                  <Badge variant={getStatusColor(version.status)} className="status-badge">
                    {version.status}
                  </Badge>
                </td>
                <td className="col-version">
                  <span className="version-id">{version.version_id}</span>
                </td>
                <td className="col-active">
                  {version.is_active ? (
                    <CheckCircle2 size={18} className="icon-active" />
                  ) : (
                    <Circle size={18} className="icon-inactive" />
                  )}
                </td>
                <td className="col-created">
                  <span className="date-text">
                    <Clock size={14} />
                    {formatDate(version.created_at)}
                  </span>
                </td>
                <td className="col-cases">
                  <span className="cases-count">
                    {version.cases_run !== undefined ? version.cases_run.toLocaleString() : '-'}
                  </span>
                </td>
                <td className="col-last-used">
                  <span className="date-text">
                    {version.last_used_at ? formatDate(version.last_used_at) : '-'}
                  </span>
                </td>
                <td className="col-performance">
                  {version.performance_metrics ? (
                    <div className="performance-summary">
                      <TrendingUp size={14} />
                      <span>
                        {(version.performance_metrics.avg_confidence * 100).toFixed(0)}% conf
                        {' • '}
                        {version.performance_metrics.avg_latency_ms}ms
                      </span>
                    </div>
                  ) : (
                    <span className="no-data">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
