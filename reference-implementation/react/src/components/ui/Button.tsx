/**
 * Button UI Component
 * Adapted from shadcn/ui for Create React App
 */

import React from 'react';
import { cn } from '../../lib/utils';
import './Button.css';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'ui-button',
        `ui-button-${variant}`,
        `ui-button-${size}`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
