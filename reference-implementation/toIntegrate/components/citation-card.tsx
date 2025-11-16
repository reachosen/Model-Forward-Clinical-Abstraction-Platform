import React from 'react';
import { Button } from '@/components/ui/button';
import { EvidenceCitation } from '@/types/ask-case';

interface CitationCardProps {
  citation: EvidenceCitation;
  onViewSource: (citationId: string) => void;
}

export function CitationCard({ citation, onViewSource }: CitationCardProps) {
  const getSourceIcon = (type: string) => {
    const icons = {
      SIGNAL: '📡',
      EVENT: '📅',
      LAB: '🧪',
      NOTE: '📝',
      RULE: '📋',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const relevancePercentage = (citation.relevance_score * 100).toFixed(0);

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getSourceIcon(citation.source_type)}</span>
        <span className="text-sm font-medium text-foreground">
          {citation.source_type}
        </span>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {relevancePercentage}% relevant
        </span>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed mb-2">
        {citation.excerpt}
      </div>
      {citation.timestamp && (
        <div className="text-xs text-muted-foreground mb-2">
          {new Date(citation.timestamp).toLocaleString()}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onViewSource(citation.citation_id)}
      >
        View Source →
      </Button>
    </div>
  );
}
