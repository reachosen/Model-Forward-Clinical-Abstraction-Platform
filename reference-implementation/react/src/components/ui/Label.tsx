/**
 * Label Component
 * Simple label for form fields
 */

import React from 'react';
import './Label.css';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ children, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`ui-label ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
