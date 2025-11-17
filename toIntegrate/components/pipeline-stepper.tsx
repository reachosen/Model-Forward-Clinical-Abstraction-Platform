"use client";

import { Check, Clock, AlertCircle, Circle } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/case";

interface PipelineStepperProps {
  stages: PipelineStage[];
  currentStage?: string;
  onStageClick?: (stageId: string) => void;
}

export function PipelineStepper({ stages, currentStage, onStageClick }: PipelineStepperProps) {
  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white';
      case 'in_progress':
        return 'bg-blue-500 border-blue-500 text-white';
      case 'failed':
        return 'bg-destructive border-destructive text-destructive-foreground';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className="w-full bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center flex-1">
            {/* Stage circle */}
            <button
              onClick={() => onStageClick?.(stage.id)}
              className={cn(
                "flex items-center gap-3 transition-all",
                onStageClick && "cursor-pointer hover:opacity-80"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  getStatusColor(stage.status),
                  currentStage === stage.id && "ring-2 ring-ring ring-offset-2"
                )}
              >
                {getStatusIcon(stage.status)}
              </div>
              
              <div className="flex flex-col items-start min-w-0">
                <span className={cn(
                  "text-sm font-medium",
                  stage.status === 'pending' && "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
                
                {stage.taskMetadata && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {stage.taskMetadata.prompt_version} • {stage.taskMetadata.mode}
                  </span>
                )}
              </div>
            </button>

            {/* Connector line */}
            {index < stages.length - 1 && (
              <div className="flex-1 mx-4 h-0.5 bg-border relative">
                <div
                  className={cn(
                    "absolute top-0 left-0 h-full transition-all",
                    stages[index + 1].status === 'completed' || stages[index + 1].status === 'in_progress'
                      ? "bg-green-500"
                      : "bg-border"
                  )}
                  style={{ width: stages[index + 1].status === 'completed' ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
