"use client";

import { Info, Clock, User, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskMetadata } from "@/types/case";

interface TaskMetadataBadgeProps {
  taskMetadata: TaskMetadata;
  onViewDetails?: () => void;
  className?: string;
}

export function TaskMetadataBadge({ taskMetadata, onViewDetails, className }: TaskMetadataBadgeProps) {
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3",
        onViewDetails && "cursor-pointer hover:bg-muted/70 transition-colors",
        className
      )}
      onClick={onViewDetails}
    >
      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground font-medium">
          {getTaskTypeLabel(taskMetadata.task_type)} by {taskMetadata.task_id}
        </span>
        
        <Badge variant="secondary" className="text-xs">
          {taskMetadata.prompt_version}
        </Badge>
        
        <span className="text-muted-foreground">on</span>
        
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(taskMetadata.executed_at)}
        </span>
        
        <span className="text-muted-foreground">•</span>
        
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {getModeLabel(taskMetadata.mode)}
        </Badge>
        
        <span className="text-muted-foreground">•</span>
        
        <span className="text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />
          {taskMetadata.executed_by}
        </span>
        
        {taskMetadata.confidence !== undefined && (
          <>
            <span className="text-muted-foreground">•</span>
            <Badge variant="secondary" className="text-xs">
              {(taskMetadata.confidence * 100).toFixed(0)}% confidence
            </Badge>
          </>
        )}
        
        {taskMetadata.demo_mode && (
          <Badge variant="destructive" className="text-xs">
            🎭 Demo Mode
          </Badge>
        )}
      </div>
    </div>
  );
}
