import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PhaseHeaderProps {
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  executedAt?: string;
  promptVersion?: string | null;
  llmModel?: string;
  isRunning: boolean;
  onRun: () => void;
  disableRun?: boolean;
  errorMessage?: string | null;
}

export function PhaseHeader({
  title,
  status,
  executedAt,
  promptVersion,
  llmModel = 'GPT-4',
  isRunning,
  onRun,
  disableRun = false,
  errorMessage,
}: PhaseHeaderProps) {
  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  };

  const config = statusConfig[status];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Badge variant="secondary" className={config.className}>
            {config.label}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Cpu className="h-3 w-3" />
            {llmModel}
          </Badge>
        </div>
        <Button
          onClick={onRun}
          disabled={isRunning || disableRun}
          className="min-w-[140px]"
        >
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRunning ? 'Running...' : `Run ${title}`}
        </Button>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {executedAt ? (
          <span>Last run: {formatDistanceToNow(new Date(executedAt), { addSuffix: true })}</span>
        ) : (
          <span>Not yet run</span>
        )}
        {promptVersion && (
          <Badge variant="secondary" className="text-xs">
            v{promptVersion}
          </Badge>
        )}
      </div>
      
      {errorMessage && (
        <div className="text-sm text-red-600 dark:text-red-400">
          Error: {errorMessage}
        </div>
      )}
    </div>
  );
}
