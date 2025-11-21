import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import type { HACDefinition } from '../types/hac-config';

interface HACSidebarProps {
  hacs: HACDefinition[];
  selectedConcernId?: string;
  onSelectHAC: (concernId: string) => void;
  onNewHAC: () => void;
}

export function HACSidebar({ hacs, selectedConcernId, onSelectHAC, onNewHAC }: HACSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHACs = hacs.filter(
    (hac) =>
      hac.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hac.concern_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
    <div className="flex h-full w-80 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">HAC Configurations</h2>
        <p className="text-sm text-muted-foreground">Manage concern configurations</p>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search HACs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* HAC List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 p-2">
          {filteredHACs.map((hac) => (
            <button
              key={hac.hac_id}
              onClick={() => onSelectHAC(hac.concern_id)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                selectedConcernId === hac.concern_id
                  ? 'border-primary bg-accent'
                  : 'border-transparent hover:bg-accent/50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-foreground">{hac.display_name}</div>
                  <div className="text-xs text-muted-foreground">{hac.concern_id}</div>
                </div>
                <Badge variant="outline" className={cn('text-xs', getStatusColor(hac.status))}>
                  {hac.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">v{hac.version}</div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* New HAC Button */}
      <div className="border-t border-border p-4">
        <Button onClick={onNewHAC} className="w-full" variant="default">
          <Plus className="mr-2 h-4 w-4" />
          New HAC
        </Button>
      </div>
    </div>
  );
}
