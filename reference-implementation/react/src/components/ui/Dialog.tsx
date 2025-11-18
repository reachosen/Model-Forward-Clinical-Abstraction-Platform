/**
 * Dialog UI Component
 * Simplified modal dialog for Create React App
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import './Dialog.css';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const handleOpenChange = onOpenChange || setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  const { onOpenChange } = useDialog();

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as any;
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        if (childProps.onClick) {
          childProps.onClick(e);
        }
        onOpenChange(true);
      },
    } as any);
  }

  return (
    <button onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  const { open, onOpenChange } = useDialog();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="ui-dialog-overlay" onClick={() => onOpenChange(false)}>
      <div
        className={cn('ui-dialog-content', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ui-dialog-close"
          onClick={() => onOpenChange(false)}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn('ui-dialog-header', className)}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('ui-dialog-title', className)}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return (
    <p className={cn('ui-dialog-description', className)}>
      {children}
    </p>
  );
}
