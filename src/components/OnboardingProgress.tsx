import { motion } from 'framer-motion';
import { Check, Camera, Sparkles, Building2, Linkedin, ChevronRight, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingProgressProps {
  hasAvatar: boolean;
  skillCount: number;
  hasOrganization: boolean;
  hasLinkedIn: boolean;
  minSkills?: number;
  onUploadPhoto?: () => void;
  onAddSkills?: () => void;
  onJoinOrg?: () => void;
  onConnectLinkedIn?: () => void;
}

export function OnboardingProgress({
  hasAvatar,
  skillCount,
  hasOrganization,
  hasLinkedIn,
  minSkills = 10,
  onUploadPhoto,
  onAddSkills,
  onJoinOrg,
  onConnectLinkedIn,
}: OnboardingProgressProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'photo',
      label: 'Profile Photo',
      description: 'Upload a professional photo',
      icon: <Camera className="w-4 h-4" />,
      completed: hasAvatar,
      action: onUploadPhoto,
      actionLabel: 'Upload',
    },
    {
      id: 'skills',
      label: `Skills (${skillCount}/${minSkills})`,
      description: skillCount >= minSkills 
        ? 'Great skill coverage!' 
        : `Add ${minSkills - skillCount} more skills`,
      icon: <Sparkles className="w-4 h-4" />,
      completed: skillCount >= minSkills,
      action: onAddSkills,
      actionLabel: skillCount >= minSkills ? undefined : 'Add',
    },
    {
      id: 'organization',
      label: 'Organization',
      description: 'Join or create an organization',
      icon: <Building2 className="w-4 h-4" />,
      completed: hasOrganization,
      action: onJoinOrg,
      actionLabel: hasOrganization ? undefined : 'Join',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      description: 'Connect your LinkedIn profile',
      icon: <Linkedin className="w-4 h-4" />,
      completed: hasLinkedIn,
      action: onConnectLinkedIn,
      actionLabel: 'Connect',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  // Hide completely when profile is fully complete
  if (isComplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel p-4 mb-4",
        isComplete 
          ? "border-green-500/30 bg-green-500/5" 
          : "border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-green-500" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
          <h3 className="text-sm font-semibold">
            {isComplete ? 'Profile Complete!' : 'Complete Your Profile'}
          </h3>
        </div>
        <span className={cn(
          "text-xs font-medium",
          isComplete ? "text-green-500" : "text-primary"
        )}>
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={progress} 
        className={cn(
          "h-2 mb-4",
          isComplete && "[&>div]:bg-green-500"
        )}
      />

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-all",
              step.completed 
                ? "bg-green-500/10" 
                : "bg-secondary/30 hover:bg-secondary/50",
              step.action && !step.completed && "cursor-pointer"
            )}
            onClick={!step.completed ? step.action : undefined}
          >
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              step.completed 
                ? "bg-green-500/20 text-green-500" 
                : "bg-muted text-muted-foreground"
            )}>
              {step.completed ? (
                <Check className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.completed ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {step.description}
              </p>
            </div>

            {/* Action */}
            {!step.completed && step.action && step.actionLabel && (
              <div className="flex items-center gap-1 text-primary text-xs font-medium shrink-0">
                {step.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Helpful tip for incomplete profiles */}
      {!isComplete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-xs text-muted-foreground text-center"
        >
          Complete all steps to get matched with projects
        </motion.p>
      )}
    </motion.div>
  );
}
