import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Loader2, Trash2, Check, DollarSign, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Milestone {
  id: string;
  title: string;
  due_date: string;
  status: string;
  deadline_type: string;
  is_billing_trigger: boolean;
  created_at: string;
}

interface ProjectTimelineProps {
  projectId: string;
  isOwner: boolean;
  profileId: string;
  tasks: { status: string }[];
}

export function ProjectTimeline({ projectId, isOwner, tasks }: ProjectTimelineProps) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDeadlineType, setNewDeadlineType] = useState('hard');
  const [newIsBilling, setNewIsBilling] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadMilestones();
  }, [projectId]);

  const loadMilestones = async () => {
    const { data } = await (supabase as any)
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (data) setMilestones(data as Milestone[]);
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newDate) return;
    setIsAdding(true);

    const { error } = await (supabase as any)
      .from('project_milestones')
      .insert({
        project_id: projectId,
        title: newTitle.trim(),
        due_date: newDate,
        deadline_type: newDeadlineType,
        is_billing_trigger: newIsBilling,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewTitle('');
      setNewDate('');
      setNewDeadlineType('hard');
      setNewIsBilling(false);
      setShowAdd(false);
      loadMilestones();
    }
    setIsAdding(false);
  };

  const toggleStatus = async (m: Milestone) => {
    const newStatus = m.status === 'completed' ? 'pending' : 'completed';
    await (supabase as any).from('project_milestones').update({ status: newStatus }).eq('id', m.id);
    loadMilestones();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('project_milestones').delete().eq('id', id);
    loadMilestones();
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'approved').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const today = startOfDay(new Date());

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Overall Progress</h4>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">{doneTasks} of {totalTasks} tasks completed</p>
      </div>

      {/* Milestones */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Milestones</h4>
        {isOwner && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-panel p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Milestone title..."
            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setNewDeadlineType('hard')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  newDeadlineType === 'hard' ? 'bg-destructive/20 text-destructive' : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                Hard Deadline
              </button>
              <button
                onClick={() => setNewDeadlineType('soft')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  newDeadlineType === 'soft' ? 'bg-amber-500/20 text-amber-500' : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                Soft Deadline
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={newIsBilling}
                onChange={e => setNewIsBilling(e.target.checked)}
                className="rounded"
              />
              <DollarSign className="w-3 h-3 text-emerald-500" />
              Billing Trigger
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm rounded-lg bg-secondary/50 hover:bg-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={isAdding || !newTitle.trim() || !newDate} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </motion.div>
      )}

      {milestones.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground text-sm">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No milestones yet
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, i) => {
            const dueDate = new Date(m.due_date);
            const isOverdue = isBefore(dueDate, today) && m.status !== 'completed';
            const daysLeft = differenceInDays(dueDate, today);
            const isHard = m.deadline_type === 'hard';

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-panel p-3 flex items-center gap-3 ${m.status === 'completed' ? 'opacity-60' : ''} ${
                  isOverdue && isHard ? 'border-destructive/50' : ''
                }`}
              >
                <button onClick={() => toggleStatus(m)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  m.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'
                }`}>
                  {m.status === 'completed' && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${m.status === 'completed' ? 'line-through' : ''}`}>{m.title}</p>
                    {m.is_billing_trigger && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                        <DollarSign className="w-2.5 h-2.5" /> Billing
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isHard ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {isHard ? 'Hard' : 'Soft'}
                    </span>
                  </div>
                  <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {format(dueDate, 'MMM d, yyyy')}
                    {m.status !== 'completed' && (
                      <span className="ml-1">
                        {isOverdue ? `(${Math.abs(daysLeft)}d overdue)` : daysLeft === 0 ? '(today)' : `(${daysLeft}d left)`}
                      </span>
                    )}
                  </p>
                </div>
                {isOwner && (
                  <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
