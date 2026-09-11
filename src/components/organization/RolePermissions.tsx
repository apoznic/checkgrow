import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Crown, UserCog, User, Loader2, Save,
  Check, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface RolePermissionsProps {
  clusterId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-500', description: 'Full organization management: members, settings, all projects' },
  { value: 'member', label: 'Member', icon: User, color: 'text-muted-foreground', description: 'Basic access, only sees projects they are part of' },
];

const PERMISSIONS = [
  // General Tabs
  { key: 'tab_overview', label: 'Overview', section: 'General Tabs', description: 'Dashboard overview with stats' },
  { key: 'tab_members', label: 'Members & Skills', section: 'General Tabs', description: 'View member list and skills' },
  { key: 'tab_announcements', label: 'Announcements', section: 'General Tabs', description: 'Organization announcements' },
  { key: 'tab_resources', label: 'Resources', section: 'General Tabs', description: 'Shared documents and links' },
  { key: 'tab_projects', label: 'Projects', section: 'General Tabs', description: 'Project management' },

  // CRM Tabs
  { key: 'tab_contacts_book', label: 'Contacts', section: 'CRM Tabs', description: 'General contact directory' },
  { key: 'tab_linkedin_leads', label: 'LinkedIn Lead Generator', section: 'CRM Tabs', description: 'LinkedIn lead import & management' },
  { key: 'tab_deals', label: 'Sales Leads', section: 'CRM Tabs', description: 'Sales lead pipeline' },
  { key: 'tab_activities', label: 'Activity Log', section: 'CRM Tabs', description: 'Activity tracking' },
  

  // Project Permissions
  { key: 'action_create_projects', label: 'Create Projects', section: 'Project Permissions', description: 'Create new projects within the organization' },
  { key: 'action_enter_any_project', label: 'Enter Any Project', section: 'Project Permissions', description: 'Open and view any project without being a team member' },
  { key: 'action_manage_project_teams', label: 'Manage Project Teams', section: 'Project Permissions', description: 'Add/remove members and approve applications on any project' },
  { key: 'action_delete_projects', label: 'Delete Projects', section: 'Project Permissions', description: 'Permanently delete organization projects' },
  { key: 'action_apply_to_projects', label: 'Apply to Projects', section: 'Project Permissions', description: 'Submit applications to join projects' },
  { key: 'action_view_inbound_projects', label: 'View Inbound Projects', section: 'Project Permissions', description: 'See external projects where org members are matched' },

  // Member Management
  { key: 'action_manage_members', label: 'Manage Members', section: 'Member Management', description: 'Approve, reject, and remove organization members' },
  { key: 'action_change_roles', label: 'Change Member Roles', section: 'Member Management', description: 'Promote or demote member roles within the organization' },
  { key: 'action_manage_announcements', label: 'Manage Announcements', section: 'Member Management', description: 'Create, edit, and delete organization announcements' },
  { key: 'action_manage_resources', label: 'Manage Resources', section: 'Member Management', description: 'Upload, edit, and delete shared resources' },

  // CRM Permissions
  { key: 'action_view_all_leads', label: 'View All LinkedIn Leads', section: 'CRM Permissions', description: 'See all leads, not just own entries' },
  { key: 'action_manage_deals', label: 'Manage Sales Leads', section: 'CRM Permissions', description: 'Create, edit, and delete deals directly' },
  { key: 'action_approve_deals', label: 'Approve Deal Requests', section: 'CRM Permissions', description: 'Approve or reject member deal requests' },
  { key: 'action_manage_contacts', label: 'Manage Contacts', section: 'CRM Permissions', description: 'Create, edit, and delete contacts' },

  // Compensation
  { key: 'view_finders_fee', label: 'Finders Fee Leaderboard', section: 'Compensation', description: 'View finders fee rankings and totals' },
  { key: 'view_project_compensation', label: 'Project Compensation', section: 'Compensation', description: 'View project compensation leaderboard' },
  { key: 'view_monthly_compensation', label: 'Monthly Recurring', section: 'Compensation', description: 'View monthly recurring compensation dashboard' },
  { key: 'view_equity_assignments', label: 'Equity & Assignments', section: 'Compensation', description: 'View equity distribution and member assignments' },

  // Danger Zone
  { key: 'action_delete_org', label: 'Delete Organization', section: 'Danger Zone', description: 'Permission to delete the organization' },
];

// Default permissions for each role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSIONS.map(p => p.key), // All permissions
  admin: PERMISSIONS.filter(p => p.key !== 'action_delete_org').map(p => p.key), // Everything except delete org
  member: [
    'tab_overview', 'tab_members', 'tab_announcements', 'tab_resources', 'tab_projects',
    'tab_contacts_book', 'tab_linkedin_leads', 'tab_deals', 'tab_activities',
    'action_apply_to_projects',
  ],
};

