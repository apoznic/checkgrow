import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  available: boolean;
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({ available, showLabel = true, className }: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        available ? 'text-foreground' : 'text-destructive',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          available ? 'bg-primary' : 'bg-destructive'
        )}
        style={{
          boxShadow: available
            ? '0 0 8px hsl(var(--primary) / 0.6)'
            : '0 0 8px hsl(var(--destructive) / 0.6)',
        }}
      />
      {showLabel && (available ? 'Available' : 'Unavailable')}
    </span>
  );
}
