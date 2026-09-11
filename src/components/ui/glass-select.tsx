import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassSelectOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled,
}: GlassSelectProps) {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full appearance-none cursor-pointer',
          'h-10 px-4 pr-10 rounded-xl text-sm',
          'bg-secondary/30 hover:bg-secondary/50',
          'border border-border/40 hover:border-primary/30',
          'text-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !selectedOption && 'text-muted-foreground'
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
