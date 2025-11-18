/**
 * useToast Hook
 * Simple toast notification system without external dependencies
 */

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastIdCounter = 0;

const listeners: Array<(toasts: Toast[]) => void> = [];
let toastsState: Toast[] = [];

function generateId(): string {
  toastIdCounter += 1;
  return `toast-${toastIdCounter}-${Date.now()}`;
}

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastsState]));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastsState);

  // Subscribe to toast updates
  useState(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  });

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = { id, title, description, variant };

    toastsState = [...toastsState, newToast];
    notifyListeners();

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      dismiss(id);
    }, 3000);

    return { id };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    toastsState = toastsState.filter((t) => t.id !== toastId);
    notifyListeners();
  }, []);

  return {
    toasts,
    toast,
    dismiss,
  };
}
