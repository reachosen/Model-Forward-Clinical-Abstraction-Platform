import { Badge } from '@/components/ui/badge';
import { TaskMetadata } from '@/types/case';
import { formatDistanceToNow } from 'date-fns';

interface TaskMetadataBadgeProps {
  metadata: TaskMetadata;
}

export function TaskMetadataBadge({ metadata }: TaskMetadataBadgeProps) {
  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    in_progress: { label: 'In Progress', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'default' as const },
    failed: { label: 'Failed', variant: 'destructive' as const },
  };

  const config = statusConfig[metadata.status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={config.variant}>{config.label}</Badge>
      {metadata.executed_at && (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(metadata.executed_at), { addSuffix: true })}
        </span>
      )}
      {metadata.prompt_version && (
        <span className="text-muted-foreground">v{metadata.prompt_version}</span>
      )}
    </div>
  );
}
