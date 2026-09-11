import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, Star, Clock, CheckCircle, Loader2, CreditCard, Send, Trash2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BillableTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  fixed_price: number;
  currency: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  platform_fee_percent: number | null;
  platform_fee_amount: number | null;
  created_at: string;
  creator_profile?: { full_name: string | null; avatar_url: string | null };
  assignee_profile?: { full_name: string | null; avatar_url: string | null };
  ratings?: { rating: number; comment: string | null; rated_by: string }[];
}

interface BillableTasksPanelProps {
  projectId: string;
  profileId: string;
  isOwner: boolean;
  teamMembers: {
    profile_id: string;
    profiles: { id: string; full_name: string | null; avatar_url: string | null };
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; dotColor: string }> = {
  open: { label: 'Open', variant: 'secondary', dotColor: 'bg-muted-foreground' },
  in_progress: { label: 'In Progress', variant: 'outline', dotColor: 'bg-blue-500' },
  submitted: { label: 'Submitted', variant: 'outline', dotColor: 'bg-amber-500' },
  approved: { label: 'Approved', variant: 'outline', dotColor: 'bg-emerald-500' },
  paid: { label: 'Paid', variant: 'default', dotColor: 'bg-primary' },
  disputed: { label: 'Disputed', variant: 'destructive', dotColor: 'bg-destructive' },
};

export function BillableTasksPanel({ projectId, profileId, isOwner, teamMembers }: BillableTasksPanelProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<BillableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [ratingTask, setRatingTask] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', fixed_price: '', assigned_to: '' });

  useEffect(() => { loadTasks(); }, [projectId]);

  const loadTasks = async () => {
    const { data } = await (supabase as any)
      .from('billable_tasks')
      .select(`
        *,
        creator_profile:created_by(full_name, avatar_url),
        assignee_profile:assigned_to(full_name, avatar_url),
        ratings:task_ratings(rating, comment, rated_by)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.fixed_price) return;
    setIsCreating(true);

    const { error } = await (supabase as any).from('billable_tasks').insert({
      project_id: projectId,
      title: form.title,
      description: form.description || null,
      fixed_price: parseFloat(form.fixed_price),
      created_by: profileId,
      assigned_to: form.assigned_to || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setForm({ title: '', description: '', fixed_price: '', assigned_to: '' });
      setShowCreate(false);
      loadTasks();
    }
    setIsCreating(false);
  };

  const updateStatus = async (taskId: string, status: string) => {
    const updates: any = { status };
    if (status === 'submitted') updates.submitted_at = new Date().toISOString();
    if (status === 'approved') updates.approved_at = new Date().toISOString();

    await (supabase as any).from('billable_tasks').update(updates).eq('id', taskId);
    loadTasks();
  };

  const handlePay = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-task-payment', {
        body: { action: 'create-checkout', billable_task_id: taskId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Payment Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRate = async (taskId: string, assigneeId: string) => {
    if (ratingValue < 1) return;
    const { error } = await (supabase as any).from('task_ratings').insert({
      billable_task_id: taskId,
      rated_by: profileId,
      rated_profile_id: assigneeId,
      rating: ratingValue,
      comment: ratingComment || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRatingTask(null);
      setRatingValue(0);
      setRatingComment('');
      loadTasks();
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('billable_tasks').delete().eq('id', id);
    loadTasks();
  };

  const totalValue = tasks.reduce((s, t) => s + t.fixed_price, 0);
  const paidValue = tasks.filter(t => t.status === 'paid').reduce((s, t) => s + t.fixed_price, 0);
  const pendingValue = totalValue - paidValue;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Value', value: totalValue, icon: DollarSign, accent: 'bg-primary/8' },
          { label: 'Paid', value: paidValue, icon: CheckCircle, accent: 'bg-emerald-500/8' },
          { label: 'Outstanding', value: pendingValue, icon: Clock, accent: 'bg-amber-500/8' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${kpi.accent} flex items-center justify-center`}>
                <kpi.icon className="w-3.5 h-3.5 text-foreground/70" />
              </div>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tracking-tight">€{kpi.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Billable Tasks</h4>
          <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Task
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <h5 className="text-sm font-semibold">Create Billable Task</h5>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Landing page design"
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the deliverable..."
                  rows={2}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fixed Price (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fixed_price}
                    onChange={e => setForm(p => ({ ...p, fixed_price: e.target.value }))}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assign To</label>
                  <select
                    value={form.assigned_to}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.profile_id} value={m.profile_id}>{m.profiles.full_name || 'Member'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={isCreating || !form.title || !form.fixed_price}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No billable tasks yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Create your first task to start tracking payments</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
            const isCreator = task.created_by === profileId;
            const isAssignee = task.assigned_to === profileId;
            const hasRated = task.ratings?.some(r => r.rated_by === profileId);
            const avgRating = task.ratings?.length
              ? (task.ratings.reduce((s, r) => s + r.rating, 0) / task.ratings.length).toFixed(1)
              : null;
            const isExpanded = expandedTask === task.id;

            return (
              <motion.div
                key={task.id}
                layout
                className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/20"
              >
                {/* Task Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dotColor}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{task.title}</span>
                      <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0 shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {task.assignee_profile && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assignee_profile.full_name || 'Assignee'}
                        </span>
                      )}
                      <span>{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                      {avgRating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {avgRating}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-sm font-bold tabular-nums shrink-0">€{task.fixed_price.toLocaleString()}</span>

                  {/* Chevron */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </div>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                        {task.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                        )}

                        {/* Platform fee info */}
                        {task.platform_fee_percent != null && task.status === 'paid' && (
                          <p className="text-xs text-muted-foreground">
                            Platform fee: {task.platform_fee_percent}% (€{task.platform_fee_amount?.toLocaleString()})
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAssignee && task.status === 'in_progress' && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'submitted'); }} className="gap-1.5 text-xs">
                              <Send className="w-3 h-3" /> Submit Work
                            </Button>
                          )}
                          {isCreator && task.status === 'submitted' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'approved'); }} className="gap-1.5 text-xs">
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                          )}
                          {isCreator && task.status === 'approved' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePay(task.id); }} className="gap-1.5 text-xs">
                              <CreditCard className="w-3 h-3" /> Pay Now
                            </Button>
                          )}
                          {isCreator && task.status === 'paid' && !hasRated && task.assigned_to && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRatingTask(task.id); }} className="gap-1.5 text-xs">
                              <Star className="w-3 h-3" /> Rate
                            </Button>
                          )}
                          {isCreator && task.status === 'open' && (
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="text-destructive hover:text-destructive gap-1.5 text-xs">
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          )}
                        </div>

                        {/* Rating Form */}
                        {ratingTask === task.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <p className="text-xs font-medium">Rate this work</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => setRatingValue(star)} className="focus:outline-none p-0.5">
                                  <Star className={`w-6 h-6 transition-colors ${star <= ratingValue ? 'fill-amber-400 text-amber-400' : 'text-border hover:text-amber-300'}`} />
                                </button>
                              ))}
                            </div>
                            <input
                              value={ratingComment}
                              onChange={e => setRatingComment(e.target.value)}
                              placeholder="Optional comment..."
                              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => { setRatingTask(null); setRatingValue(0); }}>Cancel</Button>
                              <Button size="sm" onClick={() => handleRate(task.id, task.assigned_to!)} disabled={ratingValue < 1}>Submit Rating</Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
