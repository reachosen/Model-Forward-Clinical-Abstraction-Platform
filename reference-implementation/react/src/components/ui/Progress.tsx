/**
 * Progress UI Component
 * Adapted from shadcn/ui for Create React App
 */

import React from 'react';
import { cn } from '../../lib/utils';
import './Progress.css';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
}

export function Progress({ value, className, ...props }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('ui-progress', className)} {...props}>
      <div
        className="ui-progress-indicator"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
