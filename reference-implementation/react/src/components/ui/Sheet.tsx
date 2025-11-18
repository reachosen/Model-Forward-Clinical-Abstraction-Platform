/**
 * Sheet UI Primitive - Slide-out panel (drawer)
 */

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Sheet.css';

const SheetContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export interface SheetProps {
  children: React.ReactNode;
}

export function Sheet({ children }: SheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export interface SheetTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function SheetTrigger({ asChild, children }: SheetTriggerProps) {
  const { setOpen } = React.useContext(SheetContext);

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as any;
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        if (childProps.onClick) {
          childProps.onClick(e);
        }
        setOpen(true);
      },
    } as any);
  }

  return (
    <button onClick={() => setOpen(true)} className="sheet-trigger">
      {children}
    </button>
  );
}

export interface SheetContentProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  children: React.ReactNode;
}

export function SheetContent({ side = 'right', className = '', children }: SheetContentProps) {
  const { open, setOpen } = React.useContext(SheetContext);
  const contentRef = useRef<HTMLDivElement>(null);

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
    <>
      <div className="sheet-overlay" onClick={() => setOpen(false)} />
      <div ref={contentRef} className={`sheet-content sheet-${side} ${className}`}>
        <button className="sheet-close" onClick={() => setOpen(false)} aria-label="Close">
          <X className="sheet-close-icon" />
        </button>
        {children}
      </div>
    </>
  );
}

export interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetHeader({ children, className = '' }: SheetHeaderProps) {
  return <div className={`sheet-header ${className}`}>{children}</div>;
}

export interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetTitle({ children, className = '' }: SheetTitleProps) {
  return <h3 className={`sheet-title ${className}`}>{children}</h3>;
}

export interface SheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetDescription({ children, className = '' }: SheetDescriptionProps) {
  return <p className={`sheet-description ${className}`}>{children}</p>;
}
