/**
 * Task Metadata Badge Component
 * Displays execution metadata for AI tasks (enrichment, abstraction, etc.)
 * Adapted from Vercel UI for Create React App
 */

import React from 'react';
import { Info, Clock, User, Zap } from 'lucide-react';
import { Badge } from './ui/Badge';
import { cn, formatDate } from '../lib/utils';
import { TaskMetadata } from '../types';
import './TaskMetadataBadge.css';

interface TaskMetadataBadgeProps {
  taskMetadata: TaskMetadata;
  onViewDetails?: () => void;
  className?: string;
}

export function TaskMetadataBadge({ taskMetadata, onViewDetails, className }: TaskMetadataBadgeProps) {
  const getModeLabel = (mode: TaskMetadata['mode']) => {
    switch (mode) {
      case 'batch':
        return 'Batch';
      case 'interactive':
        return 'Interactive';
      case 'on_demand':
        return 'On-Demand';
    }
  };

  const getTaskTypeLabel = (type: TaskMetadata['task_type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div
      className={cn(
        'task-metadata-badge',
        onViewDetails && 'clickable',
        className
      )}
      onClick={onViewDetails}
    >
      <Info className="icon-info" size={16} />

      <div className="metadata-content">
        <span className="task-label">
          {getTaskTypeLabel(taskMetadata.task_type)} by {taskMetadata.task_id}
        </span>

        <Badge variant="secondary" className="version-badge">
          {taskMetadata.prompt_version}
        </Badge>

        <span className="separator">on</span>

        <span className="metadata-item">
          <Clock size={12} />
          {formatDate(taskMetadata.executed_at)}
        </span>

        <span className="separator">•</span>

        <Badge variant="outline" className="mode-badge">
          <Zap size={12} style={{ marginRight: '4px' }} />
          {getModeLabel(taskMetadata.mode)}
        </Badge>

        <span className="separator">•</span>

        <span className="metadata-item">
          <User size={12} />
          {taskMetadata.executed_by}
        </span>

        {taskMetadata.confidence !== undefined && (
          <>
            <span className="separator">•</span>
            <Badge variant="secondary" className="confidence-badge">
              {(taskMetadata.confidence * 100).toFixed(0)}% confidence
            </Badge>
          </>
        )}

        {taskMetadata.demo_mode && (
          <Badge variant="destructive" className="demo-badge">
            🎭 Demo Mode
          </Badge>
        )}
      </div>
    </div>
  );
}
