import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, Users, Circle, Clock, CheckCircle2, Trash2, Search,
  AlertCircle, ListChecks, Eye, EyeOff, User as UserIcon,
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';

interface MemberTaskBoardProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
}

interface Member {
  enrollmentId: string;
  profileId: string;
  role: string;
  fullName: string;
  avatarUrl: string | null;
}

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high';

interface MemberTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  deal_id: string | null;
  crm_deals?: { id: string; title: string } | null;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground', label: 'To Do' },
  in_progress: { icon: Clock, color: 'text-amber-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Done' },
  cancelled: { icon: Circle, color: 'text-muted-foreground/50', label: 'Cancelled' },
};

const nextStatus = (s: TaskStatus): TaskStatus =>
  s === 'pending' ? 'in_progress' : s === 'in_progress' ? 'completed' : 'pending';

const isOpen = (t: MemberTask) => t.status === 'pending' || t.status === 'in_progress';

const getDueLabel = (due: string | null) => {
  if (!due) return null;
  const d = new Date(due);
  if (isToday(d)) return { text: 'Today', urgent: true };
  if (isTomorrow(d)) return { text: 'Tomorrow', urgent: false };
  if (isPast(d)) return { text: 'Overdue', urgent: true };
  return { text: format(d, 'dd/MM/yyyy'), urgent: false };
};

const priorityClass = (p: TaskPriority) =>
  p === 'high'
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : p === 'medium'
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';

const roleClass = (role: string) =>
  role === 'owner'
    ? 'bg-primary/10 text-primary border-primary/20'
    : role === 'admin'
    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    : 'bg-secondary text-muted-foreground border-border/40';

/**
 * Members board: every approved member of the organization with their open
 * tasks, plus quick "add task to this person" inputs. Tasks live in crm_tasks
 * so they also appear in each member's My Life page.
 */
