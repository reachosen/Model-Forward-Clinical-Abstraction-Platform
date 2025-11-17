/**
 * Utility functions for component styling and helpers
 */

import { type ClassValue, clsx } from 'clsx';

/**
 * Combines class names using clsx
 * Used by shadcn-style components for conditional className merging
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
