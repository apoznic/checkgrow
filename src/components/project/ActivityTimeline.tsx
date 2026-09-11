import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, UserPlus, UserMinus, CheckCircle2, MessageSquare, 
  FolderPlus, Settings, Loader2, User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  actor_id: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ActivityTimelineProps {
  projectId: string;
}

const activityIcons: Record<string, typeof Activity> = {
  task_created: FolderPlus,
  task_status_changed: CheckCircle2,
  task_deleted: Settings,
  team_member_added: UserPlus,
  team_member_removed: UserMinus,
  message_sent: MessageSquare,
  project_updated: Settings,
  default: Activity,
};

const activityColors: Record<string, string> = {
  task_created: 'from-primary to-accent',
  task_status_changed: 'from-amber-500 to-orange-500',
  task_deleted: 'from-destructive to-red-600',
  team_member_added: 'from-emerald-500 to-green-600',
  team_member_removed: 'from-rose-500 to-red-500',
  message_sent: 'from-blue-500 to-cyan-500',
  project_updated: 'from-purple-500 to-violet-500',
  default: 'from-muted to-muted-foreground',
};

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel(`project-activities-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activities',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('project_activities')
      .select(`
        id,
        activity_type,
        description,
        created_at,
        actor_id,
        profiles:actor_id (
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setActivities(data as unknown as ActivityItem[]);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Activity will appear here as the project progresses
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.activity_type] || activityIcons.default;
          const gradientClass = activityColors[activity.activity_type] || activityColors.default;
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex gap-4 pl-2"
            >
              {/* Icon */}
              <div className={`relative z-10 w-6 h-6 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-3 h-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 glass-panel p-3 -mt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.profiles?.full_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {activity.profiles.avatar_url ? (
                            <img 
                              src={activity.profiles.avatar_url} 
                              alt={activity.profiles.full_name} 
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span>{activity.profiles.full_name}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
