import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Loader2, Users, Calendar, Plus, ExternalLink, Trash2, Trophy, Pencil, Bot, Hand, Sparkles, Check, X, Info, MessageSquare, Send, User, ArrowDownToLine, Archive, ArchiveRestore } from 'lucide-react';
import { MentionInput } from '@/components/crm/MentionInput';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassButton } from '@/components/GlassCard';
import { CreateProjectModal } from './CreateProjectModal';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ProjectInfoPanel } from './ProjectInfoPanel';

interface Project {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  source: string;
  is_forge?: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  project_teams: {
    id: string;
    profile_id: string;
    status: string | null;
    role_in_project: string | null;
    profiles?: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

// Types removed - no longer needed

interface InboundProject {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  source: string;
  owner: { full_name: string | null; avatar_url: string | null } | null;
  matched_members: { profile_id: string; full_name: string | null; avatar_url: string | null; role_in_project: string | null; status: string | null }[];
}

interface OrgProjectsProps {
  clusterId: string;
  canView: boolean;
  canManage?: boolean;
  profileId?: string;
  userRole?: string;
  canEnterAnyProject?: boolean;
  canApplyToProjects?: boolean;
  canDeleteProjects?: boolean;
  canViewInboundProjects?: boolean;
  canManageProjectTeams?: boolean;
}

export function OrgProjects({ 
  clusterId, canView, canManage = false, profileId, userRole,
  canEnterAnyProject = false,
  canApplyToProjects: canApplyProp,
  canDeleteProjects = false,
  canViewInboundProjects = false,
  canManageProjectTeams = false,
}: OrgProjectsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [inboundProjects, setInboundProjects] = useState<InboundProject[]>([]);
  const [dealLinkedProjectIds, setDealLinkedProjectIds] = useState<Set<string>>(new Set());
  const [appliedProjectIds, setAppliedProjectIds] = useState<Set<string>>(new Set());
  const [orgMemberProfiles, setOrgMemberProfiles] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [clusterAdmins, setClusterAdmins] = useState<Record<string, { full_name: string | null; avatar_url: string | null; role: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInbound, setIsLoadingInbound] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [unapplyingId, setUnapplyingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [infoOpenId, setInfoOpenId] = useState<string | null>(null);
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null);
  const [projectComments, setProjectComments] = useState<Record<string, any[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [newProjectComment, setNewProjectComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [unreadProjectIds, setUnreadProjectIds] = useState<Set<string>>(new Set());

  // Use prop if provided, otherwise fall back to role-based default
  const canApplyToProjects = canApplyProp !== undefined 
    ? canApplyProp 
    : !['owner', 'admin'].includes(userRole || '');
  const isAdminOrOwner = ['owner', 'admin'].includes(userRole || '');

  useEffect(() => {
    if (canView) {
      loadProjects();
      loadInboundProjects();
      loadOrgMembersForMention();
    }
  }, [clusterId, canView]);

  const loadOrgMembersForMention = async () => {
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('role, profiles:profile_id(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    if (data) {
      setOrgMemberProfiles(data.map((d: any) => d.profiles).filter(Boolean));
      const admins: Record<string, { full_name: string | null; avatar_url: string | null; role: string }> = {};
      data.forEach((d: any) => {
        if (d.profiles && (d.role === 'owner' || d.role === 'admin')) {
          admins[d.profiles.id] = {
            full_name: d.profiles.full_name,
            avatar_url: d.profiles.avatar_url,
            role: d.role,
          };
        }
      });
      setClusterAdmins(admins);
    }
  };

  const loadProjects = async () => {
    setIsLoading(true);

    // Load all projects linked to this organization
    const { data: clusterProjects } = await supabase
      .from('projects')
      .select(`
        id, title, description, requirements, status, created_at, owner_id, source, is_forge,
        profiles:owner_id ( full_name, avatar_url ),
        project_teams ( id, profile_id, status, role_in_project, profiles:profile_id ( full_name, avatar_url ) )
      `)
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });

    let sortedProjects = (clusterProjects || []) as unknown as Project[];
    // Members only see projects they own or are a team member of (accepted or pending)
    if (!isAdminOrOwner && profileId) {
      sortedProjects = sortedProjects.filter(p =>
        p.owner_id === profileId ||
        p.project_teams?.some(t => t.profile_id === profileId)
      );
    }
    setProjects(sortedProjects);

    // Check deal links, user applications, and comment counts
    const projectIds = sortedProjects.map(p => p.id);
    if (projectIds.length > 0) {
      const [{ data: linkedDeals }, { data: myApplications }, { data: commentData }, { data: unreadNotifs }] = await Promise.all([
        supabase
          .from('crm_deals')
          .select('project_id')
          .in('project_id', projectIds)
          .not('project_id', 'is', null),
        profileId ? supabase
          .from('project_teams')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('profile_id', profileId) : Promise.resolve({ data: [] }),
        (supabase as any)
          .from('project_comments')
          .select('project_id')
          .in('project_id', projectIds),
        profileId ? supabase
          .from('notifications')
          .select('link_id')
          .eq('recipient_id', profileId)
          .eq('is_read', false)
          .eq('link_type', 'project')
          .in('link_id', projectIds) : Promise.resolve({ data: [] }),
      ]);

      setDealLinkedProjectIds(new Set((linkedDeals || []).map((d: any) => d.project_id as string)));
      setAppliedProjectIds(new Set((myApplications || []).map((a: any) => a.project_id as string)));
      
      // Count comments per project
      const counts: Record<string, number> = {};
      (commentData || []).forEach((c: any) => {
        counts[c.project_id] = (counts[c.project_id] || 0) + 1;
      });
      setCommentCounts(counts);
      setUnreadProjectIds(new Set((unreadNotifs || []).map((n: any) => n.link_id as string)));
    }

    setIsLoading(false);
  };

  const loadInboundProjects = async () => {
    setIsLoadingInbound(true);

    // Get all org member profile IDs
    const { data: enrollments } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');

    if (!enrollments || enrollments.length === 0) {
      setIsLoadingInbound(false);
      return;
    }

    const orgProfileIds = enrollments.map(e => e.profile_id);

    // Find project_teams entries for org members AND projects owned by org members
    const [{ data: teamEntries }, { data: ownedProjects }] = await Promise.all([
      supabase
        .from('project_teams')
        .select('project_id, profile_id, role_in_project, status')
        .in('profile_id', orgProfileIds),
      supabase
        .from('projects')
        .select('id, title, description, status, created_at, source, owner_id, cluster_id, profiles:owner_id(full_name, avatar_url)')
        .in('owner_id', orgProfileIds),
    ]);

    // Collect all project IDs from team entries
    const teamProjectIds = new Set((teamEntries || []).map(t => t.project_id));
    
    // Add owned project IDs
    const ownedProjectIds = new Set((ownedProjects || []).map(p => p.id));
    
    // Combined unique project IDs
    const allProjectIds = [...new Set([...teamProjectIds, ...ownedProjectIds])];

    if (allProjectIds.length === 0) {
      setInboundProjects([]);
      setIsLoadingInbound(false);
      return;
    }

    // Load projects that we only have from team entries (owned ones already loaded)
    const teamOnlyIds = allProjectIds.filter(id => !ownedProjectIds.has(id));
    let allExternalProjects = [...(ownedProjects || [])];
    
    if (teamOnlyIds.length > 0) {
      const { data: teamProjects } = await supabase
        .from('projects')
        .select('id, title, description, status, created_at, source, owner_id, cluster_id, profiles:owner_id(full_name, avatar_url)')
        .in('id', teamOnlyIds);
      if (teamProjects) allExternalProjects.push(...teamProjects);
    }

    // Filter to only projects NOT belonging to this cluster
    const filteredProjects = allExternalProjects.filter(p => p.cluster_id !== clusterId);

    // Build profile lookup from enrollments
    const profileMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
    enrollments.forEach(e => {
      const prof = e.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
      if (prof) profileMap.set(e.profile_id, prof);
    });

    const result: InboundProject[] = filteredProjects.map(project => {
      // Get team entries for this project
      const matchedTeam = (teamEntries || [])
        .filter(t => t.project_id === project.id && orgProfileIds.includes(t.profile_id))
        .map(t => {
          const prof = profileMap.get(t.profile_id);
          return {
            profile_id: t.profile_id,
            full_name: prof?.full_name || null,
            avatar_url: prof?.avatar_url || null,
            role_in_project: t.role_in_project,
            status: t.status,
          };
        });

      // Also include the owner if they're an org member and not already in team entries
      if (orgProfileIds.includes(project.owner_id) && !matchedTeam.some(m => m.profile_id === project.owner_id)) {
        const prof = profileMap.get(project.owner_id);
        matchedTeam.unshift({
          profile_id: project.owner_id,
          full_name: prof?.full_name || null,
          avatar_url: prof?.avatar_url || null,
          role_in_project: 'Project Lead',
          status: 'accepted',
        });
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        created_at: project.created_at,
        source: project.source,
        owner: project.profiles as unknown as { full_name: string | null; avatar_url: string | null } | null,
        matched_members: matchedTeam,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setInboundProjects(result);
    setIsLoadingInbound(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    
    if (confirmDeleteId === projectId) {
      // Second click - actually delete
      performDelete(projectId);
    } else {
      // First click - show confirmation state
      setConfirmDeleteId(projectId);
    }
  };

  const performDelete = async (projectId: string) => {
    if (!profileId) return;
    setDeletingId(projectId);

    const { data, error } = await supabase.rpc('delete_project_cascade', {
      _project_id: projectId,
      _caller_profile_id: profileId,
    });

    if (error || data === false) {
      toast({ title: 'Error deleting project', description: error?.message || 'Permission denied', variant: 'destructive' });
    } else {
      toast({ title: 'Project deleted' });
      // Immediately update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setInboundProjects(prev => prev.filter(p => p.id !== projectId));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleApplyToProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!profileId) return;
    setApplyingId(projectId);

    const { error } = await supabase
      .from('project_teams')
      .insert({
        project_id: projectId,
        profile_id: profileId,
        status: 'applied',
        role_in_project: 'Team Member',
      });

    if (error) {
      toast({ title: 'Error applying', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Application sent!', description: 'The project owner will review your application.' });
      setAppliedProjectIds(prev => new Set([...prev, projectId]));
    }
    setApplyingId(null);
  };

  const handleUnapplyFromProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!profileId) return;
    setUnapplyingId(projectId);

    const { error } = await supabase
      .from('project_teams')
      .delete()
      .eq('project_id', projectId)
      .eq('profile_id', profileId)
      .eq('status', 'applied');

    if (error) {
      toast({ title: 'Error withdrawing application', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Application withdrawn' });
      setAppliedProjectIds(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
    setUnapplyingId(null);
  };

  const handleAcceptInvite = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!profileId) return;
    const teamEntry = projects.find(p => p.id === projectId)?.project_teams?.find(
      m => m.profile_id === profileId && m.status === 'proposed'
    );
    if (!teamEntry) return;
    setRespondingId(teamEntry.id);
    const { error } = await supabase.from('project_teams').update({ status: 'accepted' }).eq('id', teamEntry.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation accepted! 🎉' });
      loadProjects();
    }
    setRespondingId(null);
  };

  const handleDeclineInvite = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!profileId) return;
    const teamEntry = projects.find(p => p.id === projectId)?.project_teams?.find(
      m => m.profile_id === profileId && m.status === 'proposed'
    );
    if (!teamEntry) return;
    setRespondingId(teamEntry.id);
    const { error } = await supabase.from('project_teams').update({ status: 'declined' }).eq('id', teamEntry.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation declined' });
      loadProjects();
    }
    setRespondingId(null);
  };

  const handleJoinProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!profileId) return;
    setJoiningId(projectId);

    // Check if already a team member
    const { data: existing } = await supabase
      .from('project_teams')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('profile_id', profileId)
      .single();

    if (existing) {
      if (existing.status !== 'accepted') {
        // Update existing entry to accepted
        await supabase.from('project_teams').update({ status: 'accepted' }).eq('id', existing.id);
      }
    } else {
      // Insert new entry as accepted
      await supabase.from('project_teams').insert({
        project_id: projectId,
        profile_id: profileId,
        role_in_project: 'Admin',
        status: 'accepted',
      });
    }

    toast({ title: 'Joined project ✓' });
    setJoiningId(null);
    navigate(`/project/${projectId}`);
  };

  const loadProjectComments = async (projectId: string) => {
    const { data } = await (supabase as any)
      .from('project_comments')
      .select('id, content, created_at, author_id, profiles:author_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (data) setProjectComments(prev => ({ ...prev, [projectId]: data }));
  };

  const handleToggleComments = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (commentsOpenId === projectId) {
      setCommentsOpenId(null);
    } else {
      setCommentsOpenId(projectId);
      loadProjectComments(projectId);
    }
    setNewProjectComment('');
  };

  const handleAddProjectComment = async (projectId: string, commentText?: string) => {
    const text = commentText || newProjectComment;
    if (!text.trim() || !profileId) return;
    setIsSendingComment(true);
    const { error } = await (supabase as any).from('project_comments').insert({
      project_id: projectId,
      author_id: profileId,
      content: text.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewProjectComment('');
      loadProjectComments(projectId);
      setCommentCounts(prev => ({ ...prev, [projectId]: (prev[projectId] || 0) + 1 }));
    }
    setIsSendingComment(false);
  };

  const [markingWonId, setMarkingWonId] = useState<string | null>(null);
  const [togglingForgeId, setTogglingForgeId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleToggleArchive = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const isArchived = project.status === 'archived';
    const next = isArchived ? 'open' : 'archived';
    setArchivingId(project.id);
    const { error } = await supabase.from('projects').update({ status: next }).eq('id', project.id);
    setArchivingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: next } : p));
      toast({ title: isArchived ? 'Project restored' : 'Project archived' });
    }
  };



  const handleToggleForge = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const next = !project.is_forge;
    setTogglingForgeId(project.id);
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_forge: next } : p));
    const { error } = await supabase.from('projects').update({ is_forge: next } as any).eq('id', project.id);
    setTogglingForgeId(null);
    if (error) {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_forge: !next } : p));
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: next ? 'Forge mode enabled' : 'Forge mode disabled' });
    }
  };


  const handleMarkAsWonLead = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!profileId) return;
    if (dealLinkedProjectIds.has(project.id)) {
      toast({ title: 'Already linked to a deal', description: 'This project already has a CRM deal.' });
      return;
    }
    setMarkingWonId(project.id);
    const { error } = await supabase.from('crm_deals').insert({
      cluster_id: clusterId,
      title: project.title,
      description: `Won lead from project: ${project.title}`,
      stage: 'won',
      project_id: project.id,
      created_by: profileId,
      closed_at: new Date().toISOString(),
      probability: 100,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Marked as Won Lead 🏆', description: 'Added to the sales pipeline under Won.' });
      setDealLinkedProjectIds(prev => new Set([...prev, project.id]));
    }
    setMarkingWonId(null);
  };

  const handleDeleteProjectComment = async (e: React.MouseEvent, commentId: string, projectId: string) => {
    e.stopPropagation();
    await (supabase as any).from('project_comments').delete().eq('id', commentId);
    loadProjectComments(projectId);
    setCommentCounts(prev => ({ ...prev, [projectId]: Math.max(0, (prev[projectId] || 1) - 1) }));
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'open': return 'bg-primary/20 text-primary';
      case 'in_progress': return 'bg-accent/20 text-accent-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'archived': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const archivedCount = projects.filter(p => p.status === 'archived').length;
  const visibleProjects = showArchived ? projects : projects.filter(p => p.status !== 'archived');


  if (!canView) {
    return (
      <div className="glass-panel p-8 text-center">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">You don't have access to view projects</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Organization Projects</h2>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                showArchived ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {showArchived ? 'Hide archived' : `Archived (${archivedCount})`}
            </button>
          )}
          {canManage && profileId && (
            <GlassButton variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </GlassButton>
          )}
        </div>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No projects in this organization yet</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Create your first project to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleProjects.map((project) => {
            const acceptedMembers = project.project_teams?.filter(m => m.status === 'accepted').length || 0;
            const totalMembers = project.project_teams?.length || 0;
            const isFromDeal = dealLinkedProjectIds.has(project.id);
            const hasPendingInvite = profileId && project.project_teams?.some(
              m => m.profile_id === profileId && m.status === 'proposed'
            );
            // Responsible = only the person assigned as Project Manager inside the project
            const pmEntry = project.project_teams?.find(
              m => m.status === 'accepted' && (m.role_in_project || '').toLowerCase().replace(/[\s-]+/g, '_') === 'project_manager'
            );
            const pmProfile = pmEntry?.profiles || (pmEntry ? orgMemberProfiles.find(p => p.id === pmEntry.profile_id) : null);
            const responsiblePm = pmEntry
              ? {
                  id: pmEntry.profile_id,
                  full_name: pmProfile?.full_name ?? null,
                  avatar_url: pmProfile?.avatar_url ?? null,
                }
              : null;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel p-3 hover:border-primary/30 transition-colors cursor-pointer group relative flex flex-col gap-2 ${
                  project.is_forge ? 'forge-mode' : ''
                } ${
                  hasPendingInvite ? '!overflow-visible border-primary/50 ring-2 ring-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]' : ''
                } ${unreadProjectIds.has(project.id) && !hasPendingInvite ? 'ring-1 ring-primary/40 shadow-[0_0_12px_2px_hsl(var(--primary)/0.25)] animate-pulse' : ''}`}
                style={unreadProjectIds.has(project.id) && !hasPendingInvite ? { animationDuration: '2.5s' } : undefined}
                onClick={() => {
                  if (unreadProjectIds.has(project.id) && profileId) {
                    supabase.from('notifications').update({ is_read: true })
                      .eq('recipient_id', profileId).eq('link_type', 'project').eq('link_id', project.id).eq('is_read', false)
                      .then(() => setUnreadProjectIds(prev => { const n = new Set(prev); n.delete(project.id); return n; }));
                  }
                  navigate(`/project/${project.id}`);
                }}
              >
                {/* Pending invite badge */}
                {hasPendingInvite && (
                  <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-lg z-10">
                    <Sparkles className="w-3 h-3" />
                    You're invited!
                  </div>
                )}

                {/* HEADER: title + status pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-semibold text-sm truncate leading-tight">{project.title}</h3>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {project.source === 'demand_agent' ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-accent/40 text-accent-foreground gap-1">
                          <Bot className="w-3 h-3" /> AI Agent
                        </Badge>
                      ) : project.source === 'crm_deal' ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500/40 text-green-400 gap-1">
                          <Trophy className="w-3 h-3" /> Won Lead
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/40 text-primary gap-1">
                          <Pencil className="w-3 h-3" /> Manual
                        </Badge>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(project.status)}`}>
                        {project.status || 'draft'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RESPONSIBLE PM RIBBON */}
                {responsiblePm && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 shadow-[0_0_18px_hsl(var(--primary)/0.14)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-primary font-bold">
                        Project Manager
                      </span>
                      <span className="h-px flex-1 bg-primary/25" />
                    </div>
                    <span
                      className="mt-1.5 flex w-fit max-w-full items-center gap-2 rounded-full border border-primary/40 bg-background/70 px-2 py-1 text-[11px] font-semibold text-foreground"
                      title={responsiblePm.full_name || 'Project Manager'}
                    >
                      {responsiblePm.avatar_url ? (
                        <img src={responsiblePm.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover ring-2 ring-primary/35" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/35">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <span className="truncate max-w-[150px]">{responsiblePm.full_name || 'Assigned PM'}</span>
                    </span>
                  </div>
                )}

                {/* DESCRIPTION */}
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* META: owner · members · date */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1 min-w-0">
                    {project.profiles?.avatar_url ? (
                      <img src={project.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <Users className="w-2.5 h-2.5" />
                      </div>
                    )}
                    <span className="truncate">{project.profiles?.full_name || 'Unknown'}</span>
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{acceptedMembers}/{totalMembers}</span>
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* ACTION BAR */}
                <div className="flex items-center gap-1 pt-2 border-t border-border/30 -mx-1 px-1">
                  <button
                    onClick={(e) => handleToggleComments(e, project.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                      commentsOpenId === project.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{commentCounts[project.id] || 0}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoOpenId(infoOpenId === project.id ? null : project.id);
                    }}
                    className={`p-1.5 rounded-md transition-colors ${
                      infoOpenId === project.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                    title="Project info & resources"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {canManage && (
                    <button
                      onClick={(e) => handleToggleArchive(e, project)}
                      disabled={archivingId === project.id}
                      className={`p-1.5 rounded-md transition-colors ${
                        project.status === 'archived' ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                      title={project.status === 'archived' ? 'Restore project' : 'Archive project'}
                    >
                      {archivingId === project.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : project.status === 'archived' ? (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  <div className="ml-auto flex items-center gap-1.5">

                    {canManage && (
                      <button
                        onClick={(e) => handleToggleForge(e, project)}
                        disabled={togglingForgeId === project.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          project.is_forge
                            ? 'border-[#4B3DDB]/50 bg-[#4B3DDB]/10 text-[#4B3DDB]'
                            : 'border-border/50 text-muted-foreground hover:border-[#4B3DDB]/40 hover:text-[#4B3DDB]'
                        }`}
                        title={project.is_forge ? 'Remove Forge badge' : 'Mark as Forge'}
                      >
                        {togglingForgeId === project.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            {project.is_forge ? <Check className="w-3 h-3" /> : null}
                            Forge
                          </>
                        )}
                      </button>
                    )}
                    {canManage && !dealLinkedProjectIds.has(project.id) && (
                      <button
                        onClick={(e) => handleMarkAsWonLead(e, project)}
                        disabled={markingWonId === project.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all"
                        title="Mark as Won Lead — adds to CRM sales pipeline under Won"
                      >
                        {markingWonId === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (<><Trophy className="w-3 h-3" /> Mark Won</>)}
                      </button>
                    )}
                    {canManage && dealLinkedProjectIds.has(project.id) && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                        <Trophy className="w-3 h-3" /> Won
                      </span>
                    )}
                    {(() => {
                      const isAlreadyMember = profileId && project.project_teams?.some(
                        m => m.profile_id === profileId && m.status === 'accepted'
                      );
                      const isProjectOwner = profileId && project.owner_id === profileId;
                      if (isAlreadyMember || isProjectOwner) return null;

                      if (canEnterAnyProject && profileId) {
                        return (
                          <button
                            onClick={(e) => handleJoinProject(e, project.id)}
                            disabled={joiningId === project.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                            title="Join and enter this project"
                          >
                            {joiningId === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (<><ArrowDownToLine className="w-3 h-3" />Enter</>)}
                          </button>
                        );
                      }

                      if (canApplyToProjects && profileId) {
                        return appliedProjectIds.has(project.id) ? (
                          <button
                            onClick={(e) => handleUnapplyFromProject(e, project.id)}
                            disabled={unapplyingId === project.id}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1.5 rounded-full bg-muted/80 border border-border/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                            title="Withdraw application"
                          >
                            {unapplyingId === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>✓ Applied</>}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleApplyToProject(e, project.id)}
                            disabled={applyingId === project.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                            title="Apply to join this project"
                          >
                            {applyingId === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (<><Hand className="w-3 h-3" />Apply</>)}
                          </button>
                        );
                      }
                      return null;
                    })()}
                    {canDeleteProjects && (
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        disabled={deletingId === project.id}
                        className={`p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 ${
                          confirmDeleteId === project.id
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/20'
                        }`}
                        title={confirmDeleteId === project.id ? 'Click again to confirm deletion' : 'Delete project'}
                      >
                        {deletingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Project Info Panel */}
                <AnimatePresence>
                  {infoOpenId === project.id && (
                    <ProjectInfoPanel
                      projectId={project.id}
                      canEdit={canManageProjectTeams || project.owner_id === profileId}
                      initialDescription={project.description}
                      initialRequirements={project.requirements}
                    />
                  )}
                </AnimatePresence>

                {/* Project Comments Section */}
                <AnimatePresence>
                  {commentsOpenId === project.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Comments
                        </h4>
                        {(projectComments[project.id] || []).length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {(projectComments[project.id] || []).map((c: any) => (
                              <div key={c.id} className="flex gap-2 group/comment">
                                {c.profiles?.avatar_url ? (
                                  <img src={c.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <User className="w-2.5 h-2.5 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-medium">{c.profiles?.full_name || 'User'}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                                  </div>
                                  <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
                                </div>
                                {c.author_id === profileId && (
                                  <button
                                    onClick={(e) => handleDeleteProjectComment(e, c.id, project.id)}
                                    className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
                        )}
                        {/* Add comment input */}
                        {profileId && (
                          <MentionInput
                            orgMembers={orgMemberProfiles}
                            onSubmit={(text) => handleAddProjectComment(project.id, text)}
                            isSubmitting={isSendingComment}
                            placeholder="Comment... use @ to mention"
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Accept / Decline buttons for pending invites */}
                {hasPendingInvite && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                    <button
                      onClick={(e) => handleAcceptInvite(e, project.id)}
                      disabled={respondingId !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {respondingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accept</>}
                    </button>
                    <button
                      onClick={(e) => handleDeclineInvite(e, project.id)}
                      disabled={respondingId !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Inbound Demand Projects */}
      {canViewInboundProjects && (
        <div className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Inbound Demand Projects</h2>
            <span className="text-xs text-muted-foreground ml-1">
              External projects where your members are matched
            </span>
          </div>

          {isLoadingInbound ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : inboundProjects.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <ArrowDownToLine className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No inbound demand projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When external projects match your organization members, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inboundProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{project.title}</h3>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {project.source === 'demand_agent' ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent/40 text-accent gap-1">
                            <Bot className="w-3 h-3" />
                            AI Agent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/40 text-muted-foreground gap-1">
                            External
                          </Badge>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusColor(project.status)}`}>
                          {project.status || 'draft'}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      {project.owner && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {project.owner.avatar_url ? (
                            <img src={project.owner.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-3 h-3" />
                            </div>
                          )}
                          <span>{project.owner.full_name || 'Unknown'}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                      </div>
                      {/* Delete inbound project */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmDeleteId === project.id) {
                            performDelete(project.id);
                          } else {
                            setConfirmDeleteId(project.id);
                          }
                        }}
                        disabled={deletingId === project.id}
                        className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                          confirmDeleteId === project.id
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 !opacity-100'
                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/20'
                        }`}
                        title={confirmDeleteId === project.id ? 'Click again to confirm' : 'Delete project'}
                      >
                        {deletingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Matched Members */}
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Matched Members ({project.matched_members.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.matched_members.map((member) => (
                        <div
                          key={member.profile_id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium">
                              {member.full_name?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium leading-tight">{member.full_name || 'Unknown'}</p>
                            <div className="flex items-center gap-1">
                              {member.role_in_project && (
                                <span className="text-[10px] text-muted-foreground">{member.role_in_project}</span>
                              )}
                              {member.status && (
                                <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                                  member.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                  member.status === 'proposed' ? 'bg-amber-500/20 text-amber-400' :
                                  member.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {member.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && profileId && (
          <CreateProjectModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            clusterId={clusterId}
            profileId={profileId}
            onProjectCreated={loadProjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
