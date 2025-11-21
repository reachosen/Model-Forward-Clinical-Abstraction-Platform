import { Card } from '@/components/ui/card';
import { InterrogationEntry } from '@/types/case';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InterrogationPanelProps {
  interrogations: InterrogationEntry[];
}

export function InterrogationPanel({ interrogations }: InterrogationPanelProps) {
  if (interrogations.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No Q&A history yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {interrogations.map((entry, idx) => (
            <div key={idx} className="space-y-2 pb-4 border-b last:border-0">
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Q:</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground pl-4">{entry.question}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium">A:</span>
                <p className="text-sm pl-4">{entry.answer}</p>
                {entry.confidence && (
                  <span className="text-xs text-muted-foreground pl-4">
                    Confidence: {(entry.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
