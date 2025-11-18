/**
 * Textarea UI Primitive
 */

import React from 'react';
import './Textarea.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`ui-textarea ${className}`}
      {...props}
    />
  );
}
