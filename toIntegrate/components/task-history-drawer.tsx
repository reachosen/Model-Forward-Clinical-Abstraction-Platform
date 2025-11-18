"use client";

import { useState } from "react";
import { History, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TaskMetadataBadge } from "@/components/task-metadata-badge";
import type { TaskHistoryEntry } from "@/types/case";

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
          <History className="h-4 w-4 mr-2" />
          Task History ({taskHistory.length})
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Execution History</SheetTitle>
          <SheetDescription>
            Chronological history of {taskType} task executions for this case
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {taskHistory.map((entry, index) => {
            const isLatest = index === 0;
            const isSelected = selectedIndex === index;

            return (
              <Card
                key={entry.task_metadata.task_id}
                className={isSelected ? "border-primary" : ""}
              >
                <CardContent className="pt-4">
                  <button
                    onClick={() => setSelectedIndex(isSelected ? null : index)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isLatest ? "default" : "outline"}>
                          {isLatest ? "Latest" : `v${taskHistory.length - index}`}
                        </Badge>
                        {entry.task_metadata.demo_mode && (
                          <Badge variant="secondary">Demo</Badge>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                      />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(entry.task_metadata.executed_at)}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          Version: <span className="text-foreground font-medium">
                            {entry.task_metadata.prompt_version}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Mode: <span className="text-foreground font-medium">
                            {entry.task_metadata.mode}
                          </span>
                        </span>
                      </div>

                      <p className="text-foreground">{entry.result_summary}</p>

                      {entry.changes_from_previous && (
                        <div className="rounded-md bg-muted/50 p-2 mt-2">
                          <span className="text-xs text-muted-foreground">Changes: </span>
                          <span className="text-xs">{entry.changes_from_previous}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <>
                        <Separator className="my-3" />
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Task Metadata</h4>
                            <TaskMetadataBadge taskMetadata={entry.task_metadata} />
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Performance Metrics
                            </h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="rounded-md bg-muted/50 p-2">
                                <div className="text-xs text-muted-foreground">Duration</div>
                                <div className="font-medium">
                                  {formatDuration(entry.performance_metrics.duration_ms)}
                                </div>
                              </div>
                              <div className="rounded-md bg-muted/50 p-2">
                                <div className="text-xs text-muted-foreground">Tokens</div>
                                <div className="font-medium">
                                  {entry.performance_metrics.token_count.toLocaleString()}
                                </div>
                              </div>
                              <div className="rounded-md bg-muted/50 p-2">
                                <div className="text-xs text-muted-foreground">Confidence</div>
                                <div className="font-medium">
                                  {(entry.performance_metrics.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>

                          {index < taskHistory.length - 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
