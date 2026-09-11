import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, X, User, Calendar, MoreVertical, Trash2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { CRMTask, CRMContact, CRMDeal } from './types';
import { format, isPast, isToday } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CRMTasksProps {
  clusterId: string;
  profileId: string;
}

export function CRMTasks({ clusterId, profileId }: CRMTasksProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_id: '',
    deal_id: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    loadTasks();
    loadContacts();
    loadDeals();

    const channel = supabase
      .channel('crm_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        profiles:assigned_to(id, full_name, avatar_url),
        crm_contacts(id, name),
        crm_deals(id, title)
      `)
      .eq('cluster_id', clusterId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (!error && data) {
      setTasks(data as unknown as CRMTask[]);
    }
    setIsLoading(false);
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('crm_contacts')
      .select('id, name')
      .eq('cluster_id', clusterId);
    if (data) setContacts(data as unknown as CRMContact[]);
  };

  const loadDeals = async () => {
    const { data } = await supabase
      .from('crm_deals')
      .select('id, title')
      .eq('cluster_id', clusterId);
    if (data) setDeals(data as unknown as CRMDeal[]);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('crm_tasks').insert({
      cluster_id: clusterId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      contact_id: formData.contact_id || null,
      deal_id: formData.deal_id || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      assigned_to: profileId,
      created_by: profileId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Task created' });
      closeModal();
      loadTasks();
    }

    setIsSubmitting(false);
  };

  const toggleComplete = async (task: CRMTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('crm_tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null 
      })
      .eq('id', task.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadTasks();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Task deleted' });
      loadTasks();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      title: '',
      description: '',
      contact_id: '',
      deal_id: '',
      due_date: '',
      priority: 'medium',
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const overdueTasks = filteredTasks.filter(t => 
    t.status === 'pending' && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  );
  const todayTasks = filteredTasks.filter(t => 
    t.status === 'pending' && t.due_date && isToday(new Date(t.due_date))
  );
  const upcomingTasks = filteredTasks.filter(t => 
    t.status === 'pending' && t.due_date && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  );
  const noDueDateTasks = filteredTasks.filter(t => t.status === 'pending' && !t.due_date);
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-green-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTaskList = (taskList: CRMTask[], title: string, icon: React.ReactNode) => {
    if (taskList.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">({taskList.length})</span>
        </div>
        <div className="space-y-2">
          {taskList.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 flex items-start gap-3"
            >
              <button
                onClick={() => toggleComplete(task)}
                className="mt-0.5 flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {task.due_date && (
                    <span className={`flex items-center gap-1 ${
                      isPast(new Date(task.due_date)) && task.status === 'pending' ? 'text-red-400' : ''
                    }`}>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(task.due_date), 'MMM d, h:mm a')}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                    <AlertTriangle className="w-3 h-3" />
                    {task.priority}
                  </span>
                  {task.crm_contacts && (
                    <span>Contact: {task.crm_contacts.name}</span>
                  )}
                  {task.crm_deals && (
                    <span>Deal: {task.crm_deals.title}</span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-secondary/50 rounded">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleComplete(task)}>
                    {task.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleDelete(task.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
        </div>
        <GlassButton variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </GlassButton>
      </div>

      {/* Task Lists */}
      {filteredTasks.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <>
          {renderTaskList(overdueTasks, 'Overdue', <AlertTriangle className="w-4 h-4 text-red-400" />)}
          {renderTaskList(todayTasks, 'Today', <Clock className="w-4 h-4 text-amber-400" />)}
          {renderTaskList(upcomingTasks, 'Upcoming', <Calendar className="w-4 h-4 text-blue-400" />)}
          {renderTaskList(noDueDateTasks, 'No Due Date', <Circle className="w-4 h-4 text-muted-foreground" />)}
          {filterStatus !== 'pending' && renderTaskList(completedTasks, 'Completed', <CheckCircle2 className="w-4 h-4 text-green-400" />)}
        </>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Add Task</h2>
                <button onClick={closeModal} className="p-1 hover:bg-secondary/50 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <GlassInput
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Task details..."
                    className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Due Date</label>
                    <GlassInput
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData(p => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact</label>
                    <select
                      value={formData.contact_id}
                      onChange={e => setFormData(p => ({ ...p, contact_id: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Deal</label>
                    <select
                      value={formData.deal_id}
                      onChange={e => setFormData(p => ({ ...p, deal_id: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButton onClick={closeModal} className="flex-1">Cancel</GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Task'}
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
