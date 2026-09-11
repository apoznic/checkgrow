import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, FolderOpen, Users, Calendar, ArrowRight, LogOut, Home, Sparkles, Check, X } from 'lucide-react';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { Logo } from '@/components/Logo';
import { GlassButton } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  role_in_project: string | null;
  owner: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  team_count: number;
}

interface PendingInvite {
  team_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  owner_name: string | null;
  owner_avatar: string | null;
}

export default function MyProjects() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProjects();
  }, [user, navigate]);

  const loadProjects = async () => {
    if (!user) return;

    // Get profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      setIsLoading(false);
      return;
    }

    setProfileId(profile.id);

    // Get projects where user is a team member (accepted)
    const { data: teamProjects } = await supabase
      .from('project_teams')
      .select(`
        role_in_project,
        projects (
          id,
          title,
          description,
          status,
          created_at,
          owner_id
        )
      `)
      .eq('profile_id', profile.id)
      .eq('status', 'accepted');

    // Get projects owned by user
    const { data: owned } = await supabase
      .from('projects')
      .select('id, title, description, status, created_at, owner_id')
      .eq('owner_id', profile.id);

    // Get owner info and team counts for team projects
    const projectsWithDetails: Project[] = [];

    if (teamProjects) {
      for (const tp of teamProjects) {
        const project = tp.projects as any;
        if (!project) continue;

        const { data: owner } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', project.owner_id)
          .single();

        const { count } = await supabase
          .from('project_teams')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'accepted');

        projectsWithDetails.push({
          ...project,
          role_in_project: tp.role_in_project,
          owner: owner || { id: project.owner_id, full_name: null, avatar_url: null },
          team_count: count || 0,
        });
      }
    }

    // Process owned projects
    const ownedWithDetails: Project[] = [];
    if (owned) {
      for (const project of owned) {
        const { count } = await supabase
          .from('project_teams')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'accepted');

        ownedWithDetails.push({
          ...project,
          role_in_project: 'Project Lead',
          owner: { id: profile.id, full_name: 'You', avatar_url: null },
          team_count: count || 0,
        });
      }
    }

    setProjects(projectsWithDetails);
    setOwnedProjects(ownedWithDetails);

    // Load pending invitations
    const { data: pendingTeams } = await supabase
      .from('project_teams')
      .select(`
        id,
        project_id,
        projects (
          id, title, description, status, created_at, owner_id,
          profiles:owner_id (full_name, avatar_url)
        )
      `)
      .eq('profile_id', profile.id)
      .eq('status', 'proposed');

    if (pendingTeams) {
      const invites: PendingInvite[] = pendingTeams.map((pt: any) => ({
        team_id: pt.id,
        project_id: pt.projects?.id,
        title: pt.projects?.title || 'Unknown Project',
        description: pt.projects?.description,
        status: pt.projects?.status,
        created_at: pt.projects?.created_at,
        owner_name: pt.projects?.profiles?.full_name,
        owner_avatar: pt.projects?.profiles?.avatar_url,
      }));
      setPendingInvites(invites);
    }

    setIsLoading(false);
  };

  const handleAcceptInvite = async (teamId: string) => {
    setRespondingId(teamId);
    const { error } = await supabase.from('project_teams').update({ status: 'accepted' }).eq('id', teamId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation accepted! 🎉' });
      loadProjects();
    }
    setRespondingId(null);
  };

  const handleDeclineInvite = async (teamId: string) => {
    setRespondingId(teamId);
    const { error } = await supabase.from('project_teams').update({ status: 'declined' }).eq('id', teamId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation declined' });
      loadProjects();
    }
    setRespondingId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'open': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <FloatingLayout>
        <div className="min-h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </FloatingLayout>
    );
  }

  const allProjects = [...ownedProjects, ...projects];

  return (
    <FloatingLayout>
      <AppTopBar />
      <div className="h-full flex flex-col min-h-[calc(100vh-3rem)]">
        {/* Header */}
        <header className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-semibold">My Projects</h1>
              <p className="text-xs text-muted-foreground">Projects you own or are part of</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                Pending Invitations ({pendingInvites.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingInvites.map((invite, index) => (
                  <motion.div
                    key={invite.team_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-panel p-5 border-primary/50 ring-2 ring-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)] relative"
                  >
                    <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-lg animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      New Invite
                    </div>
                    <h3 className="font-semibold line-clamp-1 mb-1">{invite.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {invite.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                        {invite.owner_avatar ? (
                          <img src={invite.owner_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        From {invite.owner_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvite(invite.team_id)}
                        disabled={respondingId === invite.team_id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {respondingId === invite.team_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accept</>}
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite.team_id)}
                        disabled={respondingId === invite.team_id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {allProjects.length === 0 && pendingInvites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                You haven't joined or created any projects yet. Start by exploring opportunities or creating your own project.
              </p>
              <div className="flex gap-3">
                <GlassButton onClick={() => navigate('/admin')}>
                  Find Projects
                </GlassButton>
                <GlassButton variant="primary" onClick={() => navigate('/demand')}>
                  Create Project
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Owned Projects */}
              {ownedProjects.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Projects You Own ({ownedProjects.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {ownedProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-panel p-5 cursor-pointer group hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold line-clamp-1">{project.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(project.status)}`}>
                            {project.status || 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {project.team_count} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(project.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Team Member Projects */}
              {projects.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    Projects You're On ({projects.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-panel p-5 cursor-pointer group hover:border-accent/50 transition-colors"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold line-clamp-1">{project.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(project.status)}`}>
                            {project.status || 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                            {project.owner.avatar_url ? (
                              <img src={project.owner.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {project.owner.full_name || 'Unknown'} • {project.role_in_project || 'Team Member'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {project.team_count} members
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </FloatingLayout>
  );
}
