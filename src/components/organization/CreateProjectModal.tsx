import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Plus, UserPlus, Trash2, Search, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';

interface OrgMember {
  profile_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusterId: string;
  profileId: string;
  onProjectCreated: () => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  clusterId,
  profileId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Team members
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<{ profileId: string; role: string }[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (isOpen && clusterId) {
      loadOrgMembers();
    }
  }, [isOpen, clusterId]);

  const loadOrgMembers = async () => {
    setIsLoadingMembers(true);
    const { data, error } = await supabase
      .from('cluster_enrollments')
      .select(`
        profile_id,
        role,
        profiles:profile_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');

    if (data) {
      // Filter out the current user and cast the data
      const members = data
        .filter(m => m.profile_id !== profileId)
        .map(m => ({
          profile_id: m.profile_id,
          role: m.role,
          profiles: m.profiles as unknown as OrgMember['profiles']
        }));
      setOrgMembers(members);
    }
    setIsLoadingMembers(false);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.profileId === memberId);
      if (exists) {
        return prev.filter(m => m.profileId !== memberId);
      }
      return [...prev, { profileId: memberId, role: 'Team Member' }];
    });
  };

  const updateMemberRole = (memberId: string, role: string) => {
    setSelectedMembers(prev =>
      prev.map(m => (m.profileId === memberId ? { ...m, role } : m))
    );
  };

  const filteredMembers = orgMembers.filter(m =>
    m.profiles?.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        requirements: requirements.trim() || null,
        owner_id: profileId,
        cluster_id: clusterId,
        status: 'open',
      })
      .select()
      .single();

    if (projectError) {
      toast({ title: 'Error creating project', description: projectError.message, variant: 'destructive' });
      setIsCreating(false);
      return;
    }

    // Note: We intentionally do NOT auto-create a CRM deal for manually-created projects.
    // Deals should only exist when a user explicitly tracks one in the sales pipeline.

    // Add selected team members directly (no invitation flow)
    const teamInserts = selectedMembers.map(m => ({
      project_id: project.id,
      profile_id: m.profileId,
      role_in_project: m.role,
      status: 'accepted',
    }));

    if (teamInserts.length > 0) {
      const { error: teamError } = await supabase
        .from('project_teams')
        .insert(teamInserts);

      if (teamError) {
        toast({ 
          title: 'Project created but some members could not be added', 
          description: teamError.message, 
          variant: 'destructive' 
        });
      }
    }

    // Log activity
    await supabase.from('project_activities').insert({
      project_id: project.id,
      actor_id: profileId,
      activity_type: 'project_created',
      description: `Created project "${title}"`,
    });

    toast({ title: 'Project created! 🎉', description: `${selectedMembers.length} team members added.` });
    
    // Reset form
    setTitle('');
    setDescription('');
    setRequirements('');
    setSelectedMembers([]);
    setIsCreating(false);
    onProjectCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Create New Project</h2>
            <p className="text-sm text-muted-foreground">Create a project and add team members</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Project Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Title *</label>
              <GlassInput
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Mobile App Redesign"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this project about?"
                className="w-full h-24 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Requirements</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Skills and requirements needed..."
                className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add Team Members
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedMembers.length} selected
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <GlassInput
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search organization members..."
                className="pl-10"
              />
            </div>

            {/* Member List */}
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-secondary/20 p-3">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {memberSearch ? 'No members found' : 'No organization members to add'}
                </p>
              ) : (
                filteredMembers.map(member => {
                  const isSelected = selectedMembers.some(m => m.profileId === member.profile_id);
                  const selectedMember = selectedMembers.find(m => m.profileId === member.profile_id);

                  return (
                    <div
                      key={member.profile_id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/50'
                      }`}
                      onClick={() => toggleMember(member.profile_id)}
                    >
                      {/* Avatar */}
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {member.profiles?.full_name?.[0] || '?'}
                        </div>
                      )}

                      {/* Name & Role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profiles?.full_name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>

                      {/* Role Input */}
                      {isSelected && (
                        <input
                          type="text"
                          value={selectedMember?.role || ''}
                          onChange={e => {
                            e.stopPropagation();
                            updateMemberRole(member.profile_id, e.target.value);
                          }}
                          onClick={e => e.stopPropagation()}
                          placeholder="Role"
                          className="w-28 px-2 py-1 text-xs rounded bg-background/50 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      )}

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border/30">
            <GlassButton onClick={onClose} className="flex-1">
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreate}
              disabled={!title.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </GlassButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
