/**
 * Citation Card Component
 * Displays evidence citations with source info
 */

import React from 'react';
import { EvidenceCitation } from '../api/cafactory';
import './CitationCard.css';

interface CitationCardProps {
  citation: EvidenceCitation;
  onViewSource: (citationId: string) => void;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation, onViewSource }) => {
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
    <div className="citation-card">
      <div className="citation-header">
        <span className="source-icon">{getSourceIcon(citation.source_type)}</span>
        <span className="source-type">{citation.source_type}</span>
        <span className="relevance-score">{relevancePercentage}% relevant</span>
      </div>
      <div className="citation-excerpt">{citation.excerpt}</div>
      {citation.timestamp && (
        <div className="citation-timestamp">
          {new Date(citation.timestamp).toLocaleString()}
        </div>
      )}
      <button
        className="view-source-button"
        onClick={() => onViewSource(citation.citation_id)}
      >
        View Source →
      </button>
    </div>
  );
};

export default CitationCard;
