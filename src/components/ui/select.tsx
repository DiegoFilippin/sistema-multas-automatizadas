import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function Select({ children, value, onValueChange }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || '');

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...(child.props as any),
            isOpen,
            setIsOpen,
            selectedValue,
            onValueChange: handleValueChange,
          } as any);
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps & any) {
  const { isOpen, setIsOpen } = props;
  
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectContent({ children, className, ...props }: SelectContentProps & any) {
  const { isOpen } = props;
  
  if (!isOpen) return null;
  
  return (
    <div className={cn(
      'absolute top-full z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg',
      className
    )}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...(child.props as any),
            ...props,
          } as any);
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ children, value, className, ...props }: SelectItemProps & any) {
  const { onValueChange, selectedValue } = props;
  
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100',
        selectedValue === value && 'bg-blue-50 text-blue-900',
        className
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, className, ...props }: SelectValueProps & any) {
  const { selectedValue } = props;
  
  return (
    <span className={cn('block truncate', className)}>
      {selectedValue || placeholder}
    </span>
  );
}