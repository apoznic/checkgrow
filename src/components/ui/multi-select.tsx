import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  emptyText?: string;
}

/** Compact filter button that opens a checkbox list. Shows how many values are selected. */
export function MultiSelect({ label, options, selected, onChange, className, emptyText = 'Nothing to filter by yet' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);

  const active = selected.length > 0;
  const summary = active
    ? selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`
    : 'All';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 h-9 rounded-lg border px-3 text-xs font-medium transition-colors max-w-[220px]',
          active ? 'bg-[#2A2722] text-[#F7F7F5] border-[#2A2722]' : 'bg-card text-foreground border-border hover:bg-secondary',
        )}
      >
        <span className={cn('shrink-0', active ? 'text-[#F7F7F5]/70' : 'text-muted-foreground')}>{label}</span>
        <span className="truncate">{summary}</span>
        {active ? (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange([]); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange([]); } }}
            className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
            title="Clear"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-border bg-card shadow-lg p-2">
          {options.length > 7 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                className="w-full h-8 rounded-md border border-border bg-background pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div className="max-h-64 overflow-auto space-y-0.5">
            {visible.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">{options.length === 0 ? emptyText : 'No matches'}</p>
            ) : (
              visible.map(o => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn('w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary', on && 'bg-secondary/70')}
                  >
                    <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', on ? 'bg-[#2A2722] border-[#2A2722] text-[#F7F7F5]' : 'border-border bg-background')}>
                      {on && <Check className="w-3 h-3" />}
                    </span>
                    <span className="flex-1 truncate">{o.label}</span>
                    {typeof o.count === 'number' && <span className="text-[11px] text-muted-foreground tabular-nums">{o.count}</span>}
                  </button>
                );
              })
            )}
          </div>
          {active && (
            <button type="button" onClick={() => onChange([])} className="mt-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary text-left">
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
