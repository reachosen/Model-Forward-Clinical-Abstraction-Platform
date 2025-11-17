/**
 * Pipeline Stepper Component
 * Displays progress through the case abstraction pipeline
 * Adapted from Vercel UI for Create React App
 */

import React from 'react';
import { Check, Clock, AlertCircle, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { PipelineStage } from '../types';
import './PipelineStepper.css';

interface PipelineStepperProps {
  stages: PipelineStage[];
  currentStage?: string;
  onStageClick?: (stageId: string) => void;
}

export function PipelineStepper({ stages, currentStage, onStageClick }: PipelineStepperProps) {
  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return <Check size={16} />;
      case 'in_progress':
        return <Clock size={16} />;
      case 'failed':
        return <AlertCircle size={16} />;
      default:
        return <Circle size={16} />;
    }
  };

  const getStatusClass = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'in_progress':
        return 'status-in-progress';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  return (
    <div className="pipeline-stepper">
      <div className="stages-container">
        {stages.map((stage, index) => (
          <div key={stage.id} className="stage-wrapper">
            {/* Stage circle */}
            <button
              onClick={() => onStageClick?.(stage.id)}
              className={cn(
                'stage-button',
                onStageClick && 'clickable'
              )}
              disabled={!onStageClick}
            >
              <div
                className={cn(
                  'stage-circle',
                  getStatusClass(stage.status),
                  currentStage === stage.id && 'current-stage'
                )}
              >
                {getStatusIcon(stage.status)}
              </div>

              <div className="stage-info">
                <span className={cn(
                  'stage-label',
                  stage.status === 'pending' && 'label-muted'
                )}>
                  {stage.label}
                </span>

                {stage.taskMetadata && (
                  <span className="stage-metadata">
                    {stage.taskMetadata.prompt_version} • {stage.taskMetadata.mode}
                  </span>
                )}
              </div>
            </button>

            {/* Connector line */}
            {index < stages.length - 1 && (
              <div className="connector">
                <div
                  className={cn(
                    'connector-fill',
                    (stages[index + 1].status === 'completed' || stages[index + 1].status === 'in_progress')
                      && 'connector-active'
                  )}
                  style={{
                    width: stages[index + 1].status === 'completed' ? '100%' : '0%'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
