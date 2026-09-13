import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillBadgeProps {
  skill: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  onRemove?: () => void;
  className?: string;
}

const levelColors = {
  beginner: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  intermediate: 'bg-primary/15 border-primary/30 text-primary',
  advanced: 'bg-accent/20 border-accent/40 text-accent',
  expert: 'bg-accent border-[#CFC3D9] text-accent-foreground',
};

export function SkillBadge({ skill, level = 'intermediate', onRemove, className }: SkillBadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border',
        levelColors[level],
        className
      )}
    >
      {skill}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.span>
  );
}
