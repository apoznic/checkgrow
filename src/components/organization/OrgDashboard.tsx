import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Megaphone, FileText, FolderOpen, Crown, Shield, 
  UserCog, User, Loader2, ChevronRight, ClipboardList, Settings, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrgAnnouncements } from './OrgAnnouncements';
import { OrgResources } from './OrgResources';
import { OrgMembers } from './OrgMembers';
import { OrgProjects } from './OrgProjects';
import { MyAssignments } from './MyAssignments';

import { RolePermissions } from './RolePermissions';
import { RegistryPanel } from './RegistryPanel';

interface OrgDashboardProps {
  clusterId: string;
  clusterName: string;
  userRole: string;
  profileId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'my-assignments' | 'members' | 'announcements' | 'resources' | 'projects' | 'registry' | 'permissions';

export function OrgDashboard({ clusterId, clusterName, userRole, profileId, onBack }: OrgDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingRequests: 0,
    activeProjects: 0,
    announcements: 0,
    pendingTasks: 0,
  });
  const [orgMembers, setOrgMembers] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getNormalizedRole = (role: string) => role.trim().toLowerCase();
  const [effectiveRole, setEffectiveRole] = useState(getNormalizedRole(userRole));

  const canManageMembers = ['owner', 'admin'].includes(effectiveRole);
  const canManageContent = ['owner', 'admin'].includes(effectiveRole);
  const canManageSettings = effectiveRole === 'owner';
  const canAccessTaskBoard = ['owner', 'admin'].includes(effectiveRole);
  const canViewAll = true; // All members can view

  useEffect(() => {
    loadStats();
  }, [clusterId]);

  useEffect(() => {
    const syncEffectiveRole = async () => {
      const { data } = await supabase
        .from('cluster_enrollments')
        .select('role')
        .eq('cluster_id', clusterId)
        .eq('profile_id', profileId)
        .eq('status', 'approved')
        .maybeSingle();

      if (data?.role) {
        setEffectiveRole(getNormalizedRole(data.role));
      } else {
        setEffectiveRole(getNormalizedRole(userRole));
      }
    };

    syncEffectiveRole();
  }, [clusterId, profileId, userRole]);

  const loadStats = async () => {
    setIsLoading(true);

    const [membersRes, pendingRes, projectsRes, announcementsRes, tasksRes, orgMembersRes] = await Promise.all([
      supabase
        .from('cluster_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', clusterId)
        .eq('status', 'approved'),
      supabase
        .from('cluster_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', clusterId)
        .eq('status', 'pending'),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', clusterId),
      supabase
        .from('org_announcements')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', clusterId),
      supabase
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', clusterId)
        .eq('status', 'pending'),
      supabase
        .from('cluster_enrollments')
        .select('profiles(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId)
        .eq('status', 'approved'),
    ]);

    setStats({
      totalMembers: membersRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      activeProjects: projectsRes.count || 0,
      announcements: announcementsRes.count || 0,
      pendingTasks: tasksRes.count || 0,
    });

    if (orgMembersRes.data) {
      setOrgMembers(
        orgMembersRes.data
          .map((entry) => entry.profiles as { id: string; full_name: string | null; avatar_url: string | null })
          .filter(Boolean)
      );
    }

    setIsLoading(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'project_manager': return UserCog;
      default: return User;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'project_manager': return 'Project Manager';
      default: return 'Member';
    }
  };

  const RoleIcon = getRoleIcon(effectiveRole);

  const tabs = [
    { id: 'projects' as Tab, label: 'Projects', icon: FolderOpen, highlight: true },
    { id: 'my-assignments' as Tab, label: 'My Life', icon: ClipboardList, highlight: true },
    { id: 'overview' as Tab, label: 'Overview', icon: FolderOpen, dividerBefore: true },
    { id: 'members' as Tab, label: 'Members', icon: Users, badge: canManageMembers && stats.pendingRequests > 0 ? stats.pendingRequests : undefined },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
    { id: 'resources' as Tab, label: 'Resources', icon: FileText },
    
    { id: 'registry' as Tab, label: 'Registry', icon: Database },
    { id: 'permissions' as Tab, label: 'Permissions', icon: Settings, hidden: !canManageSettings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'my-assignments':
        return (
          <MyAssignments
            clusterId={clusterId}
            profileId={profileId}
          />
        );
      case 'members':
        return (
          <OrgMembers
            clusterId={clusterId}
            canManage={canManageMembers}
            currentProfileId={profileId}
          />
        );
      case 'announcements':
        return (
          <OrgAnnouncements
            clusterId={clusterId}
            canManage={canManageContent}
            profileId={profileId}
          />
        );
      case 'resources':
        return (
          <OrgResources
            clusterId={clusterId}
            canManage={canManageContent}
            profileId={profileId}
          />
        );
      case 'projects':
        return (
          <OrgProjects
            clusterId={clusterId}
            canView={canViewAll}
            canManage={canManageContent}
            profileId={profileId}
            userRole={effectiveRole}
          />
        );
      case 'permissions':
        return <RolePermissions clusterId={clusterId} />;
      case 'registry':
        return <RegistryPanel clusterId={clusterId} canManage={['owner','admin'].includes(effectiveRole)} />;
      default:
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Members</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
              </div>
              {canManageMembers && (
                <div className="glass-panel p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-accent" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-accent">{stats.pendingRequests}</p>
                </div>
              )}
              <div className="glass-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Projects</span>
                </div>
                <p className="text-2xl font-bold">{stats.activeProjects}</p>
              </div>
              <div className="glass-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Announcements</span>
                </div>
                <p className="text-2xl font-bold">{stats.announcements}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-panel p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('members')}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span>View Members</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-5 h-5 text-primary" />
                    <span>View Announcements</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Browse Resources</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <span>View Projects</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {canManageSettings && (
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-primary" />
                      <span>Manage Permissions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="h-6 w-px bg-border/50" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{clusterName}</h1>
                <div className="flex items-center gap-2">
                  <RoleIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{getRoleLabel(effectiveRole)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-border/30 overflow-x-auto items-center">
        {tabs.filter((tab) => !tab.hidden).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="flex items-center">
              {tab.dividerBefore && <div className="h-6 w-px bg-border/50 mx-2" />}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-accent border-b-2 border-accent font-semibold'
                    : tab.highlight
                      ? 'text-primary hover:text-primary/80 font-semibold'
                      : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
                    {tab.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}
