/**
 * TaskHistoryDrawer - Latest from Vercel (Nov 18 00:07)
 * Slide-out drawer showing task execution history with performance metrics
 */

import React, { useState } from 'react';
import { History, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { TaskMetadata } from '../types';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { TaskMetadataBadge } from './TaskMetadataBadge';
import './TaskHistoryDrawer.css';

interface TaskHistoryEntry {
  task_metadata: TaskMetadata;
  result_summary: string;
  changes_from_previous?: string;
  performance_metrics: {
    duration_ms: number;
    token_count: number;
    confidence: number;
  };
}

interface TaskHistoryDrawerProps {
  taskHistory: TaskHistoryEntry[];
  taskType: string;
}

export function TaskHistoryDrawer({ taskHistory, taskType }: TaskHistoryDrawerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="history-icon" />
          Task History ({taskHistory.length})
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="task-history-content">
        <SheetHeader>
          <SheetTitle>Task Execution History</SheetTitle>
          <SheetDescription>
            Chronological history of {taskType} task executions for this case
          </SheetDescription>
        </SheetHeader>

        <div className="task-history-list">
          {taskHistory.map((entry, index) => {
            const isLatest = index === 0;
            const isSelected = selectedIndex === index;

            return (
              <Card
                key={entry.task_metadata.task_id}
                className={`task-entry-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="task-entry-content">
                  <button
                    onClick={() => setSelectedIndex(isSelected ? null : index)}
                    className="task-entry-button"
                  >
                    <div className="task-entry-header">
                      <div className="task-badges">
                        <Badge variant={isLatest ? "default" : "outline"}>
                          {isLatest ? "Latest" : `v${taskHistory.length - index}`}
                        </Badge>
                        {entry.task_metadata.demo_mode && (
                          <Badge variant="secondary">Demo</Badge>
                        )}
                      </div>
                      <ChevronRight
                        className={`chevron-icon ${isSelected ? 'rotated' : ''}`}
                      />
                    </div>

                    <div className="task-entry-body">
                      <div className="task-timestamp">
                        <Clock className="clock-icon" />
                        <span>{formatTimestamp(entry.task_metadata.executed_at)}</span>
                      </div>

                      <div className="task-metadata-row">
                        <span className="metadata-label">
                          Version: <span className="metadata-value">
                            {entry.task_metadata.prompt_version}
                          </span>
                        </span>
                        <span className="metadata-label">
                          Mode: <span className="metadata-value">
                            {entry.task_metadata.mode}
                          </span>
                        </span>
                      </div>

                      <p className="task-summary">{entry.result_summary}</p>

                      {entry.changes_from_previous && (
                        <div className="task-changes">
                          <span className="changes-label">Changes: </span>
                          <span className="changes-text">{entry.changes_from_previous}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <>
                        <div className="task-divider" />

                        <div className="task-expanded-content">
                          <div className="expanded-section">
                            <h4 className="section-title">Task Metadata</h4>
                            <TaskMetadataBadge taskMetadata={entry.task_metadata} />
                          </div>

                          <div className="expanded-section">
                            <h4 className="section-title">
                              <TrendingUp className="section-icon" />
                              Performance Metrics
                            </h4>
                            <div className="metrics-grid">
                              <div className="metric-card">
                                <div className="metric-label">Duration</div>
                                <div className="metric-value">
                                  {formatDuration(entry.performance_metrics.duration_ms)}
                                </div>
                              </div>
                              <div className="metric-card">
                                <div className="metric-label">Tokens</div>
                                <div className="metric-value">
                                  {entry.performance_metrics.token_count.toLocaleString()}
                                </div>
                              </div>
                              <div className="metric-card">
                                <div className="metric-label">Confidence</div>
                                <div className="metric-value">
                                  {(entry.performance_metrics.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>

                          {index < taskHistory.length - 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="compare-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement comparison logic
                              }}
                            >
                              Compare with Previous Version
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
