import { motion } from 'framer-motion';
import { 
  CheckCircle2, Circle, ArrowRight, Sparkles, Building2, FolderOpen, 
  MessageSquare, UserPlus, Camera 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  current?: boolean;
  action?: () => void;
}

interface SupplyNextStepsProps {
  hasAvatar: boolean;
  hasLinkedIn: boolean;
  skillCount: number;
  hasOrganization: boolean;
  hasProjects: boolean;
  minSkills?: number;
  onGoToSkillMapper?: () => void;
  onGoToOrgs?: () => void;
  onGoToProjects?: () => void;
  onGoToSettings?: () => void;
}

export function SupplyNextSteps({
  hasAvatar,
  hasLinkedIn,
  skillCount,
  hasOrganization,
  hasProjects,
  minSkills = 10,
  onGoToSkillMapper,
  onGoToOrgs,
  onGoToProjects,
  onGoToSettings,
}: SupplyNextStepsProps) {
  const steps: NextStep[] = [
    {
      id: 'photo',
      label: 'Upload profile photo',
      description: 'A professional photo helps teams trust you',
      completed: hasAvatar,
      action: onGoToSettings,
    },
    {
      id: 'skills',
      label: `Map your skills (${skillCount}/${minSkills})`,
      description: 'Chat with the AI to discover and log your skills',
      completed: skillCount >= minSkills,
      action: onGoToSkillMapper,
    },
    {
      id: 'linkedin',
      label: 'Connect LinkedIn',
      description: 'Verify your experience and boost credibility',
      completed: hasLinkedIn,
      action: onGoToSettings,
    },
    {
      id: 'org',
      label: 'Join an organization',
      description: 'Get access to projects and team matching',
      completed: hasOrganization,
      action: onGoToOrgs,
    },
    {
      id: 'projects',
      label: 'Apply to or accept a project',
      description: 'Start contributing and earning',
      completed: hasProjects,
      action: onGoToProjects,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const currentStepIndex = steps.findIndex(s => !s.completed);
  const allDone = completedCount === steps.length;

  if (allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Your Next Steps</h3>
        </div>
        <span className="text-xs font-medium text-primary">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-4">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step.completed ? "bg-primary" : i === currentStepIndex ? "bg-primary/40" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Steps list */}
      <div className="space-y-1.5">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          return (
            <button
              key={step.id}
              onClick={!step.completed ? step.action : undefined}
              disabled={step.completed}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all",
                step.completed
                  ? "opacity-60"
                  : isCurrent
                    ? "bg-primary/[0.08] border border-primary/20 shadow-sm"
                    : "hover:bg-secondary/40"
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className={cn(
                  "w-5 h-5 shrink-0",
                  isCurrent ? "text-primary" : "text-muted-foreground/40"
                )} />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  step.completed ? "line-through text-muted-foreground" : isCurrent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
              {isCurrent && !step.completed && step.action && (
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
