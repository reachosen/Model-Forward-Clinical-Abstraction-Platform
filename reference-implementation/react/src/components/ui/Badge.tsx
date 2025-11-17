/**
 * Badge UI Component
 * Adapted from shadcn/ui for Create React App
 */

import React from 'react';
import { cn } from '../../lib/utils';
import './Badge.css';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('ui-badge', `ui-badge-${variant}`, className)}
      {...props}
    >
      {children}
    </span>
  );
}
