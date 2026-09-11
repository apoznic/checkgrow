import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckCircle2, Circle, Clock, AlertCircle, 
  Trash2, User, Loader2, ShieldCheck, Archive, ArchiveRestore,
  MessageSquare, Edit3, Save, X, ChevronDown, ChevronUp, GripVertical
} from 'lucide-react';
import { MentionInput } from '@/components/crm/MentionInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  archived_at?: string | null;
  archived_from?: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamMember {
  profile_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MentionMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TaskManagerProps {
  projectId: string;
  isOwner: boolean;
  canManage?: boolean;
  profileId: string;
  teamMembers: TeamMember[];
  onActivityCreated: () => void;
}

const statusConfig = {
  todo: { label: 'To Do', icon: Circle, color: 'text-muted-foreground', headerBg: 'bg-secondary/40' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-500', headerBg: 'bg-amber-500/10' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500', headerBg: 'bg-emerald-500/10' },
  approved: { label: 'Approved', icon: ShieldCheck, color: 'text-primary', headerBg: 'bg-primary/10' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground', bar: 'bg-muted' },
  medium: { label: 'Medium', color: 'bg-amber-500/20 text-amber-600', bar: 'bg-amber-500' },
  high: { label: 'High', color: 'bg-destructive/20 text-destructive', bar: 'bg-destructive' },
};

// Droppable column wrapper
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[120px] rounded-lg p-1 transition-colors ${isOver ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
    >
      {children}
    </div>
  );
}

// Sortable task card wrapper
function SortableTaskCard({ task, children }: { task: Task; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative">
        <div
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function TaskManager({ projectId, isOwner, canManage = false, profileId, teamMembers, onActivityCreated }: TaskManagerProps) {
  const isTeamMember = teamMembers.some(m => m.profile_id === profileId);
  const canEdit = isOwner || canManage || isTeamMember;
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', estimated_hours: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showApproved, setShowApproved] = useState(false);

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: '', assigned_to: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [descriptionOpenId, setDescriptionOpenId] = useState<string | null>(null);

  const mentionMembers: MentionMember[] = teamMembers.map(m => ({
    id: m.profiles.id,
    full_name: m.profiles.full_name,
    avatar_url: m.profiles.avatar_url,
  }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => { loadTasks(); }, [projectId]);

  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach(t => {
        if (!taskComments[t.id]) loadComments(t.id);
      });
    }
  }, [tasks]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        id, title, description, status, priority,
        assigned_to, due_date, estimated_hours, actual_hours, created_at, archived_at, archived_from,
        profiles:assigned_to ( full_name, avatar_url )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) setTasks(data as unknown as Task[]);
    setIsLoading(false);
  };

  const loadComments = async (taskId: string) => {
    const { data } = await (supabase as any)
      .from('project_task_comments')
      .select('id, content, created_at, author_id, profiles:author_id(full_name, avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) setTaskComments(prev => ({ ...prev, [taskId]: data as TaskComment[] }));
  };

  const toggleComments = (taskId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddComment = async (taskId: string, text: string) => {
    if (!text.trim()) return;
    setIsSendingComment(true);
    const { error } = await (supabase as any).from('project_task_comments').insert({
      task_id: taskId,
      author_id: profileId,
      content: text.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadComments(taskId);
      setExpandedComments(prev => new Set(prev).add(taskId));
    }
    setIsSendingComment(false);
  };

  const handleDeleteComment = async (commentId: string, taskId: string) => {
    await (supabase as any).from('project_task_comments').delete().eq('id', commentId);
    loadComments(taskId);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    setIsAdding(true);
    const { error } = await supabase.from('project_tasks').insert({
      project_id: projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || null,
      estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
    }).select().single();

    if (error) {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('project_activities').insert({
        project_id: projectId, actor_id: profileId, activity_type: 'task_created',
        description: `Created task: ${newTask.title}`,
      });
      onActivityCreated();
      setNewTask({ title: '', description: '', priority: 'medium', assigned_to: '', estimated_hours: '' });
      setShowAddForm(false);
      loadTasks();
      toast({ title: 'Task created' });
    }
    setIsAdding(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
      loadTasks();
    } else {
      await supabase.from('project_activities').insert({
        project_id: projectId, actor_id: profileId, activity_type: 'task_status_changed',
        description: `Moved "${task.title}" to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`,
      });
      onActivityCreated();
    }
  };

  const handleActualHoursUpdate = async (taskId: string, hours: string) => {
    const value = hours ? parseFloat(hours) : null;
    await supabase.from('project_tasks').update({ actual_hours: value }).eq('id', taskId);
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) {
      toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('project_activities').insert({
        project_id: projectId, actor_id: profileId, activity_type: 'task_deleted',
        description: `Deleted task: ${task.title}`,
      });
      onActivityCreated();
      loadTasks();
      toast({ title: 'Task deleted' });
    }
  };

  // --- Inline Editing ---
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
  };

  const saveEditing = async () => {
    if (!editingTaskId || !editForm.title.trim()) return;
    setIsSavingEdit(true);
    const { error } = await supabase.from('project_tasks').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      priority: editForm.priority,
      assigned_to: editForm.assigned_to || null,
    }).eq('id', editingTaskId);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Task updated' });
      setEditingTaskId(null);
      loadTasks();
    }
    setIsSavingEdit(false);
  };

  const handleArchiveToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const isArchiving = !task.archived_at;
    const updates: any = isArchiving
      ? { archived_at: new Date().toISOString(), archived_from: task.status }
      : { archived_at: null, archived_from: null, status: task.archived_from || task.status };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    const { error } = await supabase.from('project_tasks').update(updates).eq('id', taskId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      loadTasks();
    } else {
      toast({ title: isArchiving ? 'Task archived' : 'Task restored' });
    }
  };

  const activeTasks = tasks.filter(t => !t.archived_at);
  const archivedTasks = tasks.filter(t => !!t.archived_at);
  const visibleTasks = showArchive ? archivedTasks : activeTasks;

  const groupedTasks = {
    todo: visibleTasks.filter(t => (showArchive ? t.archived_from : t.status) === 'todo'),
    in_progress: visibleTasks.filter(t => (showArchive ? t.archived_from : t.status) === 'in_progress'),
    done: visibleTasks.filter(t => (showArchive ? t.archived_from : t.status) === 'done'),
    approved: visibleTasks.filter(t => (showArchive ? t.archived_from : t.status) === 'approved'),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusTransitions = (status: string) => {
    switch (status) {
      case 'todo': return [{ target: 'in_progress', label: 'Start →' }];
      case 'in_progress': return [
        { target: 'todo', label: '← To Do' },
        { target: 'done', label: 'Done →' },
      ];
      case 'done': return [
        { target: 'in_progress', label: '← Reopen' },
        ...(canEdit ? [{ target: 'approved', label: 'Approve ✓' }] : []),
      ];
      case 'approved': return canEdit ? [{ target: 'todo', label: '← Reopen' }] : [];
      default: return [];
    }
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine target status
    let targetStatus: string | null = null;
    const overId = over.id as string;

    // Check if dropped on a column
    if (['todo', 'in_progress', 'done', 'approved'].includes(overId)) {
      targetStatus = overId;
    } else {
      // Dropped on another task - get that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && targetStatus !== task.status) {
      // Only owners can move to approved
      if (targetStatus === 'approved' && !canEdit) return;
      handleStatusChange(taskId, targetStatus);
    }
  };


  const renderTaskCard = (task: Task, status: keyof typeof statusConfig, isDragOverlay = false) => {
    const comments = taskComments[task.id] || [];
    const pConfig = priorityConfig[task.priority as keyof typeof priorityConfig];
    const isEditing = editingTaskId === task.id;
    const commentsOpen = expandedComments.has(task.id);
    const descOpen = descriptionOpenId === task.id;

    return (
      <div
        className={`group bg-card rounded-xl border overflow-hidden transition-all hover:shadow-md ${
          task.priority === 'high' 
            ? 'border-destructive/30 hover:border-destructive/50' 
            : 'border-border hover:border-primary/30'
        } ${isDragOverlay ? 'shadow-xl ring-2 ring-primary/20 rotate-1' : ''}`}
      >
        {/* Priority indicator bar */}
        <div className={`h-1 ${pConfig?.bar || 'bg-muted'}`} />

        {/* Card body */}
        <div className="p-3 pl-7 space-y-2">
          {isEditing ? (
            /* --- EDIT MODE --- */
            <div className="space-y-2.5">
              <input
                value={editForm.title}
                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm font-medium bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description..."
                className="w-full min-h-[50px] px-2 py-1.5 text-xs bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <select
                  value={editForm.priority}
                  onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={editForm.assigned_to}
                  onChange={e => setEditForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.profile_id} value={m.profile_id}>
                      {m.profiles.full_name || 'Member'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1.5 justify-end">
                <button onClick={cancelEditing} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={saveEditing}
                  disabled={isSavingEdit || !editForm.title.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* --- VIEW MODE --- */
            <>
              {/* Title + actions */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm leading-snug ${
                    task.status === 'done' || task.status === 'approved' 
                      ? 'line-through text-muted-foreground' 
                      : 'text-foreground'
                  }`}>
                    {task.title}
                  </p>
                  {task.archived_at && task.archived_from && (
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider rotate-[-6deg] shadow-md border-2 ${
                      task.archived_from === 'approved' ? 'bg-primary/90 text-primary-foreground border-primary/40' :
                      task.archived_from === 'done' ? 'bg-emerald-500/90 text-white border-emerald-300' :
                      'bg-slate-500/90 text-white border-slate-300'
                    }`}>
                      {task.archived_from === 'approved' ? '✓ Approved' : task.archived_from === 'done' ? '✓ Done' : task.archived_from}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditing(task)}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit task"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleArchiveToggle(task.id)}
                      className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={task.archived_at ? 'Restore task' : 'Archive task'}
                    >
                      {task.archived_at ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable description preview */}
              {task.description && (
                <div>
                  <button
                    onClick={() => setDescriptionOpenId(descOpen ? null : task.id)}
                    className="w-full text-left"
                  >
                    <div className={`text-xs text-muted-foreground leading-relaxed transition-all ${
                      descOpen ? '' : 'line-clamp-1'
                    }`}>
                      {task.description}
                    </div>
                    {!descOpen && task.description.length > 60 && (
                      <span className="text-[10px] text-primary/70 hover:text-primary font-medium">Show more…</span>
                    )}
                  </button>
                  <AnimatePresence>
                    {descOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                        </div>
                        <button
                          onClick={() => setDescriptionOpenId(null)}
                          className="mt-1 text-[10px] text-primary/70 hover:text-primary font-medium"
                        >
                          Show less
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Assignee + priority */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.profiles?.full_name ? (
                  <div className="flex items-center gap-1.5 bg-secondary/60 rounded-full pl-0.5 pr-2.5 py-0.5">
                    {task.profiles.avatar_url ? (
                      <img src={task.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-primary" />
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-foreground/80">{task.profiles.full_name.split(' ')[0]}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${pConfig?.color}`}>
                  {pConfig?.label}
                </span>
              </div>

              {/* Hours tracking */}
              {(task.estimated_hours != null || task.actual_hours != null) && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {task.estimated_hours != null && <span>Est: {task.estimated_hours}h</span>}
                  {task.actual_hours != null && <span>Act: {task.actual_hours}h</span>}
                  {task.estimated_hours != null && task.actual_hours != null && (
                    <span className={`font-medium ${task.actual_hours > task.estimated_hours ? 'text-destructive' : 'text-emerald-500'}`}>
                      ({task.actual_hours > task.estimated_hours ? '+' : ''}{(task.actual_hours - task.estimated_hours).toFixed(1)}h)
                    </span>
                  )}
                </div>
              )}

              {/* Log hours for in-progress/done */}
              {(status === 'in_progress' || status === 'done') && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground">Log hours:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    defaultValue={task.actual_hours ?? ''}
                    onBlur={(e) => handleActualHoursUpdate(task.id, e.target.value)}
                    className="w-16 text-xs px-2 py-1 rounded-md bg-input border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              {/* Status transitions */}
              <div className="flex gap-1.5 flex-wrap">
                {getStatusTransitions(status).map((transition) => (
                  <button
                    key={transition.target}
                    onClick={() => handleStatusChange(task.id, transition.target)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                      transition.target === 'approved'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                        : transition.target === 'done'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {transition.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Comments section */}
          <div className="border-t border-border/40 pt-2 space-y-2">
            <button
              onClick={() => toggleComments(task.id)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
              {comments.length > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{comments.length}</span>
              )}
              <span className="ml-auto">
                {commentsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </button>

            <AnimatePresence>
              {commentsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {comments.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                      {comments.map((c) => (
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
                              <span className="text-[10px] font-medium">{c.profiles?.full_name || 'User'}</span>
                              <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            </div>
                            <p className="text-xs text-foreground/80 mt-0.5 break-words">{c.content}</p>
                          </div>
                          {c.author_id === profileId && (
                            <button
                              onClick={() => handleDeleteComment(c.id, task.id)}
                              className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-all"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment with @mention */}
                  <MentionInput
                    orgMembers={mentionMembers}
                    onSubmit={(text) => handleAddComment(task.id, text)}
                    isSubmitting={isSendingComment}
                    placeholder="Comment... @ to mention"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2">
        <button
          onClick={() => setShowArchive(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
            showArchive
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
          }`}
          title={showArchive ? 'Show active tasks' : 'Show archived tasks'}
        >
          <Archive className="w-4 h-4" />
          {showArchive ? `Archive (${archivedTasks.length})` : `Archive${archivedTasks.length ? ` (${archivedTasks.length})` : ''}`}
        </button>
        {canEdit && !showArchive && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl border border-border p-5 space-y-4"
          >
            <input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              placeholder="Description (optional)..."
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              className="w-full min-h-[80px] px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-3">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <select
                value={newTask.assigned_to}
                onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.profile_id} value={member.profile_id}>
                    {member.profiles.full_name || 'Team Member'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 8"
                value={newTask.estimated_hours}
                onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                className="w-32 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary text-muted-foreground">Cancel</button>
              <button
                onClick={handleAddTask}
                disabled={isAdding || !newTask.title.trim()}
                className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['todo', 'in_progress', 'done'] as Array<keyof typeof groupedTasks>).map((status) => {
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const taskCount = groupedTasks[status].length;
            const taskIds = groupedTasks[status].map(t => t.id);
            
            return (
              <div key={status} className="space-y-2">
                {/* Column Header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.headerBg}`}>
                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  <span className="font-semibold text-xs uppercase tracking-wider text-foreground">{config.label}</span>
                  <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    taskCount > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {taskCount}
                  </span>
                </div>
                
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  <DroppableColumn id={status}>
                    {groupedTasks[status].map((task) => (
                      <SortableTaskCard key={task.id} task={task}>
                        {renderTaskCard(task, status)}
                      </SortableTaskCard>
                    ))}
                    
                    {groupedTasks[status].length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-border/40 p-6 text-center">
                        <StatusIcon className={`w-5 h-5 mx-auto mb-1.5 ${config.color} opacity-30`} />
                        <p className="text-xs text-muted-foreground/60">Drop tasks here</p>
                      </div>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>

        {/* Approved (archived-style collapsible row) */}
        {(() => {
          const status = 'approved' as const;
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const taskCount = groupedTasks[status].length;
          const taskIds = groupedTasks[status].map(t => t.id);
          return (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setShowApproved(v => !v)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${config.headerBg} hover:opacity-90 transition-opacity`}
              >
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className="font-semibold text-xs uppercase tracking-wider text-foreground">{config.label}</span>
                <span className="text-[10px] text-muted-foreground normal-case font-normal tracking-normal">
                  (archived — counts toward done value)
                </span>
                <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  taskCount > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  {taskCount}
                </span>
                {showApproved ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showApproved && (
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  <DroppableColumn id={status}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {groupedTasks[status].map((task) => (
                        <SortableTaskCard key={task.id} task={task}>
                          {renderTaskCard(task, status)}
                        </SortableTaskCard>
                      ))}
                    </div>
                    {groupedTasks[status].length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-border/40 p-4 text-center">
                        <p className="text-xs text-muted-foreground/60">Approved tasks will appear here</p>
                      </div>
                    )}
                  </DroppableColumn>
                </SortableContext>
              )}
            </div>
          );
        })()}

        <DragOverlay>
          {activeTask ? renderTaskCard(activeTask, activeTask.status as keyof typeof statusConfig, true) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
