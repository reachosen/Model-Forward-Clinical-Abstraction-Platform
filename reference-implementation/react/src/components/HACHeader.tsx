import { Save } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { HACDefinition } from '../types/hac-config';
import { cn } from '../lib/utils';

interface HACHeaderProps {
  definition: HACDefinition;
  onSave: () => void;
  isSaving?: boolean;
}

export function HACHeader({ definition, onSave, isSaving }: HACHeaderProps) {
  const getStatusColor = (status: HACDefinition['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{definition.display_name}</h1>
          <Badge variant="outline" className={cn('text-xs', getStatusColor(definition.status))}>
            {definition.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>ID: {definition.concern_id}</span>
          <span>"</span>
          <span>Version {definition.version}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={isSaving} variant="default">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
