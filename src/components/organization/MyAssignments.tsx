import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Loader2, Link2, CalendarClock,
  ExternalLink, Lock, Circle, Clock, CheckCircle2, CalendarPlus,
  Pencil, Check, X, FolderPlus, Folder, ChevronDown, ChevronRight,
  Archive, ArchiveRestore, AlertCircle, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface TeamTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string | null;
  due_date: string | null;
  cluster_id: string;
  created_by: string;
  clusters?: { id: string; name: string } | null;
}

interface MyAssignmentsProps {
  clusterId: string;
  profileId: string;
  onNavigate?: (tab: string, itemId?: string) => void;
}

interface PrivateTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  position: number;
  archived?: boolean;
}

interface PrivateLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  group_id: string | null;
  created_at: string;
}

interface PrivateLinkGroup {
  id: string;
  name: string;
  position: number;
}

interface PrivateMeeting {
  id: string;
  title: string;
  meeting_at: string;
  location: string | null;
  notes: string | null;
  attendees: string | null;
}

type Section = 'tasks' | 'links' | 'meetings';

const statusOrder: PrivateTask['status'][] = ['todo', 'in_progress', 'done'];
const statusConfig = {
  todo: { label: 'To Do', icon: Circle, color: 'text-muted-foreground', bg: 'bg-secondary/40' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export function MyAssignments({ profileId }: MyAssignmentsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState({ title: '', url: '', description: '' });

  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState({
    title: '', date: '', time: '', location: '', attendees: '', notes: ''
  });

  const [tasks, setTasks] = useState<PrivateTask[]>([]);
  const [links, setLinks] = useState<PrivateLink[]>([]);
  const [linkGroups, setLinkGroups] = useState<PrivateLinkGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [meetings, setMeetings] = useState<PrivateMeeting[]>([]);

  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);

  // Forms
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as PrivateTask['priority'], due_date: '' });
  const [newLink, setNewLink] = useState({ title: '', url: '', description: '', group_id: '' as string | '' });
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });

  useEffect(() => { loadAll(); }, [profileId]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadTasks(), loadLinks(), loadLinkGroups(), loadMeetings(), loadTeamTasks()]);
    setIsLoading(false);
  };

  // Tasks assigned to me from the Members board (crm_tasks)
  const loadTeamTasks = async () => {
    const { data, error } = await (supabase as any)
      .from('crm_tasks')
      .select('id, title, status, priority, due_date, cluster_id, created_by, clusters(id, name)')
      .eq('assigned_to', profileId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      toast({ title: 'Could not load team tasks', description: error.message, variant: 'destructive' });
      setTeamTasks([]);
      return;
    }
    setTeamTasks((data || []) as TeamTask[]);
  };

  const updateTeamTaskStatus = async (id: string, status: TeamTask['status']) => {
    const completed_at = status === 'completed' ? new Date().toISOString() : null;
    setTeamTasks(prev => status === 'completed' ? prev.filter(t => t.id !== id) : prev.map(t => t.id === id ? { ...t, status } : t));
    await (supabase as any).from('crm_tasks').update({ status, completed_at }).eq('id', id);
  };

  const loadTasks = async () => {
    const { data } = await (supabase as any)
      .from('private_tasks')
      .select('*')
      .eq('profile_id', profileId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const loadLinks = async () => {
    const { data } = await (supabase as any)
      .from('private_links')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    setLinks(data || []);
  };

  const loadLinkGroups = async () => {
    const { data } = await (supabase as any)
      .from('private_link_groups')
      .select('*')
      .eq('profile_id', profileId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setLinkGroups(data || []);
  };

  const loadMeetings = async () => {
    const { data } = await (supabase as any)
      .from('private_meetings')
      .select('*')
      .eq('profile_id', profileId)
      .order('meeting_at', { ascending: true });
    setMeetings(data || []);
  };

  // ----- Link Groups -----
  const addLinkGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const { error } = await (supabase as any).from('private_link_groups').insert({
      profile_id: profileId,
      name,
      position: linkGroups.length,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewGroupName('');
    setShowNewGroupInput(false);
    loadLinkGroups();
  };

  const startEditGroup = (g: PrivateLinkGroup) => {
    setEditingGroupId(g.id);
    setEditingGroupName(g.name);
  };

  const saveEditGroup = async () => {
    if (!editingGroupId) return;
    const name = editingGroupName.trim();
    if (!name) { setEditingGroupId(null); return; }
    setLinkGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name } : g));
    await (supabase as any).from('private_link_groups').update({ name }).eq('id', editingGroupId);
    setEditingGroupId(null);
  };

  const deleteLinkGroup = async (id: string) => {
    // Links inside have group_id set to NULL by FK
    setLinkGroups(prev => prev.filter(g => g.id !== id));
    setLinks(prev => prev.map(l => l.group_id === id ? { ...l, group_id: null } : l));
    await (supabase as any).from('private_link_groups').delete().eq('id', id);
  };

  const moveLinkToGroup = async (linkId: string, groupId: string | null) => {
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, group_id: groupId } : l));
    await (supabase as any).from('private_links').update({ group_id: groupId }).eq('id', linkId);
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ----- Tasks -----
  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { error } = await (supabase as any).from('private_tasks').insert({
      profile_id: profileId,
      title: newTask.title.trim(),
      priority: newTask.priority,
      due_date: newTask.due_date || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewTask({ title: '', priority: 'medium', due_date: '' });
    loadTasks();
  };

  const cycleTaskStatus = async (task: PrivateTask) => {
    const idx = statusOrder.indexOf(task.status);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    await (supabase as any).from('private_tasks').update({ status: next }).eq('id', task.id);
  };

  const moveTask = async (task: PrivateTask, status: PrivateTask['status']) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t));
    await (supabase as any).from('private_tasks').update({ status }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await (supabase as any).from('private_tasks').delete().eq('id', id);
  };

  const archiveTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: true } : t));
    await (supabase as any).from('private_tasks').update({ archived: true }).eq('id', id);
  };

  const unarchiveTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: false } : t));
    await (supabase as any).from('private_tasks').update({ archived: false }).eq('id', id);
  };

  const startEditTask = (task: PrivateTask) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveEditTask = async () => {
    if (!editingTaskId) return;
    const trimmed = editingTaskTitle.trim();
    if (!trimmed) { setEditingTaskId(null); return; }
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: trimmed } : t));
    await (supabase as any).from('private_tasks').update({ title: trimmed }).eq('id', editingTaskId);
    setEditingTaskId(null);
  };

  const updateTaskPriority = async (task: PrivateTask, priority: PrivateTask['priority']) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority } : t));
    await (supabase as any).from('private_tasks').update({ priority }).eq('id', task.id);
  };

  const updateTaskDueDate = async (task: PrivateTask, due_date: string | null) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, due_date } : t));
    await (supabase as any).from('private_tasks').update({ due_date }).eq('id', task.id);
  };

  // ----- Links -----
  const addLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    const { error } = await (supabase as any).from('private_links').insert({
      profile_id: profileId,
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      description: newLink.description.trim() || null,
      group_id: newLink.group_id || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewLink({ title: '', url: '', description: '', group_id: '' });
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    await (supabase as any).from('private_links').delete().eq('id', id);
  };

  // Combine dd/mm/yyyy date + HH:mm time -> ISO. Returns null if invalid.
  const combineDateTime = (date: string, time: string): string | null => {
    if (!date) return null;
    // date input is yyyy-mm-dd from native date picker; we display as dd/mm/yyyy via placeholder
    const parts = date.includes('/') ? date.split('/') : null;
    let iso: Date;
    if (parts && parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const t = time || '00:00';
      iso = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T${t}`);
    } else {
      // assume yyyy-mm-dd from native input
      iso = new Date(`${date}T${time || '00:00'}`);
    }
    if (isNaN(iso.getTime())) return null;
    return iso.toISOString();
  };

  // ----- Meetings -----
  const addMeeting = async () => {
    if (!newMeeting.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a meeting title.', variant: 'destructive' });
      return;
    }
    const meetingAtISO = combineDateTime(newMeeting.date, newMeeting.time);
    if (!meetingAtISO) {
      toast({ title: 'Date required', description: 'Please pick a meeting date (dd/mm/yyyy) and time.', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('private_meetings').insert({
      profile_id: profileId,
      title: newMeeting.title.trim(),
      meeting_at: meetingAtISO,
      location: newMeeting.location.trim() || null,
      attendees: newMeeting.attendees.trim() || null,
      notes: newMeeting.notes.trim() || null,
    });
    if (error) {
      toast({ title: 'Could not add meeting', description: error.message, variant: 'destructive' });
      return;
    }
    setNewMeeting({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });
    toast({ title: 'Meeting added' });
    loadMeetings();
  };

  const startEditMeeting = (m: PrivateMeeting) => {
    const d = new Date(m.meeting_at);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    setEditingMeetingId(m.id);
    setEditingMeeting({
      title: m.title,
      date: `${dd}/${mm}/${yyyy}`,
      time: `${hh}:${min}`,
      location: m.location || '',
      attendees: m.attendees || '',
      notes: m.notes || '',
    });
  };

  const saveEditMeeting = async () => {
    if (!editingMeetingId) return;
    if (!editingMeeting.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' }); return;
    }
    const iso = combineDateTime(editingMeeting.date, editingMeeting.time);
    if (!iso) { toast({ title: 'Invalid date', description: 'Use dd/mm/yyyy.', variant: 'destructive' }); return; }
    const payload = {
      title: editingMeeting.title.trim(),
      meeting_at: iso,
      location: editingMeeting.location.trim() || null,
      attendees: editingMeeting.attendees.trim() || null,
      notes: editingMeeting.notes.trim() || null,
    };
    const { error } = await (supabase as any).from('private_meetings').update(payload).eq('id', editingMeetingId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setEditingMeetingId(null);
    loadMeetings();
  };

  const startEditLink = (l: PrivateLink) => {
    setEditingLinkId(l.id);
    setEditingLink({ title: l.title, url: l.url, description: l.description || '' });
  };

  const saveEditLink = async () => {
    if (!editingLinkId) return;
    if (!editingLink.title.trim() || !editingLink.url.trim()) {
      toast({ title: 'Title & URL required', variant: 'destructive' }); return;
    }
    const { error } = await (supabase as any).from('private_links').update({
      title: editingLink.title.trim(),
      url: editingLink.url.trim(),
      description: editingLink.description.trim() || null,
    }).eq('id', editingLinkId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setEditingLinkId(null);
    loadLinks();
  };


  const deleteMeeting = async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    await (supabase as any).from('private_meetings').delete().eq('id', id);
  };

  const downloadMeetingICS = (m: PrivateMeeting) => {
    const start = new Date(m.meeting_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1h
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const uid = `${m.id}@checkgrow.com`;
    const descParts = [m.notes, m.attendees ? `Attendees: ${m.attendees}` : ''].filter(Boolean).join('\\n\\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CheckGrow//My Life//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(m.title)}`,
      m.location ? `LOCATION:${escape(m.location)}` : '',
      descParts ? `DESCRIPTION:${escape(descParts)}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeTitle = m.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) || 'meeting';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getDueLabel = (due: string | null) => {
    if (!due) return null;
    const d = new Date(due);
    if (isToday(d)) return { text: 'Today', urgent: true };
    if (isTomorrow(d)) return { text: 'Tomorrow', urgent: false };
    if (isPast(d)) return { text: 'Overdue', urgent: true };
    return { text: format(d, 'dd/MM/yyyy'), urgent: false };
  };

  const upcomingMeetings = meetings.filter(m => !isPast(new Date(m.meeting_at)));
  const visibleTasks = tasks.filter(t => (viewMode === 'archived' ? t.archived : !t.archived));
  const openTasks = tasks.filter(t => t.status !== 'done' && !t.archived);
  const archivedCount = tasks.filter(t => t.archived).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your private workspace…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="rounded-2xl bg-accent p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold">Your private workspace</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal task board, links, and meetings — only you can see this.
            </p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-md bg-card border border-border/40">
              <span className="font-semibold text-foreground">{openTasks.length}</span>
              <span className="text-muted-foreground ml-1">open tasks</span>
            </span>
            <span className="px-2 py-1 rounded-md bg-card border border-border/40">
              <span className="font-semibold text-foreground">{links.length}</span>
              <span className="text-muted-foreground ml-1">links</span>
            </span>
            <span className="px-2 py-1 rounded-md bg-card border border-border/40">
              <span className="font-semibold text-foreground">{upcomingMeetings.length}</span>
              <span className="text-muted-foreground ml-1">upcoming</span>
            </span>
          </div>
        </div>
      </div>

      {/* TASK BOARD — full width on top */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Joint Board</h3>
          <div className="inline-flex rounded-lg border border-border/40 bg-card p-0.5 text-xs">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${viewMode === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${viewMode === 'archived' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Archive className="w-3 h-3" /> Archived
              {archivedCount > 0 && <span className="text-[10px] opacity-70">({archivedCount})</span>}
            </button>
          </div>
        </div>
        {viewMode === 'active' && (
        <div className="rounded-xl border border-border/40 bg-card p-3 flex flex-wrap gap-2 items-center">
          <input
            value={newTask.title}
            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
            placeholder="What needs to get done?"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={newTask.priority}
            onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as PrivateTask['priority'] }))}
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={newTask.due_date}
            onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
          <button onClick={addTask} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statusOrder.map(status => {
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;
            const items = visibleTasks.filter(t => t.status === status);
            return (
              <div key={status} className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                  <span className="font-semibold text-xs uppercase tracking-wider">{cfg.label}</span>
                  <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-card text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {items.map(task => {
                    const due = getDueLabel(task.due_date);
                    const isEditing = editingTaskId === task.id;
                    return (
                      <div key={task.id} className="group p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-2">
                          <button onClick={() => cycleTaskStatus(task)} className="mt-0.5 shrink-0" title="Cycle status">
                            <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                          </button>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingTaskTitle}
                              onChange={e => setEditingTaskTitle(e.target.value)}
                              onBlur={saveEditTask}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEditTask();
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                              className="flex-1 px-2 py-0.5 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          ) : (
                            <p
                              onClick={() => startEditTask(task)}
                              className={`flex-1 text-sm leading-snug cursor-text ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
                              title="Click to edit"
                            >
                              {task.title}
                            </p>
                          )}
                          {task.status === 'done' && !task.archived && (
                            <button onClick={() => archiveTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition" title="Archive">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {task.archived && (
                            <button onClick={() => unarchiveTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition" title="Restore">
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 ml-6 flex-wrap">
                          <select
                            value={task.priority}
                            onChange={e => updateTaskPriority(task, e.target.value as PrivateTask['priority'])}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border cursor-pointer ${
                              task.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}
                          >
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                          </select>
                          <input
                            type="date"
                            value={task.due_date ? task.due_date.slice(0, 10) : ''}
                            onChange={e => updateTaskDueDate(task, e.target.value || null)}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border-0 cursor-pointer ${
                              due?.urgent ? 'bg-destructive/10 text-destructive' : ''
                            }`}
                          />
                          <div className="ml-auto flex gap-1">
                            {statusOrder.filter(s => s !== status).map(s => (
                              <button
                                key={s}
                                onClick={() => moveTask(task, s)}
                                className="text-[10px] text-muted-foreground hover:text-primary px-1"
                                title={`Move to ${statusConfig[s].label}`}
                              >→{statusConfig[s].label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-border/40 p-4 text-center">
                      <p className="text-xs text-muted-foreground/60">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* LINKS + MEETINGS — side by side below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LINKS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5" /> Links
            </h3>
            <button
              onClick={() => setShowNewGroupInput(s => !s)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              title="Create new group"
            >
              <FolderPlus className="w-3.5 h-3.5" /> New group
            </button>
          </div>

          {showNewGroupInput && (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addLinkGroup(); if (e.key === 'Escape') { setShowNewGroupInput(false); setNewGroupName(''); } }}
                placeholder="Group name (e.g. Reading list, Work tools)"
                className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg"
              />
              <button onClick={addLinkGroup} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Create</button>
            </div>
          )}

          <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={newLink.title}
                onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={newLink.url}
                onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                placeholder="https://…"
                className="flex-[2] min-w-[160px] px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={addLink} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Save
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={newLink.description}
                onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional note"
                className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newLink.group_id}
                onChange={e => setNewLink(p => ({ ...p, group_id: e.target.value }))}
                className="px-2 py-2 text-xs bg-input border border-border rounded-lg max-w-[160px]"
                title="Add to group"
              >
                <option value="">No group</option>
                {linkGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {(() => {
            const renderLink = (link: PrivateLink) => {
              let domain = '';
              try { domain = new URL(link.url).hostname; } catch { domain = ''; }
              const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
              const isEditing = editingLinkId === link.id;
              if (isEditing) {
                return (
                  <div key={link.id} className="p-3 rounded-xl bg-card border border-primary/40 space-y-2">
                    <input value={editingLink.title} onChange={e => setEditingLink(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                    <input value={editingLink.url} onChange={e => setEditingLink(p => ({ ...p, url: e.target.value }))} placeholder="https://…" className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                    <input value={editingLink.description} onChange={e => setEditingLink(p => ({ ...p, description: e.target.value }))} placeholder="Optional note" className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingLinkId(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                      <button onClick={saveEditLink} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={link.id} className="group p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {favicon ? (
                      <img src={favicon} alt="" className="w-6 h-6 object-contain" onError={(e) => { const img = e.currentTarget; img.style.display = 'none'; const fallback = img.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = 'block'; }} />
                    ) : null}
                    <Link2 className={`w-4 h-4 text-primary ${favicon ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary flex items-center gap-1 truncate">
                      {link.title}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
                    {link.description && <p className="text-xs text-muted-foreground/80 mt-1">{link.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={link.group_id || ''}
                      onChange={e => moveLinkToGroup(link.id, e.target.value || null)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] bg-input border border-border rounded px-1 py-0.5 max-w-[100px]"
                      title="Move to group"
                    >
                      <option value="">No group</option>
                      {linkGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <button onClick={() => startEditLink(link)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition p-1" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            };

            const ungrouped = links.filter(l => !l.group_id);

            return (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {linkGroups.map(group => {
                  const groupLinks = links.filter(l => l.group_id === group.id);
                  const collapsed = collapsedGroups.has(group.id);
                  const isEditingG = editingGroupId === group.id;
                  return (
                    <div key={group.id} className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 group/g">
                        <button onClick={() => toggleGroup(group.id)} className="text-muted-foreground hover:text-foreground">
                          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <Folder className="w-4 h-4 text-primary" />
                        {isEditingG ? (
                          <input
                            autoFocus
                            value={editingGroupName}
                            onChange={e => setEditingGroupName(e.target.value)}
                            onBlur={saveEditGroup}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditGroup(); if (e.key === 'Escape') setEditingGroupId(null); }}
                            className="flex-1 px-2 py-0.5 text-sm bg-input border border-border rounded"
                          />
                        ) : (
                          <span className="flex-1 text-sm font-semibold cursor-text" onClick={() => startEditGroup(group)}>{group.name}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{groupLinks.length}</span>
                        <button onClick={() => startEditGroup(group)} className="opacity-0 group-hover/g:opacity-100 text-muted-foreground hover:text-primary p-1" title="Rename">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete group "${group.name}"? Links inside will become ungrouped.`)) deleteLinkGroup(group.id); }} className="opacity-0 group-hover/g:opacity-100 text-muted-foreground hover:text-destructive p-1" title="Delete group">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {!collapsed && (
                        <div className="px-2 pb-2 space-y-2">
                          {groupLinks.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground/60 text-center py-2">No links in this group</p>
                          ) : (
                            groupLinks.map(renderLink)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {ungrouped.length > 0 && (
                  <div className="space-y-2">
                    {linkGroups.length > 0 && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 px-1">Ungrouped</p>
                    )}
                    {ungrouped.map(renderLink)}
                  </div>
                )}

                {links.length === 0 && linkGroups.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border/40 p-8 text-center">
                    <Link2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No links saved yet</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Tip: Create a group to organize related links.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* MEETINGS */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" /> Meetings
          </h3>
          <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={newMeeting.title}
                onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))}
                placeholder="Meeting title"
                className="flex-1 min-w-[160px] px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                inputMode="numeric"
                value={newMeeting.date}
                onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))}
                placeholder="dd/mm/yyyy"
                className="w-[120px] px-3 py-2 text-sm bg-input border border-border rounded-lg"
              />
              <input
                type="time"
                value={newMeeting.time}
                onChange={e => setNewMeeting(p => ({ ...p, time: e.target.value }))}
                className="w-[110px] px-3 py-2 text-sm bg-input border border-border rounded-lg"
              />
              <button onClick={addMeeting} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newMeeting.location}
                onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))}
                placeholder="Location / link"
                className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={newMeeting.attendees}
                onChange={e => setNewMeeting(p => ({ ...p, attendees: e.target.value }))}
                placeholder="Attendees"
                className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <textarea
              value={newMeeting.notes}
              onChange={e => setNewMeeting(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {meetings.map(m => {
              const past = isPast(new Date(m.meeting_at));
              const isEditing = editingMeetingId === m.id;
              if (isEditing) {
                return (
                  <div key={m.id} className="p-3 rounded-xl bg-card border border-primary/40 space-y-2">
                    <input
                      value={editingMeeting.title}
                      onChange={e => setEditingMeeting(p => ({ ...p, title: e.target.value }))}
                      placeholder="Meeting title"
                      className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        inputMode="numeric"
                        value={editingMeeting.date}
                        onChange={e => setEditingMeeting(p => ({ ...p, date: e.target.value }))}
                        placeholder="dd/mm/yyyy"
                        className="w-[120px] px-3 py-2 text-sm bg-input border border-border rounded-lg"
                      />
                      <input
                        type="time"
                        value={editingMeeting.time}
                        onChange={e => setEditingMeeting(p => ({ ...p, time: e.target.value }))}
                        className="w-[110px] px-3 py-2 text-sm bg-input border border-border rounded-lg"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editingMeeting.location}
                        onChange={e => setEditingMeeting(p => ({ ...p, location: e.target.value }))}
                        placeholder="Location / link"
                        className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-input border border-border rounded-lg"
                      />
                      <input
                        value={editingMeeting.attendees}
                        onChange={e => setEditingMeeting(p => ({ ...p, attendees: e.target.value }))}
                        placeholder="Attendees"
                        className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-input border border-border rounded-lg"
                      />
                    </div>
                    <textarea
                      value={editingMeeting.notes}
                      onChange={e => setEditingMeeting(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Notes"
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingMeetingId(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button onClick={saveEditMeeting} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className={`group p-4 rounded-xl bg-card border transition flex items-start gap-3 ${past ? 'border-border/30 opacity-60' : 'border-border/40 hover:border-primary/30'}`}>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 leading-none">
                    <span className="text-base font-bold text-primary">{format(new Date(m.meeting_at), 'dd')}</span>
                    <span className="text-[10px] font-semibold text-primary mt-0.5">{format(new Date(m.meeting_at), 'MM/yyyy')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(m.meeting_at), 'EEE, dd/MM/yyyy • HH:mm')}
                      {m.location && <> · {m.location}</>}
                    </p>
                    {m.attendees && <p className="text-[11px] text-muted-foreground/80 mt-1">👥 {m.attendees}</p>}
                    {m.notes && <p className="text-xs text-muted-foreground/80 mt-1">{m.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => downloadMeetingICS(m)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition"
                      title="Add to calendar (downloads .ics)"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Add to calendar
                    </button>
                    <button onClick={() => startEditMeeting(m)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition p-1" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMeeting(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {meetings.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border/40 p-8 text-center">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No meetings scheduled</p>
              </div>
            )}
          </div>
        </section>
      </div>
      {/* TASKS ASSIGNED TO ME FROM THE MEMBERS BOARD */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Assigned to me by the team
          </h3>
          <span className="text-[11px] text-muted-foreground">{teamTasks.length} open</span>
        </div>
        {teamTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
            <p className="text-xs text-muted-foreground">Nothing assigned to you from the Members board yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
            {teamTasks.map(task => {
              const due = getDueLabel(task.due_date);
              const inProgress = task.status === 'in_progress';
              const StatusIcon = inProgress ? Clock : Circle;
              const priorityClass = task.priority === 'high'
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : task.priority === 'medium'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
              const dueClass = due?.urgent ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground';
              return (
                <div key={task.id} className="group px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20 transition">
                  <button
                    onClick={() => updateTeamTaskStatus(task.id, inProgress ? 'completed' : 'in_progress')}
                    className="shrink-0"
                    title={inProgress ? 'In Progress — click to complete' : 'To Do — click to start'}
                  >
                    <StatusIcon className={inProgress ? 'w-4 h-4 text-amber-500' : 'w-4 h-4 text-muted-foreground'} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{task.clusters?.name || 'Organization'}</p>
                  </div>
                  {task.priority && (
                    <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ' + priorityClass}>{task.priority}</span>
                  )}
                  {due && (
                    <span className={'text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 ' + dueClass}>
                      {due.urgent && <AlertCircle className="w-2.5 h-2.5" />}
                      {due.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

/** Hook to get assignment counts for badge/glow in sidebar */
export function useAssignmentCounts(clusterId: string | null, profileId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      const [tasksRes, meetingsRes, teamRes] = await Promise.all([
        (supabase as any).from('private_tasks').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).neq('status', 'done').eq('archived', false),
        (supabase as any).from('private_meetings').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).gte('meeting_at', new Date().toISOString()),
        (supabase as any).from('crm_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', profileId).in('status', ['pending', 'in_progress']),
      ]);
      setCount((tasksRes.count || 0) + (meetingsRes.count || 0) + (teamRes.count || 0));
    };
    load();
  }, [clusterId, profileId]);

  return count;
}
