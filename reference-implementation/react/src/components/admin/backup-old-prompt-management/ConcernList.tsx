/**
 * Concern List Component
 * Left panel showing list of concerns (HACs) with task/version counts
 * Phase 1: Read-only, clicking a concern shows its tasks in the right panel
 */

import React from 'react';
import { Activity, Droplet, Scissors, ChevronRight } from 'lucide-react';
import { ConcernDefinition } from '../../types';
import { Badge } from '../ui/badge';
import './ConcernList.css';

interface ConcernListProps {
  concerns: ConcernDefinition[];
  selectedConcernId: string | null;
  onConcernSelect: (concernId: string) => void;
}

export function ConcernList({ concerns, selectedConcernId, onConcernSelect }: ConcernListProps) {
  const getConcernIcon = (concernId: string) => {
    switch (concernId) {
      case 'clabsi':
        return Activity;
      case 'cauti':
        return Droplet;
      case 'ssi':
        return Scissors;
      default:
        return Activity;
    }
  };

  return (
    <div className="concern-list">
      <div className="concern-list-header">
        <h2 className="concern-list-title">Healthcare-Associated Conditions</h2>
        <p className="concern-list-subtitle">
          Select a concern to view its tasks and prompt versions
        </p>
      </div>

      <div className="concern-list-items">
        {concerns.map((concern) => {
          const Icon = getConcernIcon(concern.concern_id);
          const isSelected = selectedConcernId === concern.concern_id;

          return (
            <button
              key={concern.concern_id}
              className={`concern-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onConcernSelect(concern.concern_id)}
            >
              <div className="concern-item-icon">
                <Icon size={20} />
              </div>

              <div className="concern-item-content">
                <div className="concern-item-header">
                  <h3 className="concern-item-title">{concern.display_name}</h3>
                  <ChevronRight size={16} className="concern-item-chevron" />
                </div>

                <p className="concern-item-description">{concern.description}</p>

                <div className="concern-item-stats">
                  <div className="concern-stat">
                    <span className="concern-stat-label">Tasks:</span>
                    <Badge variant="secondary">{concern.tasks.length}</Badge>
                  </div>
                  <div className="concern-stat">
                    <span className="concern-stat-label">Versions:</span>
                    <Badge variant="secondary">{concern.total_versions}</Badge>
                  </div>
                  <div className="concern-stat">
                    <span className="concern-stat-label">Cases:</span>
                    <Badge variant="secondary">{concern.total_cases_run}</Badge>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
