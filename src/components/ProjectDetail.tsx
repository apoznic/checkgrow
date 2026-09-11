import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Loader2, User, 
  ListTodo, Activity as ActivityIcon,
  UserPlus, Search, Check, Edit3, X, FileText,
  CheckCircle2, Circle, Clock, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp, Plus, Zap, StickyNote,
  Pencil, LogOut, Link2, CalendarClock, Target,
  GripVertical, Save, Move, ExternalLink, FolderOpen
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { ActivityTimeline } from '@/components/project/ActivityTimeline';
import { TeamStatusDashboard } from '@/components/project/TeamStatusDashboard';
import { ProjectChatSidebar } from '@/components/project/ProjectChatSidebar';
import { PersonBoardsPanel } from '@/components/project/PersonBoardsPanel';


import { ProjectStickyNotes } from '@/components/project/ProjectStickyNotes';
import { MeetingNotesChain } from '@/components/project/MeetingNotesChain';
import { ProjectLinks } from '@/components/project/ProjectLinks';
import { ProjectMeetings } from '@/components/project/ProjectMeetings';
import { ProjectDriveLink } from '@/components/project/ProjectDriveLink';
import { ProjectWhatsAppLink } from '@/components/project/ProjectWhatsAppLink';
import { ProjectChecklist } from '@/components/project/ProjectChecklist';
import { ProjectStrategicGoals } from '@/components/project/ProjectStrategicGoals';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TeamMember {
  id: string;
  profile_id: string;
  role_in_project: string | null;
  status: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    linkedin_url: string | null;
    city: string | null;
    skills: {
      id: string;
      skill_name: string;
      skill_level: string | null;
      years_experience: number | null;
    }[];
  };
}

interface OrgMember {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  cluster_id?: string | null;
  google_drive_url?: string | null;
  whatsapp_url?: string | null;
}

