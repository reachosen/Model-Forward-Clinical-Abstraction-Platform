import { CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface PipelineStepperProps {
  steps: Step[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
}

export function PipelineStepper({ steps, activeStep, onStepClick }: PipelineStepperProps) {
  const getStepIcon = (status: StepStatus, isActive: boolean) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />;
    }
    if (status === 'failed') {
      return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />;
    }
    if (status === 'in_progress') {
      return <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />;
    }
    return (
      <Circle
        className={cn(
          'h-6 w-6',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      />
    );
  };

  return (
    <div className="w-full bg-card border-b">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  'flex items-center gap-3 transition-opacity hover:opacity-80',
                  step.id !== activeStep && 'opacity-60'
                )}
              >
                {getStepIcon(step.status, step.id === activeStep)}
                <span
                  className={cn(
                    'text-sm font-medium',
                    step.id === activeStep
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
