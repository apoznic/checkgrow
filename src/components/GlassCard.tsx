import { ReactNode, forwardRef, ComponentPropsWithoutRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function GlassCard({ children, className, hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay,
      }}
      className={cn(
        hover ? 'glass-card' : 'glass-panel',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function GlassInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('glass-input text-foreground placeholder:text-muted-foreground', className)}
      {...props}
    />
  );
}

export function GlassTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('glass-input text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none', className)}
      {...props}
    />
  );
}

interface GlassButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'default' | 'primary';
  children: ReactNode;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
      className={cn(
          variant === 'primary' ? 'glass-button-primary' : 'glass-button',
          variant === 'primary' ? '' : 'text-foreground',
          'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
