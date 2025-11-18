/**
 * Separator UI Component
 * Adapted from shadcn/ui for Create React App
 */

import React from 'react';
import { cn } from '../../lib/utils';
import './Separator.css';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <div
      className={cn(
        'ui-separator',
        orientation === 'horizontal' ? 'ui-separator-horizontal' : 'ui-separator-vertical',
        className
      )}
      {...props}
    />
  );
}
