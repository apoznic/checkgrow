import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, Users, Building2, Loader2, Plus, Home,
  Megaphone, FileText, UserCircle, TrendingUp,
  ChevronRight, Settings, Menu, X, Shield, Linkedin, Bell, ClipboardList, Plug, Sparkles, Database
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/crm/NotificationBell';
import { Logo } from '@/components/Logo';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrgMembers } from '@/components/organization/OrgMembers';
import { MemberSkillsView } from '@/components/organization/MemberSkillsView';
import { OrgAnnouncements } from '@/components/organization/OrgAnnouncements';
import { OrgResources } from '@/components/organization/OrgResources';
import { MemberTaskBoard } from '@/components/organization/MemberTaskBoard';
import { OrgSettings } from '@/components/organization/OrgSettings';
import { OrgIntegrations } from '@/components/organization/OrgIntegrations';
import { RolePermissions } from '@/components/organization/RolePermissions';
import { SettingsHub } from '@/components/organization/SettingsHub';
import { MyAssignments, useAssignmentCounts } from '@/components/organization/MyAssignments';
import { ContactList, DealList, CRMContactsBook } from '@/components/crm';
import { RegistryPanel } from '@/components/organization/RegistryPanel';


interface OrgMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  category: string | null;
}

type Tab = 'overview' | 'my-assignments' | 'members' | 'announcements' | 'resources' | 'team' | 'contacts' | 'contacts_book' | 'deals' | 'settings' | 'permissions' | 'integrations' | 'registry';

