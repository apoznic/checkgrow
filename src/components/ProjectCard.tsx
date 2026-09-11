import { motion } from 'framer-motion';
import { Users, Calendar, ChevronRight, CheckCircle2, Hourglass, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ProjectTeamMember {
  id: string;
  profile_id: string;
  role_in_project: string | null;
  status: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  project_teams?: ProjectTeamMember[];
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: (projectId: string) => Promise<void>;
  variant?: 'owner' | 'member';
}

export function ProjectCard({ project, onClick, onDelete, variant = 'owner' }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const teamCount = project.project_teams?.length || 0;
  const acceptedCount = project.project_teams?.filter(m => m.status === 'accepted').length || 0;
  const pendingCount = project.project_teams?.filter(m => m.status === 'proposed').length || 0;

  const statusColors: Record<string, string> = {
    open: 'bg-emerald-500/20 text-emerald-400',
    in_progress: 'bg-primary/20 text-primary',
    completed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    await onDelete(project.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <button
        onClick={onClick}
        className="w-full text-left glass-panel p-5 group hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{project.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status || 'open']}`}>
                {statusLabels[project.status || 'open']}
              </span>
            </div>
            
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{teamCount} team members</span>
              </div>
              
              {variant === 'owner' && (
                <>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{acceptedCount} accepted</span>
                  </div>
                  {pendingCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Hourglass className="w-3.5 h-3.5" />
                      <span>{pendingCount} pending</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && variant === 'owner' && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}
