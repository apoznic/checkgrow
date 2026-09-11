import { motion } from 'framer-motion';
import { FolderOpen, Plus } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { GlassButton } from './GlassCard';

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

interface ProjectListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onDeleteProject?: (projectId: string) => Promise<void>;
  onCreateNew?: () => void;
  variant?: 'owner' | 'member';
  emptyMessage?: string;
}

export function ProjectList({ 
  projects, 
  onProjectClick, 
  onDeleteProject,
  onCreateNew,
  variant = 'owner',
  emptyMessage = 'No projects yet'
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        {onCreateNew && (
          <GlassButton variant="primary" onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </GlassButton>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project)}
          onDelete={onDeleteProject}
          variant={variant}
        />
      ))}
    </div>
  );
}