const normalizeRole = (role?: string | null) => (role || 'member').trim().toLowerCase();

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [adminClusters, setAdminClusters] = useState<Cluster[]>([]);
  const [memberClusters, setMemberClusters] = useState<{ cluster: Cluster; role: string }[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(() => {
    return sessionStorage.getItem('admin_selected_cluster') || null;
  });
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [clusterRoles, setClusterRoles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem('admin_active_tab');
    // Legacy defaults (overview, projects) now land on the Members board
    if (saved === 'overview' || saved === 'projects') return 'team';
    return (saved as Tab) || 'team';
  });
  const [deepLinkItemId, setDeepLinkItemId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({});
  const assignmentCount = useAssignmentCounts(selectedCluster, profileId);
  // Stats
  const [stats, setStats] = useState({
    members: 0,
    pending: 0,
    projects: 0,
    announcements: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
  });
  
  // Create organization state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Track if initial load has happened to avoid resetting selection on tab switch
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Read navigation state for active tab
  useEffect(() => {
    const state = location.state as { activeTab?: Tab } | null;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Persist active tab and selected cluster to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedCluster) {
      sessionStorage.setItem('admin_selected_cluster', selectedCluster);
    }
  }, [selectedCluster]);

  useEffect(() => {
    if (user && !hasInitiallyLoaded) {
      loadClusters();
    }
  }, [user, hasInitiallyLoaded]);

  useEffect(() => {
    if (selectedCluster) {
      loadStats();
      loadRolePermissions();

      // Real-time subscription for permission changes
      const permChannel = supabase
        .channel(`role-perms-${selectedCluster}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions', filter: `cluster_id=eq.${selectedCluster}` }, () => loadRolePermissions())
        .subscribe();

      return () => {
        supabase.removeChannel(permChannel);
      };
    }
  }, [selectedCluster, selectedRole]);

  const loadClusters = async () => {
    // Only show full loading spinner on first load, not on tab-switch re-fires
    if (!hasInitiallyLoaded) {
      setIsLoading(true);
    }
    
    // Get profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (profile) {
      setProfileId(profile.id);
    }
    
    // Get clusters where user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('cluster_id')
      .eq('user_id', user?.id)
      .eq('role', 'admin');

    const adminClusterIds = roleData?.map(r => r.cluster_id).filter(Boolean) || [];

    // Get ALL enrollments for this user
    let allEnrollments: { cluster_id: string; role: string; clusters: Cluster }[] = [];
    if (profile) {
      const { data: enrollments } = await supabase
        .from('cluster_enrollments')
        .select('cluster_id, role, clusters(id, name, description, logo_url, city, country, address, category)')
        .eq('profile_id', profile.id)
        .eq('status', 'approved');

      if (enrollments) {
        allEnrollments = enrollments as unknown as typeof allEnrollments;
      }
    }

    // Build admin clusters list
    if (adminClusterIds.length > 0) {
      const { data: clusters } = await supabase
        .from('clusters')
        .select('*')
        .in('id', adminClusterIds);

      if (clusters) {
        setAdminClusters(clusters);
      }
    } else {
      setAdminClusters([]);
    }

    // Member clusters = enrolled but NOT in admin list
    const memberClusterData = allEnrollments
      .filter(e => e.clusters && !adminClusterIds.includes(e.cluster_id))
      .map(e => ({
        cluster: e.clusters,
        role: e.role,
      }));
    setMemberClusters(memberClusterData);

    // Build cluster role map from enrollments
    const enrollmentRoles = new Map<string, string>();
    allEnrollments.forEach(e => {
      enrollmentRoles.set(e.cluster_id, e.role);
    });
    setClusterRoles(Object.fromEntries(enrollmentRoles));

    // Set default selection only on first load
    if (!hasInitiallyLoaded) {
      const savedCluster = sessionStorage.getItem('admin_selected_cluster');
      const allClusterIds = [...adminClusterIds, ...memberClusterData.map(mc => mc.cluster.id)];
      
      if (savedCluster && allClusterIds.includes(savedCluster)) {
        // Restore saved cluster and ALWAYS resolve role for that cluster
        if (!selectedCluster || selectedCluster !== savedCluster) {
          setSelectedCluster(savedCluster);
        }
        const savedRole = allEnrollments.find(e => e.cluster_id === savedCluster)?.role;
        setSelectedRole(normalizeRole(savedRole || (adminClusterIds.includes(savedCluster) ? 'admin' : 'member')));
      } else if (adminClusterIds.length > 0) {
        const firstClusterId = adminClusterIds[0];
        setSelectedCluster(firstClusterId);
        setSelectedRole(normalizeRole(enrollmentRoles.get(firstClusterId) || 'admin'));
      } else if (memberClusterData.length > 0) {
        setSelectedCluster(memberClusterData[0].cluster.id);
        setSelectedRole(normalizeRole(memberClusterData[0].role));
      }
      setHasInitiallyLoaded(true);
    } else if (selectedCluster) {
      // Update the role for the currently selected cluster in case it changed
      const enrollmentRole = enrollmentRoles.get(selectedCluster);
      if (enrollmentRole) {
        setSelectedRole(normalizeRole(enrollmentRole));
      }
    }
    
    setIsLoading(false);
  };

  const loadStats = async () => {
    if (!selectedCluster) return;

    const [membersRes, pendingRes, projectsRes, announcementsRes, contactsRes, dealsRes, tasksRes, orgMembersRes] = await Promise.all([
      supabase.from('cluster_enrollments').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster).eq('status', 'approved'),
      supabase.from('cluster_enrollments').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster).eq('status', 'pending'),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster),
      supabase.from('org_announcements').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster),
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster),
      supabase.from('crm_deals').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster),
      supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('cluster_id', selectedCluster).eq('status', 'pending'),
      supabase.from('cluster_enrollments')
        .select('profiles(id, full_name, avatar_url)')
        .eq('cluster_id', selectedCluster)
        .eq('status', 'approved'),
    ]);

    setStats({
      members: membersRes.count || 0,
      pending: pendingRes.count || 0,
      projects: projectsRes.count || 0,
      announcements: announcementsRes.count || 0,
      contacts: contactsRes.count || 0,
      deals: dealsRes.count || 0,
      tasks: tasksRes.count || 0,
    });

    if (orgMembersRes.data) {
      setOrgMembers(orgMembersRes.data.map(e => e.profiles as unknown as OrgMember).filter(Boolean));
    }
  };

  // Default permissions per role (fallback if no DB overrides exist)
  const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
    owner: ['tab_overview', 'tab_members', 'tab_announcements', 'tab_resources', 'tab_projects', 'tab_contacts_book', 'tab_linkedin_leads', 'tab_deals', 'tab_activities', 'tab_tasks', 'action_view_all_leads', 'action_manage_deals', 'action_approve_deals', 'action_manage_contacts', 'action_delete_org', 'view_finders_fee', 'view_project_compensation', 'view_monthly_compensation', 'view_equity_assignments', 'action_create_projects', 'action_enter_any_project', 'action_manage_project_teams', 'action_delete_projects', 'action_view_inbound_projects', 'action_manage_members', 'action_change_roles', 'action_manage_announcements', 'action_manage_resources', 'action_apply_to_projects'],
    admin: ['tab_overview', 'tab_members', 'tab_announcements', 'tab_resources', 'tab_projects', 'tab_contacts_book', 'tab_linkedin_leads', 'tab_deals', 'tab_activities', 'tab_tasks', 'action_view_all_leads', 'action_manage_deals', 'action_approve_deals', 'action_manage_contacts', 'view_finders_fee', 'view_project_compensation', 'view_monthly_compensation', 'view_equity_assignments', 'action_create_projects', 'action_enter_any_project', 'action_manage_project_teams', 'action_delete_projects', 'action_view_inbound_projects', 'action_manage_members', 'action_change_roles', 'action_manage_announcements', 'action_manage_resources'],
    project_manager: ['tab_overview', 'tab_members', 'tab_announcements', 'tab_resources', 'tab_projects', 'tab_contacts_book', 'tab_linkedin_leads', 'tab_deals', 'tab_activities', 'tab_tasks', 'action_view_all_leads', 'action_manage_deals', 'action_approve_deals', 'action_manage_contacts', 'view_finders_fee', 'view_project_compensation', 'view_monthly_compensation', 'view_equity_assignments', 'action_create_projects', 'action_enter_any_project', 'action_manage_project_teams', 'action_view_inbound_projects', 'action_apply_to_projects', 'action_manage_resources'],
    member: ['tab_overview', 'tab_members', 'tab_announcements', 'tab_resources', 'tab_projects', 'tab_contacts_book', 'tab_linkedin_leads', 'tab_deals', 'tab_activities', 'tab_tasks', 'action_apply_to_projects'],
  };

  const effectiveRole = normalizeRole(selectedRole);

  const loadRolePermissions = async () => {
    if (!selectedCluster || effectiveRole === 'owner') {
      const allPerms: Record<string, boolean> = {};
      (DEFAULT_ROLE_PERMS['owner'] || []).forEach(k => { allPerms[k] = true; });
      setRolePerms(allPerms);
      return;
    }

    const { data } = await supabase
      .from('role_permissions')
      .select('permission_key, is_enabled')
      .eq('cluster_id', selectedCluster)
      .eq('role', effectiveRole);

    // Start with defaults, then override with DB values
    const perms: Record<string, boolean> = {};
    const defaults = DEFAULT_ROLE_PERMS[effectiveRole] || [];
    (DEFAULT_ROLE_PERMS['owner'] || []).forEach(k => { perms[k] = defaults.includes(k); });

    if (data && data.length > 0) {
      data.forEach(d => { perms[d.permission_key] = d.is_enabled; });
    }
    setRolePerms(perms);
  };

  const hasPermission = (permKey: string) => effectiveRole === 'owner' || rolePerms[permKey] === true;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !user?.id || !profileId) return;
    
    setIsCreatingOrg(true);
    
    const { data: newCluster, error: clusterError } = await supabase
      .from('clusters')
      .insert({
        name: newOrgName.trim(),
        description: newOrgDescription.trim() || null,
      })
      .select()
      .single();

    if (clusterError) {
      toast({ title: 'Error creating organization', description: clusterError.message, variant: 'destructive' });
      setIsCreatingOrg(false);
      return;
    }

    // Add user_roles entry for admin access
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
        cluster_id: newCluster.id,
      });

    // Add cluster_enrollment with 'owner' role
    const { error: enrollError } = await supabase
      .from('cluster_enrollments')
      .insert({
        profile_id: profileId,
        cluster_id: newCluster.id,
        status: 'approved',
        role: 'owner',
      });

    if (roleError || enrollError) {
      toast({ title: 'Warning', description: 'Organization created but some setup failed. Please check your role.', variant: 'destructive' });
    } else {
      toast({ title: 'Organization created! 🎉', description: `${newOrgName} is now ready for members.` });
    }

    setNewOrgName('');
    setNewOrgDescription('');
    setShowCreateModal(false);
    setIsCreatingOrg(false);
    loadClusters();
  };

  const selectCluster = (clusterId: string) => {
    setSelectedCluster(clusterId);
    setSelectedRole(normalizeRole(clusterRoles[clusterId] || 'member'));
    setActiveTab('team');
  };

  const canManageMembers = effectiveRole === 'owner' || hasPermission('action_manage_members');
  const canManageContent = effectiveRole === 'owner' || ['admin', 'project_manager'].includes(effectiveRole);
  const canManageProjects = effectiveRole === 'owner' || hasPermission('action_create_projects');
  const canManageAnnouncements = effectiveRole === 'owner' || hasPermission('action_manage_announcements');
  
  const canManageSettings = effectiveRole === 'owner';

  // Build allClusters with role from enrollments
  const allClusters = [
    ...adminClusters.map(c => ({ cluster: c, role: clusterRoles[c.id] || 'admin' })),
    ...memberClusters,
  ];

  const currentCluster = allClusters.find(c => c.cluster.id === selectedCluster);

  const tabs: { id: Tab; label: string; icon: React.ElementType; section?: string; badge?: number; hidden?: boolean; glow?: boolean; highlight?: boolean }[] = [
    { id: 'team', label: 'Members', icon: Users, section: 'Workspace', highlight: true },
    { id: 'my-assignments', label: 'My Life', icon: ClipboardList, section: 'Workspace', badge: assignmentCount > 0 ? assignmentCount : undefined, glow: assignmentCount > 0, highlight: true },
    { id: 'deals', label: 'Sales Leads', icon: TrendingUp, section: 'Workspace', hidden: !hasPermission('tab_deals'), highlight: true },
    { id: 'members', label: 'Members & Skills', icon: Users, section: 'General', badge: canManageMembers && stats.pending > 0 ? stats.pending : undefined, hidden: !hasPermission('tab_members') },
    { id: 'announcements', label: 'Newsletter', icon: Megaphone, section: 'General', hidden: !hasPermission('tab_announcements') },
    { id: 'resources', label: 'Resources', icon: FileText, section: 'General', hidden: !hasPermission('tab_resources') },
    { id: 'contacts_book', label: 'Contacts', icon: UserCircle, section: 'General', hidden: !hasPermission('tab_contacts_book') },
    { id: 'contacts', label: 'LinkedIn Lead Generator', icon: Linkedin, section: 'General', hidden: !hasPermission('tab_linkedin_leads') },
    { id: 'registry', label: 'Registry', icon: Database, section: 'General', hidden: !['owner','admin'].includes(effectiveRole) },
    { id: 'settings', label: 'Settings', icon: Settings, section: 'General', hidden: !canManageSettings },
  ];

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    setDeepLinkItemId(null);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    if (!selectedCluster || !profileId) return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Organization Selected</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Please select an organization from the sidebar to view its content, or create a new one.
        </p>
      </div>
    );

    switch (activeTab) {
      case 'my-assignments':
        return <MyAssignments clusterId={selectedCluster} profileId={profileId} onNavigate={(tab, itemId) => { setDeepLinkItemId(itemId || null); setActiveTab(tab as Tab); }} />;
      case 'members':
        return <MemberSkillsView clusterId={selectedCluster} canManage={canManageMembers} currentProfileId={profileId} />;
      case 'announcements':
        return <OrgAnnouncements clusterId={selectedCluster} canManage={canManageAnnouncements} profileId={profileId} isOwner={effectiveRole === 'owner'} />;
      case 'resources':
        return <OrgResources clusterId={selectedCluster} canManage={canManageContent} profileId={profileId} />;
      case 'team':
        return <MemberTaskBoard clusterId={selectedCluster} profileId={profileId} canManage={canManageContent} />;
      case 'contacts_book':
        return <CRMContactsBook clusterId={selectedCluster} profileId={profileId} canManage={canManageContent} userRole={selectedRole} />;
      case 'contacts':
        return <ContactList clusterId={selectedCluster} profileId={profileId} canManage={canManageContent} userRole={selectedRole} />;
      case 'deals':
        return <DealList clusterId={selectedCluster} profileId={profileId} canManage={canManageContent} userRole={selectedRole} showFindersFee={hasPermission('view_finders_fee')} showProjectCompensation={hasPermission('view_project_compensation')} showMonthlyCompensation={hasPermission('view_monthly_compensation')} showEquityAssignments={hasPermission('view_equity_assignments')} initialDealId={deepLinkItemId} />;
      case 'registry':
        return <RegistryPanel clusterId={selectedCluster} canManage={canManageContent} />;
      case 'permissions':
        return <RolePermissions clusterId={selectedCluster} />;
      case 'integrations':
        return <OrgIntegrations clusterId={selectedCluster} />;
      case 'settings':
        return currentCluster ? (
          <SettingsHub
            clusterId={selectedCluster}
            initialSection={(sessionStorage.getItem('admin_settings_section') as 'general' | 'permissions' | 'integrations') || 'general'}
            general={
              <OrgSettings
                clusterId={selectedCluster}
                name={currentCluster.cluster.name}
                description={currentCluster.cluster.description}
                logoUrl={currentCluster.cluster.logo_url}
                city={currentCluster.cluster.city}
                country={currentCluster.cluster.country}
                address={currentCluster.cluster.address}
                category={currentCluster.cluster.category}
                canDelete={effectiveRole === 'owner'}
                onUpdate={loadClusters}
              />
            }
          />
        ) : null;
      default:
        // Unknown or legacy tab ids land on the Members board
        return <MemberTaskBoard clusterId={selectedCluster} profileId={profileId} canManage={canManageContent} />;
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

  if (allClusters.length === 0) {
    // No clusters — redirect to join page
    navigate('/join-kolektiv', { replace: true });
    return null;
  }

  return (
    <FloatingLayout>
      <AppTopBar />
      <div className="h-full flex min-h-screen relative max-w-7xl mx-auto">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-5 left-5 z-50 p-2 rounded-xl bg-secondary/80 backdrop-blur-md border border-border"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-40 
          w-64 h-full lg:h-auto
          border-r border-border p-4 flex flex-col bg-background lg:bg-sidebar
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="mb-6 mt-8 lg:mt-0" />

          {/* Portal Badge */}
          <div className="glass-panel p-3 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">My Organization</p>
              <p className="text-xs text-muted-foreground">Manage your organizations</p>
            </div>
          </div>

          {/* Organization Selection */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Organizations
            </h3>
            <div className="space-y-1">
              {allClusters.map(({ cluster, role }) => (
                <button
                  key={cluster.id}
                  onClick={() => selectCluster(cluster.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedCluster === cluster.id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="truncate flex-1 text-left">{cluster.name}</span>
                  <span className="text-xs opacity-60">{role}</span>
                </button>
              ))}
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
              >
                <Plus className="w-4 h-4" />
                <span>New Organization</span>
              </button>
              <button
                onClick={() => navigate('/join-kolektiv')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50`}
              >
                <Users className="w-4 h-4" />
                <span>Join an Organization</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">
              Workspace
            </h3>
            <div className="space-y-1 mb-5 pb-4 border-b border-border/30">
              {tabs.filter(t => t.section === 'Workspace' && !t.hidden).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative border ${
                      activeTab === tab.id
                        ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                        : tab.glow
                          ? 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/15'
                          : 'text-primary bg-primary/5 border-primary/15 hover:bg-primary/10 font-medium'
                    }`}
                  >
                    {tab.glow && activeTab !== tab.id && (
                      <span className="absolute inset-0 rounded-xl animate-pulse bg-primary/5 pointer-events-none" />
                    )}
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {tab.badge != null && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              General
            </h3>
            <div className="space-y-1 mb-4">
              {tabs.filter(t => t.section === 'General' && !t.hidden).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors relative ${
                      activeTab === tab.id
                        ? 'bg-accent/10 text-accent font-medium'
                        : tab.glow
                          ? 'text-accent bg-accent/5 hover:bg-accent/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {tab.glow && activeTab !== tab.id && (
                      <span className="absolute inset-0 rounded-xl animate-pulse bg-primary/5 pointer-events-none" />
                    )}
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {tab.badge != null && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                        tab.glow ? 'bg-primary text-primary-foreground' : 'bg-accent/20 text-accent'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/30 mt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col w-full lg:w-auto min-w-0">
          {/* Header */}
          <header className="relative z-30 px-4 lg:px-6 py-4 border-b border-border/30">
            <div className="flex items-center gap-3 ml-10 lg:ml-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                {currentCluster?.cluster.logo_url ? (
                  <img src={currentCluster.cluster.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Building2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate">{currentCluster?.cluster.name}</h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {tabs.find(t => t.id === activeTab)?.label} • {effectiveRole}
                </p>
              </div>
              {profileId && selectedCluster && (
                <NotificationBell 
                  profileId={profileId} 
                  clusterId={selectedCluster}
                  onNavigateToTask={(taskId) => {
                    setDeepLinkItemId(taskId);
                    setActiveTab('my-assignments');
                  }}
                  onNavigateToDeal={(dealId) => {
                    setDeepLinkItemId(dealId);
                    setActiveTab('deals');
                  }}
                />
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Create Organization Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">Create Organization</h2>
                  <p className="text-sm text-muted-foreground">Build your talent cluster</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Organization Name</label>
                  <GlassInput
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="e.g., Tech Innovators"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                  <textarea
                    value={newOrgDescription}
                    onChange={e => setNewOrgDescription(e.target.value)}
                    placeholder="What does your organization focus on?"
                    className="w-full h-24 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButton onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || isCreatingOrg}
                  className="flex-1"
                >
                  {isCreatingOrg ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </>
                  )}
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingLayout>
  );
}
