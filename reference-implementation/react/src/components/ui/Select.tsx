/**
 * Select UI Primitive - Simplified version
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerLabel: string;
  setTriggerLabel: (label: string) => void;
}>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  triggerLabel: '',
  setTriggerLabel: () => {},
});

export function Select({ value, onValueChange, children, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [triggerLabel, setTriggerLabel] = useState('');

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerLabel, setTriggerLabel }}>
      <div className={`ui-select ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { open, setOpen } = React.useContext(SelectContext);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={triggerRef}
      type="button"
      className={`select-trigger ${open ? 'open' : ''} ${className}`}
      onClick={() => setOpen(!open)}
    >
      <span className="select-trigger-content">{children}</span>
      <ChevronDown className="select-trigger-icon" />
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { triggerLabel } = React.useContext(SelectContext);
  return <span>{triggerLabel || placeholder}</span>;
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { open, setOpen } = React.useContext(SelectContext);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div ref={contentRef} className={`select-content ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen, setTriggerLabel } = React.useContext(SelectContext);
  const isSelected = value === selectedValue;

  const handleClick = () => {
    onValueChange(value);
    setTriggerLabel(typeof children === 'string' ? children : value);
    setOpen(false);
  };

  return (
    <button
      type="button"
      className={`select-item ${isSelected ? 'selected' : ''} ${className}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