type PermissionState = Record<string, Record<string, boolean>>;

export function RolePermissions({ clusterId }: RolePermissionsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [clusterId]);

  const loadPermissions = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('cluster_id', clusterId);

    if (error) {
      toast({ title: 'Error loading permissions', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // Build permission state from database or defaults
    const state: PermissionState = {};
    
    ROLES.forEach(role => {
      state[role.value] = {};
      PERMISSIONS.forEach(perm => {
        // Check if permission exists in DB
        const dbPerm = data?.find(d => d.role === role.value && d.permission_key === perm.key);
        if (dbPerm) {
          state[role.value][perm.key] = dbPerm.is_enabled;
        } else {
          // Use defaults
          state[role.value][perm.key] = DEFAULT_PERMISSIONS[role.value]?.includes(perm.key) ?? false;
        }
      });
    });

    // Owner always has all permissions
    state['owner'] = {};
    PERMISSIONS.forEach(perm => {
      state['owner'][perm.key] = true;
    });

    setPermissions(state);
    setIsLoading(false);
  };

  const handleToggle = (role: string, permKey: string) => {
    if (role === 'owner') return; // Can't modify owner permissions
    
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: !prev[role][permKey],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Prepare upsert data
    const upsertData: { cluster_id: string; role: string; permission_key: string; is_enabled: boolean }[] = [];

    Object.entries(permissions).forEach(([role, perms]) => {
      if (role === 'owner') return; // Skip owner, always has all
      Object.entries(perms).forEach(([permKey, isEnabled]) => {
        upsertData.push({
          cluster_id: clusterId,
          role,
          permission_key: permKey,
          is_enabled: isEnabled,
        });
      });
    });

    // Delete existing and insert new
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('cluster_id', clusterId);

    if (deleteError) {
      toast({ title: 'Error saving', description: deleteError.message, variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    if (upsertData.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(upsertData);

      if (insertError) {
        toast({ title: 'Error saving', description: insertError.message, variant: 'destructive' });
        setIsSaving(false);
        return;
      }
    }

    toast({ title: 'Permissions saved!' });
    setHasChanges(false);
    setIsSaving(false);
  };

  const handleResetToDefaults = (role: string) => {
    if (role === 'owner') return;

    setPermissions(prev => ({
      ...prev,
      [role]: PERMISSIONS.reduce((acc, perm) => {
        acc[perm.key] = DEFAULT_PERMISSIONS[role]?.includes(perm.key) ?? false;
        return acc;
      }, {} as Record<string, boolean>),
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sections = [...new Set(PERMISSIONS.map(p => p.section))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Role Permissions</h2>
          <p className="text-sm text-muted-foreground">Configure which tabs each role can access</p>
        </div>
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </motion.button>
        )}
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ROLES.map(role => {
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                selectedRole === role.value
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${role.color}`} />
              <span className="text-sm font-medium">{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role Info */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{ROLES.find(r => r.value === selectedRole)?.label}</h3>
            <p className="text-sm text-muted-foreground">{ROLES.find(r => r.value === selectedRole)?.description}</p>
          </div>
          {selectedRole !== 'owner' && (
            <button
              onClick={() => handleResetToDefaults(selectedRole)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset to defaults
            </button>
          )}
        </div>
      </div>

      {/* Permissions Grid */}
      {selectedRole === 'owner' ? (
        <div className="glass-panel p-6 text-center">
          <Crown className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
          <h3 className="font-semibold mb-1">Owner Role</h3>
          <p className="text-sm text-muted-foreground">
            Owners have full access to all features and cannot be restricted.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section} className="glass-panel p-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-4">{section}</h4>
              <div className="space-y-3">
                {PERMISSIONS.filter(p => p.section === section).map(perm => {
                  const isEnabled = permissions[selectedRole]?.[perm.key] ?? false;
                  return (
                    <div key={perm.key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(selectedRole, perm.key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permission Matrix Preview */}
      <div className="glass-panel p-4">
        <h4 className="font-medium mb-4">Permission Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 font-medium">Permission</th>
                {ROLES.map(role => (
                  <th key={role.value} className="text-center py-2 px-3 font-medium">
                    <span className={role.color}>{role.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(perm => (
                <tr key={perm.key} className="border-b border-border/30">
                  <td className="py-2 px-3 text-muted-foreground">{perm.label}</td>
                  {ROLES.map(role => {
                    const isEnabled = role.value === 'owner'
                      ? true 
                      : (permissions[role.value]?.[perm.key] ?? false);
                    return (
                      <td key={role.value} className="text-center py-2 px-3">
                        {isEnabled ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
