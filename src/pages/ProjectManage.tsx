import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Send, Clock, CheckCircle2 } from 'lucide-react';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { ProjectDetail } from '@/components/ProjectDetail';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  cluster_id: string | null;
}

type AccessState = 'loading' | 'granted' | 'apply' | 'pending' | 'no-access';

export default function ProjectManage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<AccessState>('loading');
  const [isOwner, setIsOwner] = useState(false);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [adminClusterId, setAdminClusterId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (authLoading || !user || !projectId) return;

      // Get profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileErr) {
        // Transient error (e.g. session still restoring) — stay on page, retry will happen on next auth tick
        return;
      }

      if (!profile) {
        setAccessState('no-access');
        return;
      }

      setProfileId(profile.id);

      // Get project
      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        // Transient — don't redirect
        return;
      }
      if (!projectData) {
        setAccessState('no-access');
        return;
      }

      setProject(projectData);
      setIsOwner(projectData.owner_id === profile.id);

      // Check if user is part of the team (owner or team member)
      const { data: teamMember } = await supabase
        .from('project_teams')
        .select('id, status, role_in_project')
        .eq('project_id', projectId)
        .eq('profile_id', profile.id)
        .limit(1)
        .maybeSingle();

      let hasAccess = false;
      let localCanManage = false;
      let managerOrgRole: 'owner' | 'admin' | null = null;
      let matchedAdminClusterId: string | null = null;

      // Project owner always has access
      if (projectData.owner_id === profile.id) {
        hasAccess = true;
      }

      // Accepted team member has access; project_manager role grants manage rights
      if (teamMember && teamMember.status === 'accepted') {
        hasAccess = true;
        if ((teamMember.role_in_project || '').toLowerCase() === 'project_manager') {
          localCanManage = true;
        }
      }

      // If they applied but not yet accepted, show pending state
      if (teamMember && teamMember.status === 'applied') {
        setProject(projectData);
        setAccessState('pending');
        return;
      }

      // Check access/permissions in project's own cluster
      if (projectData.cluster_id) {
          const { data: enrollment } = await supabase
            .from('cluster_enrollments')
            .select('cluster_id, role')
            .eq('cluster_id', projectData.cluster_id)
            .eq('profile_id', profile.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle();

        if (enrollment) {
            const { data: permData } = await supabase
              .from('role_permissions')
              .select('is_enabled')
              .eq('cluster_id', projectData.cluster_id)
              .eq('role', enrollment.role)
              .eq('permission_key', 'action_enter_any_project')
              .limit(1)
              .maybeSingle();

          const defaultCanEnter = ['owner', 'admin', 'project_manager'].includes(enrollment.role);
          // CheckGrow owners and admins always have full access — permission toggles cannot lock them out
          const isOrgAdminOrOwner = ['owner', 'admin'].includes(enrollment.role);
          const canEnter = isOrgAdminOrOwner ? true : (permData ? permData.is_enabled : defaultCanEnter);

          if (canEnter) {
            hasAccess = true;
            // Admins/owners can manage; PMs can only view
            if (isOrgAdminOrOwner) {
              localCanManage = true;
              managerOrgRole = enrollment.role as 'owner' | 'admin';
              matchedAdminClusterId = enrollment.cluster_id;
            }
          } else if (!hasAccess) {
            // User is in the cluster but doesn't have enter permission → show apply
            setProject(projectData);
            setAccessState('apply');
            return;
          }
        }
      }

      // For inbound projects: check admin/owner manage permissions in clusters
      // where this project has owner/team overlap
      if (!localCanManage && !hasAccess) {
        const { data: userEnrollments } = await supabase
          .from('cluster_enrollments')
          .select('cluster_id, role')
          .eq('profile_id', profile.id)
          .eq('status', 'approved');

        if (userEnrollments && userEnrollments.length > 0) {
          for (const enrollment of userEnrollments) {
            const { data: permData } = await supabase
              .from('role_permissions')
              .select('is_enabled')
              .eq('cluster_id', enrollment.cluster_id)
              .eq('role', enrollment.role)
              .eq('permission_key', 'action_enter_any_project')
              .limit(1)
              .maybeSingle();

            const defaultCanEnter = ['owner', 'admin', 'project_manager'].includes(enrollment.role);
            const canEnter = permData ? permData.is_enabled : defaultCanEnter;
            if (!canEnter) continue;

            const { data: orgMembers } = await supabase
              .from('cluster_enrollments')
              .select('profile_id')
              .eq('cluster_id', enrollment.cluster_id)
              .eq('status', 'approved');

            if (!orgMembers) continue;

            const orgProfileIds = orgMembers.map(m => m.profile_id);

            if (orgProfileIds.includes(projectData.owner_id)) {
              hasAccess = true;
              if (['owner', 'admin'].includes(enrollment.role)) {
                localCanManage = true;
                managerOrgRole = enrollment.role as 'owner' | 'admin';
              }
              matchedAdminClusterId = enrollment.cluster_id;
              break;
            }

            const { data: matchedTeam } = await supabase
              .from('project_teams')
              .select('id')
              .eq('project_id', projectId)
              .in('profile_id', orgProfileIds)
              .limit(1);

            if (matchedTeam && matchedTeam.length > 0) {
              hasAccess = true;
              if (['owner', 'admin'].includes(enrollment.role)) {
                localCanManage = true;
                managerOrgRole = enrollment.role as 'owner' | 'admin';
              }
              matchedAdminClusterId = enrollment.cluster_id;
              break;
            }
          }
        }
      }

      if (!hasAccess) {
        // Check if user is at least in the same cluster — they can apply
        if (projectData.cluster_id) {
          const { data: clusterMember } = await supabase
            .from('cluster_enrollments')
            .select('id')
            .eq('cluster_id', projectData.cluster_id)
            .eq('profile_id', profile.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle();

          if (clusterMember) {
            setProject(projectData);
            setAccessState('apply');
            return;
          }
        }
        setAccessState('no-access');
        return;
      }

      setCanManageTeam(localCanManage);
      if (matchedAdminClusterId) {
        setAdminClusterId(matchedAdminClusterId);
      }

      // Org admins/owners can enter any project at will via permissions —
      // we DO NOT auto-add them to project_teams. They appear in the team
      // list only if explicitly invited or if they manually join.

      // Ensure the project owner has a team entry, but never overwrite their role label.
      const { data: ownerEntry } = await supabase
        .from('project_teams')
        .select('id')
        .eq('project_id', projectId)
        .eq('profile_id', projectData.owner_id)
        .limit(1)
        .maybeSingle();

      if (!ownerEntry) {
        await supabase.from('project_teams').insert({
          project_id: projectId,
          profile_id: projectData.owner_id,
          role_in_project: null,
          status: 'accepted',
        });
      }

      setAccessState('granted');
    };

    if (!authLoading && user) loadData();
  }, [user, authLoading, projectId, navigate]);

  const handleApply = async () => {
    if (!profileId || !projectId) return;
    setIsApplying(true);

    const { error } = await supabase.from('project_teams').insert({
      project_id: projectId,
      profile_id: profileId,
      role_in_project: null,
      status: 'applied',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsApplying(false);
      return;
    }

    toast({ title: 'Application sent!', description: 'Your request to join this project has been submitted.' });
    setAccessState('pending');
    setIsApplying(false);
  };

  const handleBack = () => {
    if (project?.cluster_id) {
      navigate('/admin', { state: { activeTab: 'projects' } });
    } else {
      navigate('/admin');
    }
  };

  const handleProjectUpdate = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (data) setProject(data);
  };

  if (authLoading || accessState === 'loading') {
    return (
      <FloatingLayout>
        <div className="min-h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </FloatingLayout>
    );
  }

  // Apply gate — member is in the cluster but not on the team
  if (accessState === 'apply' && project) {
    return (
      <FloatingLayout>
        <AppTopBar />
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              You're not a member of this project yet. Apply to join and the project lead will review your request.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleApply} disabled={isApplying} className="rounded-full">
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Apply to join
              </Button>
              <Button variant="ghost" onClick={handleBack} className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go back
              </Button>
            </div>
          </div>
        </div>
      </FloatingLayout>
    );
  }

  // Pending state — already applied
  if (accessState === 'pending' && project) {
    return (
      <FloatingLayout>
        <AppTopBar />
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
            <p className="text-sm text-muted-foreground">
              Your application to join this project has been submitted. You'll be notified once it's reviewed.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Application pending
            </div>
            <Button variant="ghost" onClick={handleBack} className="rounded-full mt-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Button>
          </div>
        </div>
      </FloatingLayout>
    );
  }

  // No access at all
  if (accessState === 'no-access') {
    return (
      <FloatingLayout>
        <AppTopBar />
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have access to this project.</p>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </FloatingLayout>
    );
  }

  if (!project || !profileId) {
    return (
      <FloatingLayout>
        <div className="min-h-full flex items-center justify-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </FloatingLayout>
    );
  }

  return (
    <FloatingLayout>
      <AppTopBar />
      <ProjectDetail
        project={project}
        profileId={profileId}
        isOwner={isOwner}
        canManageTeam={canManageTeam}
        adminClusterId={adminClusterId}
        onBack={handleBack}
        onProjectUpdate={handleProjectUpdate}
      />
    </FloatingLayout>
  );
}
