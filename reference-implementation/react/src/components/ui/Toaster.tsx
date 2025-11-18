/**
 * Toaster Component
 * Displays toast notifications
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast, Toast } from '../../hooks/useToast';
import './Toaster.css';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [visibleToasts, setVisibleToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setVisibleToasts(toasts);
  }, [toasts]);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="toaster-viewport">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.variant || 'default'}`}
          role="alert"
        >
          <div className="toast-content">
            {toast.title && <div className="toast-title">{toast.title}</div>}
            {toast.description && (
              <div className="toast-description">{toast.description}</div>
            )}
          </div>
          <button
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