export function MemberTaskBoard({ clusterId, profileId, canManage }: MemberTaskBoardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Quick-assign bar
  const [quickTitle, setQuickTitle] = useState('');
  const [quickMember, setQuickMember] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickDue, setQuickDue] = useState('');
  const [isAddingQuick, setIsAddingQuick] = useState(false);

  // Per-member inline add
  const [inlineTitles, setInlineTitles] = useState<Record<string, string>>({});
  const [inlineBusy, setInlineBusy] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel(`member-task-board-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadMembers(), loadTasks()]);
    setIsLoading(false);
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('cluster_enrollments')
      .select('id, role, profile_id, profiles ( id, full_name, avatar_url )')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    if (error) {
      toast({ title: 'Could not load members', description: error.message, variant: 'destructive' });
      return;
    }
    const list: Member[] = (data || [])
      .filter((row: any) => row.profiles)
      .map((row: any) => ({
        enrollmentId: row.id,
        profileId: row.profile_id,
        role: (row.role || 'member').toLowerCase(),
        fullName: row.profiles.full_name || 'Unnamed member',
        avatarUrl: row.profiles.avatar_url,
      }))
      .sort((a: Member, b: Member) => {
        const order = (r: string) => (r === 'owner' ? 0 : r === 'admin' ? 1 : 2);
        return order(a.role) - order(b.role) || a.fullName.localeCompare(b.fullName);
      });
    setMembers(list);
    if (!quickMember && list.length > 0) setQuickMember(list[0].profileId);
  };

  const loadTasks = async () => {
    const { data, error } = await (supabase as any)
      .from('crm_tasks')
      .select('id, title, status, priority, due_date, assigned_to, created_by, created_at, completed_at, deal_id, crm_deals ( id, title )')
      .eq('cluster_id', clusterId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load tasks', description: error.message, variant: 'destructive' });
      return;
    }
    setTasks((data || []) as MemberTask[]);
  };

  const createTask = async (assignedTo: string, title: string, priority: TaskPriority, dueDate: string) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    const { error } = await supabase.from('crm_tasks').insert({
      cluster_id: clusterId,
      title: trimmed,
      priority,
      status: 'pending',
      task_type: 'general',
      due_date: dueDate || null,
      assigned_to: assignedTo,
      created_by: profileId,
    });
    if (error) {
      toast({ title: 'Could not add task', description: error.message, variant: 'destructive' });
      return false;
    }
    await loadTasks();
    return true;
  };

  const handleQuickAdd = async () => {
    if (!quickMember || !quickTitle.trim()) return;
    setIsAddingQuick(true);
    const ok = await createTask(quickMember, quickTitle, quickPriority, quickDue);
    if (ok) {
      setQuickTitle('');
      setQuickDue('');
      const m = members.find(x => x.profileId === quickMember);
      toast({ title: `Task added for ${m?.fullName || 'member'}` });
    }
    setIsAddingQuick(false);
  };

  const handleInlineAdd = async (memberProfileId: string) => {
    const title = inlineTitles[memberProfileId] || '';
    if (!title.trim()) return;
    setInlineBusy(memberProfileId);
    const ok = await createTask(memberProfileId, title, 'medium', '');
    if (ok) setInlineTitles(prev => ({ ...prev, [memberProfileId]: '' }));
    setInlineBusy(null);
  };

  const updateStatus = async (task: MemberTask, status: TaskStatus) => {
    const completed_at = status === 'completed' ? new Date().toISOString() : null;
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status, completed_at } : t)));
    const { error } = await (supabase as any).from('crm_tasks').update({ status, completed_at }).eq('id', task.id);
    if (error) {
      toast({ title: 'Could not update task', description: error.message, variant: 'destructive' });
      loadTasks();
    }
  };

  const updatePriority = async (task: MemberTask, priority: TaskPriority) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, priority } : t)));
    await (supabase as any).from('crm_tasks').update({ priority }).eq('id', task.id);
  };

  const updateDueDate = async (task: MemberTask, due_date: string) => {
    const value = due_date || null;
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, due_date: value } : t)));
    await (supabase as any).from('crm_tasks').update({ due_date: value }).eq('id', task.id);
  };

  const deleteTask = async (task: MemberTask) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    const { error } = await (supabase as any).from('crm_tasks').delete().eq('id', task.id);
    if (error) {
      toast({ title: 'Could not delete task', description: error.message, variant: 'destructive' });
      loadTasks();
    }
  };

  const tasksByMember = useMemo(() => {
    const map = new Map<string, MemberTask[]>();
    tasks.forEach(t => {
      if (!map.has(t.assigned_to)) map.set(t.assigned_to, []);
      map.get(t.assigned_to)!.push(t);
    });
    return map;
  }, [tasks]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => m.fullName.toLowerCase().includes(q) || m.role.includes(q));
  }, [members, search]);

  const openTasks = tasks.filter(isOpen);
  const overdueCount = openTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length;
  const memberOptions = members.map(m => ({ value: m.profileId, label: m.fullName }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Members</span>
          </div>
          <p className="text-2xl font-bold">{members.length}</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ListChecks className="w-4 h-4" />
            <span className="text-sm">Open tasks</span>
          </div>
          <p className="text-2xl font-bold">{openTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{tasks.length} total</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-destructive">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Overdue</span>
          </div>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : ''}`}>{overdueCount}</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Avg / person</span>
          </div>
          <p className="text-2xl font-bold">{members.length ? (openTasks.length / members.length).toFixed(1) : '0'}</p>
        </div>
      </div>

      {/* Quick assign */}
      <div className="glass-panel p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <GlassInput
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
            placeholder="What needs to get done?"
            className="flex-1"
          />
          <div className="flex flex-wrap gap-2">
            <GlassSelect
              value={quickMember}
              onChange={setQuickMember}
              options={memberOptions}
              placeholder="Assign to..."
              className="min-w-[170px]"
            />
            <GlassSelect
              value={quickPriority}
              onChange={v => setQuickPriority(v as TaskPriority)}
              options={PRIORITY_OPTIONS}
              className="min-w-[110px]"
            />
            <input
              type="date"
              value={quickDue}
              onChange={e => setQuickDue(e.target.value)}
              className="h-10 px-3 rounded-xl bg-secondary/50 border border-border/40 text-sm text-foreground"
            />
            <GlassButtonNew
              variant="primary"
              size="default"
              onClick={handleQuickAdd}
              disabled={isAddingQuick || !quickTitle.trim() || !quickMember}
              leftIcon={isAddingQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            >
              Add
            </GlassButtonNew>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <GlassInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-10" />
        </div>
        <GlassButtonNew
          variant={showCompleted ? 'primary' : 'ghost'}
          size="default"
          onClick={() => setShowCompleted(v => !v)}
          leftIcon={showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        >
          {showCompleted ? 'Hide completed' : 'Show completed'}
        </GlassButtonNew>
      </div>

      {/* Member cards */}
      {filteredMembers.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredMembers.map(member => {
            const memberTasks = (tasksByMember.get(member.profileId) || []).filter(t => showCompleted || isOpen(t));
            const open = (tasksByMember.get(member.profileId) || []).filter(isOpen).length;
            const isMe = member.profileId === profileId;
            return (
              <motion.div
                key={member.profileId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 border-b border-border/40">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {member.fullName}
                      {isMe && <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">(you)</span>}
                    </p>
                    <span className={`inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${roleClass(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${open > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {open} open
                  </span>
                </div>

                <div className="divide-y divide-border/30">
                  <AnimatePresence initial={false}>
                    {memberTasks.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No open tasks. Add one below.</p>
                      </motion.div>
                    )}
                    {memberTasks.map(task => {
                      const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                      const StatusIcon = cfg.icon;
                      const due = getDueLabel(task.due_date);
                      const canDelete = canManage || task.created_by === profileId;
                      const done = task.status === 'completed' || task.status === 'cancelled';
                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="group px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20 transition"
                        >
                          <button
                            onClick={() => updateStatus(task, nextStatus(task.status))}
                            className="shrink-0"
                            title={`Status: ${cfg.label} — click to advance`}
                          >
                            <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug truncate ${done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                            {task.crm_deals && (
                              <p className="text-[10px] text-muted-foreground truncate">Lead: {task.crm_deals.title}</p>
                            )}
                          </div>
                          <select
                            value={task.priority}
                            onChange={e => updatePriority(task, e.target.value as TaskPriority)}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 bg-transparent ${priorityClass(task.priority)}`}
                          >
                            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
                          </select>
                          <input
                            type="date"
                            value={task.due_date ? task.due_date.slice(0, 10) : ''}
                            onChange={e => updateDueDate(task, e.target.value)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 bg-transparent w-[112px] ${
                              due?.urgent && !done ? 'border-destructive/30 text-destructive' : 'border-border/40 text-muted-foreground'
                            }`}
                          />
                          {canDelete && (
                            <button
                              onClick={() => deleteTask(task)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition shrink-0"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="px-3 py-2.5 border-t border-border/40 bg-secondary/10 flex gap-2">
                  <GlassInput
                    value={inlineTitles[member.profileId] || ''}
                    onChange={e => setInlineTitles(prev => ({ ...prev, [member.profileId]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleInlineAdd(member.profileId); }}
                    placeholder={`Add a task for ${member.fullName.split(' ')[0]}...`}
                    className="flex-1 h-9 text-sm"
                  />
                  <GlassButtonNew
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInlineAdd(member.profileId)}
                    disabled={inlineBusy === member.profileId || !(inlineTitles[member.profileId] || '').trim()}
                    leftIcon={inlineBusy === member.profileId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  >
                    Add
                  </GlassButtonNew>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