interface ProjectDetailProps {
  project: Project;
  profileId: string;
  isOwner: boolean;
  canManageTeam?: boolean;
  adminClusterId?: string | null;
  onBack: () => void;
  onProjectUpdate: () => void;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  actor_id: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

// Collapsible section wrapper
function DashboardSection({ title, icon: Icon, defaultOpen = true, count, children }: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl bg-card overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-5 pb-3 sm:pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sortable wrapper used in arrange mode
function SortableBlock({ id, arrangeMode, children }: { id: string; arrangeMode: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !arrangeMode });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={arrangeMode ? 'relative ring-2 ring-primary/40 rounded-xl' : 'relative'}>
      {arrangeMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-3 top-3 z-10 w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function ProjectDetail({ project, profileId, isOwner, canManageTeam = false, adminClusterId, onBack, onProjectUpdate }: ProjectDetailProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const canManage = isOwner || canManageTeam;
  
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks] = useState<{ status: string }[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoadingOrgMembers, setIsLoadingOrgMembers] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState(project.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isLeavingProject, setIsLeavingProject] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(project.google_drive_url || null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(project.whatsapp_url || null);

  // Tool registry — everything addable in this project
  const TOOL_REGISTRY: { key: string; label: string; icon: React.ElementType; desc: string }[] = [
    { key: 'drive', label: 'Google Drive', icon: FolderOpen, desc: 'Pin the main project folder' },
    { key: 'boards', label: 'Team & Key Responsibilities', icon: ListTodo, desc: 'Per-person boards and tasks' },
    { key: 'links', label: 'Links', icon: Link2, desc: 'Shared URLs and references' },
    { key: 'meetings', label: 'Meetings', icon: CalendarClock, desc: 'Schedule & log meetings' },
    { key: 'checklist', label: 'Checklist', icon: CheckCircle2, desc: 'Quick checklist of milestones' },
    { key: 'sticky', label: 'Sticky Notes', icon: StickyNote, desc: 'Freeform notes board' },
    { key: 'goals', label: 'Strategic Goals', icon: Target, desc: 'OKR-style goals' },
    { key: 'chain', label: 'Meeting Notes Chain', icon: Link2, desc: 'Continuous meeting log' },
    { key: 'activity', label: 'Activity Timeline', icon: ActivityIcon, desc: 'Audit of all project events' },
    { key: 'whatsapp', label: 'WhatsApp Link', icon: MessageSquare, desc: 'Pin the team chat link' },
  ];
  const DEFAULT_ENABLED = ['drive', 'boards', 'links'];
  const DEFAULT_SECTION_ORDER = TOOL_REGISTRY.map(t => t.key);

  const orderStorageKey = `project-section-order:${project.id}:${profileId}`;
  const enabledStorageKey = `project-enabled-tools:${project.id}:${profileId}`;

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(orderStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        const merged = [
          ...parsed.filter((k) => DEFAULT_SECTION_ORDER.includes(k)),
          ...DEFAULT_SECTION_ORDER.filter((k) => !parsed.includes(k)),
        ];
        return merged;
      }
    } catch {}
    return DEFAULT_SECTION_ORDER;
  });

  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(enabledStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        return parsed.filter((k) => DEFAULT_SECTION_ORDER.includes(k));
      }
    } catch {}
    return DEFAULT_ENABLED;
  });

  const toggleTool = (key: string, enabled: boolean) => {
    setEnabledTools((prev) => {
      const next = enabled
        ? Array.from(new Set([...prev, key]))
        : prev.filter((k) => k !== key);
      try { localStorage.setItem(enabledStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [addToolOpen, setAddToolOpen] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>(sectionOrder);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const startArrange = () => { setDraftOrder(sectionOrder); setArrangeMode(true); };
  const cancelArrange = () => { setDraftOrder(sectionOrder); setArrangeMode(false); };
  const saveArrange = () => {
    setSectionOrder(draftOrder);
    try { localStorage.setItem(orderStorageKey, JSON.stringify(draftOrder)); } catch {}
    setArrangeMode(false);
    toast({ title: 'Layout saved', description: 'Your section order has been saved.' });
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraftOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Keep links in sync when the project prop refreshes (e.g. realtime update from another user)
  useEffect(() => {
    setDriveUrl(project.google_drive_url || null);
  }, [project.google_drive_url]);
  useEffect(() => {
    setWhatsappUrl(project.whatsapp_url || null);
  }, [project.whatsapp_url]);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Quick action scroll refs
  const taskSectionRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    loadTeam();
    loadAllTasks();
    loadRecentActivities();
    loadMetrics();
  }, [project.id]);

  // Realtime activity + team subscription
  useEffect(() => {
    const refreshAll = () => {
      loadRecentActivities();
      loadAllTasks();
      loadMetrics();
    };
    const channel = supabase
      .channel(`project-realtime-${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_activities', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_teams', filter: `project_id=eq.${project.id}` }, () => loadTeam())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_meetings', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_links', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_sticky_notes', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_docs', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_milestones', filter: `project_id=eq.${project.id}` }, refreshAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${project.id}` }, () => onProjectUpdate?.())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [project.id]);

  const loadAllTasks = async () => {
    const { data } = await supabase.from('project_tasks').select('status').eq('project_id', project.id);
    if (data) setAllTasks(data);
  };

  const loadRecentActivities = async () => {
    const { data } = await supabase
      .from('project_activities')
      .select('id, activity_type, description, created_at, actor_id, profiles:actor_id(full_name, avatar_url)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(8);
    if (data) setRecentActivities(data as unknown as ActivityItem[]);
  };

  const loadMetrics = async () => {
    const [hoursRes, msgRes] = await Promise.all([
      supabase.from('project_time_entries').select('hours').eq('project_id', project.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
    ]);
    if (hoursRes.data) setTotalHours(hoursRes.data.reduce((sum, e) => sum + Number(e.hours), 0));
    if (msgRes.count !== null) setMessageCount(msgRes.count);
  };

  const loadTeam = async () => {
    const { data } = await supabase
      .from('project_teams')
      .select(`id, profile_id, role_in_project, status, profiles (id, full_name, avatar_url, bio, linkedin_url, city, skills (id, skill_name, skill_level, years_experience))`)
      .eq('project_id', project.id);
    if (data) setTeam(data as TeamMember[]);
  };

  const loadOrgMembers = async () => {
    const effectiveClusterId = project.cluster_id || adminClusterId;
    if (!effectiveClusterId) return;
    setIsLoadingOrgMembers(true);
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
      .eq('cluster_id', effectiveClusterId)
      .eq('status', 'approved');

    if (data) {
      const existingIds = new Set([profileId, project.owner_id, ...team.map(m => m.profile_id)]);
      const members = data
        .filter(m => !existingIds.has(m.profile_id))
        .map(m => {
          const p = m.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
          return { profile_id: m.profile_id, full_name: p?.full_name || null, avatar_url: p?.avatar_url || null };
        });
      setOrgMembers(members);
    }
    setIsLoadingOrgMembers(false);
  };

  const handleInviteMember = async (memberId: string) => {
    setInvitingIds(prev => new Set(prev).add(memberId));
    const { error } = await supabase.from('project_teams').insert({
      project_id: project.id,
      profile_id: memberId,
      role_in_project: null,
      status: 'accepted',
    });
    if (error) {
      toast({ title: 'Error adding member', description: error.message, variant: 'destructive' });
    } else {
      const effectiveClusterId = project.cluster_id || adminClusterId;
      if (effectiveClusterId) {
        await supabase.from('notifications').insert({
          recipient_id: memberId,
          sender_id: profileId,
          notification_type: 'project_added',
          title: `added you to project "${project.title}"`,
          content: `You've been added to the project "${project.title}".`,
          link_type: 'project',
          link_id: project.id,
          cluster_id: effectiveClusterId,
        });
      }
      await supabase.from('project_activities').insert({
        project_id: project.id,
        actor_id: profileId,
        activity_type: 'member_added',
        description: `Added a new member to the project`,
      });
      toast({ title: 'Member added!' });
      setOrgMembers(prev => prev.filter(m => m.profile_id !== memberId));
      loadTeam();
    }
    setInvitingIds(prev => { const n = new Set(prev); n.delete(memberId); return n; });
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    const { error } = await supabase
      .from('projects')
      .update({ description: editDescription.trim() || null })
      .eq('id', project.id);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Description updated!' });
      setIsEditingDescription(false);
      onProjectUpdate();
    }
    setIsSavingDescription(false);
  };

  const handleSaveTitle = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      toast({ title: 'Title cannot be empty', variant: 'destructive' });
      return;
    }
    setIsSavingTitle(true);
    const { error } = await supabase
      .from('projects')
      .update({ title: trimmed })
      .eq('id', project.id);
    if (error) {
      toast({ title: 'Error saving title', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Title updated!' });
      setIsEditingTitle(false);
      onProjectUpdate();
    }
    setIsSavingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
    if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitle(project.title); }
  };

  const chatMembers = useMemo(() => 
    team
      .filter(t => t.status === 'accepted' || t.status === 'proposed')
      .map(t => ({ id: t.profiles.id, full_name: t.profiles.full_name, avatar_url: t.profiles.avatar_url })),
    [team]
  );

  const currentTeamMembership = useMemo(
    () => team.find(member => member.profile_id === profileId && member.status === 'accepted') ?? null,
    [team, profileId]
  );

  const canLeaveProject = Boolean(currentTeamMembership) && !isOwner && !canManageTeam;

  const isPM = (m: TeamMember) => (m.role_in_project || '').toLowerCase() === 'project_manager';
  const getDisplayRoleLabel = (member: TeamMember) => {
    return isPM(member) ? 'Project Manager' : 'Member';
  };

  const handleSetMemberRole = async (memberId: string, newRole: string) => {
    const trimmed = newRole.trim();
    const { error } = await supabase
      .from('project_teams')
      .update({ role_in_project: trimmed === '' ? null : trimmed })
      .eq('id', memberId);
    if (error) {
      toast({ title: 'Could not set role', description: error.message, variant: 'destructive' });
    } else {
      loadTeam();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = team.find(m => m.id === memberId);
    const { error } = await supabase.from('project_teams').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Error removing member', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('project_activities').insert({
        project_id: project.id, actor_id: profileId, activity_type: 'team_member_removed',
        description: `Removed ${member?.profiles.full_name || 'a team member'} from the project`,
      });
      loadTeam(); onProjectUpdate();
      toast({ title: 'Team member removed' });
    }
  };

  const handleApproveApplication = async (memberId: string) => {
    const { data, error } = await supabase.from('project_teams').update({ status: 'accepted' }).eq('id', memberId).select();
    if (error) {
      toast({ title: 'Error approving', description: error.message, variant: 'destructive' });
    } else if (!data || data.length === 0) {
      toast({ title: 'Could not approve', description: 'You may not have permission to approve this application.', variant: 'destructive' });
    } else {
      const member = team.find(m => m.id === memberId);
      await supabase.from('project_activities').insert({
        project_id: project.id, actor_id: profileId, activity_type: 'application_approved',
        description: `Approved ${member?.profiles.full_name || 'a member'}'s application`,
      });
      
      if (member?.profile_id) {
        supabase.functions.invoke('notify-project-acceptance', {
          body: { profileId: member.profile_id, projectId: project.id, projectTitle: project.title },
        }).catch(err => console.error('Email notification failed:', err));
      }

      loadTeam(); onProjectUpdate();
      toast({ title: 'Application approved!' });
    }
  };

  const handleDeclineApplication = async (memberId: string) => {
    const { error } = await supabase.from('project_teams').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Error declining', description: error.message, variant: 'destructive' });
    } else {
      loadTeam();
      toast({ title: 'Application declined' });
    }
  };

  const handleLeaveProject = async () => {
    if (!currentTeamMembership) return;

    setIsLeavingProject(true);

    const { error } = await supabase
      .from('project_teams')
      .delete()
      .eq('id', currentTeamMembership.id);

    if (error) {
      toast({ title: 'Error leaving project', description: error.message, variant: 'destructive' });
      setIsLeavingProject(false);
      return;
    }

    await supabase.from('project_activities').insert({
      project_id: project.id,
      actor_id: profileId,
      activity_type: 'team_member_left',
      description: 'Left the project',
    });

    toast({ title: 'You left the project' });
    setIsLeavingProject(false);
    onBack();
  };

  const filteredOrgMembers = orgMembers.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const acceptedCount = team.filter(m => m.status === 'accepted').length;
  const pendingCount = team.filter(m => m.status === 'proposed' || m.status === 'applied').length;

  // Task stats
  const taskStats = {
    todo: allTasks.filter(t => t.status === 'todo').length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
    done: allTasks.filter(t => t.status === 'done').length,
    approved: allTasks.filter(t => t.status === 'approved').length,
    total: allTasks.length,
  };

  const completionPercent = taskStats.total > 0 
    ? Math.round(((taskStats.done + taskStats.approved) / taskStats.total) * 100) 
    : 0;

  // Activity icon helper
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent': return MessageSquare;
      case 'task_created': case 'task_updated': return ListTodo;
      case 'member_invited': case 'application_approved': return UserPlus;
      case 'team_member_removed': return X;
      default: return Zap;
    }
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    open: { label: 'Open', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
    in_progress: { label: 'In Progress', class: 'bg-amber-500/15 text-amber-600 border-amber-500/20' },
    completed: { label: 'Completed', class: 'bg-primary/10 text-primary border-primary/20' },
    cancelled: { label: 'Cancelled', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  const currentStatus = statusConfig[project.status || 'open'] || statusConfig.open;

  // ── Shared UI fragments ──

  const renderHeader = () => (
    <div className="border-b border-border bg-card shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onBack} className="p-1.5 sm:p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="font-semibold text-sm sm:text-base bg-input border border-border rounded-lg px-2.5 py-1.5 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  {isSavingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setIsEditingTitle(false); setEditTitle(project.title); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="font-semibold text-sm sm:text-base truncate">{project.title}</h1>
                {canManage && (
                  <button
                    onClick={() => { setEditTitle(project.title); setIsEditingTitle(true); }}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover/title:opacity-100 transition-all shrink-0"
                    title="Edit title"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${currentStatus.class}`}>
                {currentStatus.label}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
              </span>
              {acceptedCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{acceptedCount}</span>
                </div>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
          </div>

          {/GRG|MiCA|Golden Ratio/i.test(project.title || '') && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <a
                href="/plan/grg-mica"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
                title="Open project plan"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Project Plan</span>
                <ExternalLink className="w-3 h-3 text-primary/70" />
              </a>
              <a
                href="/plan/grg-mica-wbs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
                title="Open work plan (WBS)"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Work Plan (WBS)</span>
                <ExternalLink className="w-3 h-3 text-primary/70" />
              </a>
            </div>
          )}
        </div>

        {/GRG|MiCA|Golden Ratio/i.test(project.title || '') && (
          <div className="sm:hidden mt-2 space-y-1.5">
            <a
              href="/plan/grg-mica"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary flex-1">Project Plan (MiCA)</span>
              <ExternalLink className="w-3.5 h-3.5 text-primary/70" />
            </a>
            <a
              href="/plan/grg-mica-wbs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary flex-1">Work Plan (WBS)</span>
              <ExternalLink className="w-3.5 h-3.5 text-primary/70" />
            </a>
          </div>
        )}
      </div>
    </div>
  );

  const renderMetricsCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl bg-card p-5"
    >
      <div className="flex items-center gap-6 flex-wrap">
        {/* Completion Ring */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                className="stroke-secondary"
                strokeWidth="2.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                className="stroke-primary"
                strokeWidth="2.5"
                strokeDasharray={`${completionPercent}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{completionPercent}%</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Progress</p>
            <p className="text-[11px] text-muted-foreground">{taskStats.done + taskStats.approved}/{taskStats.total} tasks</p>
          </div>
        </div>

        <div className="h-10 w-px bg-border hidden sm:block" />

        {/* Stat pills */}
        {[
          { icon: Clock, value: `${totalHours.toFixed(1)}h`, label: 'Logged' },
          { icon: MessageSquare, value: messageCount, label: 'Messages' },
          { icon: Users, value: acceptedCount, label: 'Members' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => taskSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Task
          </button>
          {canManage && (project.cluster_id || adminClusterId) && (
            <button
              onClick={() => { setShowInvitePanel(true); loadOrgMembers(); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
          {canLeaveProject && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Leave
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll lose access to this project until you apply again and get accepted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveProject}
                    disabled={isLeavingProject}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isLeavingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Leave project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderAboutSection = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</span>
        {canManage && !isEditingDescription && (
          <button
            onClick={() => { setEditDescription(project.description || ''); setIsEditingDescription(true); }}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>
      {isEditingDescription ? (
        <div className="space-y-2">
          <textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            placeholder="Describe what this project is about..."
            className="w-full h-20 bg-input border border-border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIsEditingDescription(false)} className="px-2 py-1 text-[10px] rounded hover:bg-secondary text-muted-foreground">Cancel</button>
            <button onClick={handleSaveDescription} disabled={isSavingDescription} className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isSavingDescription ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {project.description || 'No description yet.'}
        </p>
      )}
    </div>
  );

  const renderTaskStats = () => (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</span>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'To Do', value: taskStats.todo, icon: Circle, color: 'text-muted-foreground' },
          { label: 'In Progress', value: taskStats.inProgress, icon: Clock, color: 'text-amber-500' },
          { label: 'Done', value: taskStats.done, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Approved', value: taskStats.approved, icon: AlertCircle, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2">
            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            <div>
              <p className="text-sm font-bold leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeamSection = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Team ({acceptedCount})
        </span>
        {canManage && (project.cluster_id || adminClusterId) && (
          <button
            onClick={() => { setShowInvitePanel(!showInvitePanel); if (!showInvitePanel) loadOrgMembers(); }}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
            title="Add members"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Invite Panel */}
      <AnimatePresence>
        {showInvitePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/20 rounded-lg p-3 space-y-2 border border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {isLoadingOrgMembers ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                ) : filteredOrgMembers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">
                    {memberSearch ? 'No members found' : 'All members already in project'}
                  </p>
                ) : (
                  filteredOrgMembers.map(member => (
                    <div key={member.profile_id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                          {member.full_name?.[0] || '?'}
                        </div>
                      )}
                      <span className="flex-1 text-xs truncate">{member.full_name || 'Unnamed'}</span>
                      <button
                        onClick={() => handleInviteMember(member.profile_id)}
                        disabled={invitingIds.has(member.profile_id)}
                        className="px-2 py-0.5 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {invitingIds.has(member.profile_id) ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team list */}
      <div className="space-y-1">
        {team.filter(m => m.status === 'accepted').map(member => (
          <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/30 transition-colors group/member">
            {member.profiles.avatar_url ? (
              <img src={member.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
            )}
            <span className="text-xs font-medium truncate flex-1">{member.profiles.full_name || 'Member'}</span>
            {(() => {
              const pm = isPM(member);
              const badge = (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  pm
                    ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {pm ? '★ Project Manager' : 'Member'}
                </span>
              );
              if (!canManage) return badge;
              return (
                <select
                  value={pm ? 'project_manager' : 'member'}
                  onChange={(e) => handleSetMemberRole(member.id, e.target.value)}
                  className={`text-[10px] font-semibold rounded-full px-2 py-0.5 outline-none cursor-pointer border-0 ${
                    pm
                      ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/70'
                  }`}
                  title="Set this person's role in this project"
                >
                  <option value="member">Member</option>
                  <option value="project_manager">★ Project Manager</option>
                </select>
              );
            })()}
            {canManage && member.profile_id !== profileId && (
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/member:opacity-100 transition-all"
                title="Remove from team"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {/* Pending / Applied members */}
        {team.filter(m => m.status === 'proposed' || m.status === 'applied').map(member => (
          <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/5">
            {member.profiles.avatar_url ? (
              <img src={member.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover opacity-70" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                <User className="w-3 h-3 text-amber-500" />
              </div>
            )}
            <span className="text-xs truncate flex-1 text-muted-foreground">{member.profiles.full_name || 'Member'}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-500">
              {member.status === 'applied' ? 'Applied' : 'Pending'}
            </Badge>
            {canManage && member.status === 'applied' && (
              <div className="flex gap-0.5">
                <button onClick={() => handleApproveApplication(member.id)} className="p-0.5 rounded hover:bg-emerald-500/10 text-emerald-500" title="Approve">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => handleDeclineApplication(member.id)} className="p-0.5 rounded hover:bg-destructive/10 text-destructive" title="Decline">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {canManage && member.status === 'proposed' && (
              <button onClick={() => handleRemoveMember(member.id)} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Remove invitation">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {team.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No team members yet</p>
        )}
      </div>
    </div>
  );

  const renderQuickLinks = () => (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Links</span>
      <div className="space-y-1.5">
        {/GRG|MiCA|Golden Ratio/i.test(project.title || '') && (
          <a
            href="/plan/grg-mica"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium truncate flex-1">Project Plan (MiCA)</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          </a>
        )}

        {/GRG|MiCA|Golden Ratio/i.test(project.title || '') && (
          <a
            href="/plan/grg-mica-wbs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium truncate flex-1">Work Plan (WBS)</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          </a>
        )}

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-xs font-medium truncate flex-1">WhatsApp Group</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          </a>
        ) : (
          <p className="text-[10px] text-muted-foreground px-2 py-1.5 rounded-lg border border-dashed border-border">
            No WhatsApp link yet
          </p>
        )}
        {driveUrl ? (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xs font-medium truncate flex-1">Google Drive</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          </a>
        ) : (
          <p className="text-[10px] text-muted-foreground px-2 py-1.5 rounded-lg border border-dashed border-border">
            No Drive link yet
          </p>
        )}
      </div>
    </div>
  );

  const renderMainSections = () => {
    const blocks: Record<string, React.ReactNode> = {
      drive: (
        <ProjectDriveLink
          projectId={project.id}
          driveUrl={driveUrl}
          canManage={canManage}
          onUpdated={(url) => setDriveUrl(url)}
        />
      ),
      boards: (
        <div ref={taskSectionRef}>
          <DashboardSection title="Team & Key People Boards" icon={ListTodo} count={taskStats.total}>
            <PersonBoardsPanel
              projectId={project.id}
              profileId={profileId}
              clusterId={project.cluster_id || adminClusterId || null}
              teamMembers={team.filter(m => m.status === 'accepted').map(m => ({ profile_id: m.profile_id, profiles: m.profiles }))}
              canManage={canManage}
            />
          </DashboardSection>
        </div>
      ),
      checklist: <ProjectChecklist projectId={project.id} profileId={profileId} />,
      sticky: (
        <DashboardSection title="Sticky Notes" icon={StickyNote}>
          <ProjectStickyNotes projectId={project.id} profileId={profileId} />
        </DashboardSection>
      ),
      goals: (
        <DashboardSection title="Strategic Goals" icon={Target}>
          <ProjectStrategicGoals projectId={project.id} profileId={profileId} canManage={canManage} />
        </DashboardSection>
      ),
      links: (
        <DashboardSection title="Links" icon={Link2}>
          <ProjectLinks projectId={project.id} profileId={profileId} />
        </DashboardSection>
      ),
      meetings: (
        <DashboardSection title="Meetings" icon={CalendarClock}>
          <ProjectMeetings projectId={project.id} profileId={profileId} />
        </DashboardSection>
      ),
      chain: (
        <DashboardSection title="Meeting Notes Chain" icon={Link2}>
          <MeetingNotesChain projectId={project.id} profileId={profileId} />
        </DashboardSection>
      ),
      activity: (
        <DashboardSection title="Activity" icon={ActivityIcon} defaultOpen={false}>
          <ActivityTimeline projectId={project.id} />
        </DashboardSection>
      ),
      whatsapp: (
        <ProjectWhatsAppLink
          projectId={project.id}
          whatsappUrl={whatsappUrl}
          canManage={canManage}
          onUpdated={(url) => setWhatsappUrl(url)}
        />
      ),
    };

    const activeOrder = arrangeMode ? draftOrder : sectionOrder;
    const visible = activeOrder.filter((k) => blocks[k] && enabledTools.includes(k));
    const disabledTools = TOOL_REGISTRY.filter(t => !enabledTools.includes(t.key));

    return (
      <>
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {!arrangeMode && canManage && (
            <Popover open={addToolOpen} onOpenChange={setAddToolOpen}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add tool
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold">Project tools</p>
                  <p className="text-[11px] text-muted-foreground">Enable the modules you need.</p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  {TOOL_REGISTRY.map(tool => {
                    const enabled = enabledTools.includes(tool.key);
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.key}
                        onClick={() => toggleTool(tool.key, !enabled)}
                        className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${enabled ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          <ToolIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{tool.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{tool.desc}</p>
                        </div>
                        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-secondary text-muted-foreground'}`}>
                          {enabled ? 'On' : 'Off'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {disabledTools.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center px-2 py-2">All tools enabled</p>
                )}
              </PopoverContent>
            </Popover>
          )}

          {!arrangeMode ? (
            <button
              onClick={startArrange}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Move className="w-3.5 h-3.5" />
              Arrange
            </button>
          ) : (
            <>
              <span className="text-[11px] text-muted-foreground mr-1">Drag the handle on the left of each section</span>
              <button
                onClick={cancelArrange}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={saveArrange}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save layout
              </button>
            </>
          )}
        </div>

        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {visible.map((key) => (
                <SortableBlock key={key} id={key} arrangeMode={arrangeMode}>
                  <div className="relative group/tool">
                    {canManage && !arrangeMode && (
                      <button
                        onClick={() => toggleTool(key, false)}
                        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 opacity-0 group-hover/tool:opacity-100 transition-all shadow-sm flex items-center justify-center"
                        title="Remove from this project"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {blocks[key]}
                  </div>
                </SortableBlock>
              ))}
              {visible.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No tools enabled yet.</p>
                  {canManage && (
                    <button
                      onClick={() => setAddToolOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add your first tool
                    </button>
                  )}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-x-hidden">
      {renderHeader()}

      {/* Dashboard Body */}
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-7xl h-full min-w-0">
        {isMobile ? (
          /* MOBILE: Stacked layout */
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Metrics */}
              <div className="border border-border rounded-xl bg-card p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className="stroke-secondary" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className="stroke-primary" strokeWidth="3" strokeDasharray={`${completionPercent}, 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{completionPercent}%</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">Progress</p>
                      <p className="text-[10px] text-muted-foreground">{taskStats.done + taskStats.approved}/{taskStats.total} tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{acceptedCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{messageCount}</span>
                    </div>
                  </div>
                </div>
                {/* Mobile quick actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <button
                    onClick={() => taskSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Task
                  </button>
                  {canManage && (project.cluster_id || adminClusterId) && (
                    <button
                      onClick={() => { setShowInvitePanel(true); loadOrgMembers(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  )}
                </div>
              </div>

              {/* About */}
              <div className="border border-border rounded-xl bg-card p-3 space-y-2">
                {renderAboutSection()}
              </div>

              {/* Team */}
              <div className="border border-border rounded-xl bg-card p-3 space-y-2">
                {renderTeamSection()}
              </div>

              {/* Main sections */}
              {renderMainSections()}
            </div>
          </ScrollArea>
        ) : (
          /* DESKTOP: Resizable panels */
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* LEFT SIDEBAR */}
            <ResizablePanel defaultSize={28} minSize={20} maxSize={40} className="bg-card/50">
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-5">
                    {renderAboutSection()}
                    {renderTaskStats()}
                    {renderTeamSection()}
                    {renderQuickLinks()}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* MAIN CONTENT AREA */}
            <ResizablePanel defaultSize={72} minSize={50}>
              <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                  {renderMetricsCard()}
                  {renderMainSections()}
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        </div>
      </div>
    </div>
  );
}
