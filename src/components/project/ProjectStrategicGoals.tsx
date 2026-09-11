import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Target, Loader2, Check, X, Pencil, CheckCircle2, Trophy, Sparkles, Star, Flag, Rocket, Compass, Mountain, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  progress: number;
  created_at: string;
}

interface Props {
  projectId: string;
  profileId: string;
  canManage: boolean;
}

const THEMES = [
  { icon: Rocket,   from: 'from-amber-400',  to: 'to-orange-500',  text: 'text-amber-700',  soft: 'bg-amber-50',  ring: 'ring-amber-300/50',  glow: 'shadow-amber-500/20',  bar: 'bg-amber-500'  },
  { icon: Compass,  from: 'from-violet-400', to: 'to-fuchsia-500', text: 'text-violet-700', soft: 'bg-violet-50', ring: 'ring-violet-300/50', glow: 'shadow-violet-500/20', bar: 'bg-violet-500' },
  { icon: Mountain, from: 'from-teal-400',   to: 'to-emerald-500', text: 'text-teal-700',   soft: 'bg-teal-50',   ring: 'ring-teal-300/50',   glow: 'shadow-teal-500/20',   bar: 'bg-teal-500'   },
  { icon: Flame,    from: 'from-rose-400',   to: 'to-pink-500',    text: 'text-rose-700',   soft: 'bg-rose-50',   ring: 'ring-rose-300/50',   glow: 'shadow-rose-500/20',   bar: 'bg-rose-500'   },
  { icon: Star,     from: 'from-sky-400',    to: 'to-indigo-500',  text: 'text-sky-700',    soft: 'bg-sky-50',    ring: 'ring-sky-300/50',    glow: 'shadow-sky-500/20',    bar: 'bg-sky-500'    },
  { icon: Flag,     from: 'from-lime-400',   to: 'to-green-500',   text: 'text-lime-700',   soft: 'bg-lime-50',   ring: 'ring-lime-300/50',   glow: 'shadow-lime-500/20',   bar: 'bg-lime-500'   },
];

export function ProjectStrategicGoals({ projectId, profileId, canManage }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = async () => {
    const { data } = await (supabase as any)
      .from('project_strategic_goals')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);
  useProjectTableRealtime(['project_strategic_goals'], projectId, () => { void load(); });

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await (supabase as any).from('project_strategic_goals').insert({
      project_id: projectId,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      created_by: profileId,
      position: goals.length,
    });
    setAdding(false);
    if (error) { toast({ title: 'Could not add', description: error.message, variant: 'destructive' }); return; }
    setNewTitle(''); setNewDesc('');
    load();
  };

  const toggleStatus = async (g: Goal) => {
    const isAchieved = g.status === 'achieved';
    const next = isAchieved ? 'active' : 'achieved';
    const nextProgress = isAchieved ? (g.progress === 100 ? 50 : g.progress) : 100;
    setGoals(prev => prev.map(x => x.id === g.id ? { ...x, status: next, progress: nextProgress } : x));
    await (supabase as any).from('project_strategic_goals').update({ status: next, progress: nextProgress }).eq('id', g.id);
  };

  const updateProgress = async (g: Goal, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const nextStatus = clamped === 100 ? 'achieved' : 'active';
    setGoals(prev => prev.map(x => x.id === g.id ? { ...x, progress: clamped, status: nextStatus } : x));
    await (supabase as any).from('project_strategic_goals').update({ progress: clamped, status: nextStatus }).eq('id', g.id);
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await (supabase as any).from('project_strategic_goals').delete().eq('id', id);
  };

  const startEdit = (g: Goal) => {
    setEditingId(g.id); setEditTitle(g.title); setEditDesc(g.description || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) { setEditingId(null); return; }
    const payload = { title: editTitle.trim(), description: editDesc.trim() || null };
    setGoals(prev => prev.map(g => g.id === editingId ? { ...g, ...payload } : g));
    await (supabase as any).from('project_strategic_goals').update(payload).eq('id', editingId);
    setEditingId(null);
  };

  const total = goals.length;
  const achieved = goals.filter(g => g.status === 'achieved').length;
  const inFlight = total - achieved;
  const pct = total ? Math.round(goals.reduce((s, g) => s + (g.progress ?? (g.status === 'achieved' ? 100 : 0)), 0) / total) : 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Visual Hero — big ring + breakdown bar + segment dots */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-accent/30 to-transparent blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-6 flex-wrap">
            {/* Big ring */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                <motion.circle
                  cx="40" cy="40" r="36" fill="none"
                  stroke="url(#goalGrad)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground leading-none">{pct}%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Mission</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                <p className="text-sm font-semibold">North Star Progress</p>
                {pct === 100 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <Sparkles className="w-3 h-3" /> Mission complete
                  </span>
                )}
              </div>

              {/* Stacked progress bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full bg-secondary/60 overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-primary/60 to-accent/60"
                  />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-foreground">{achieved}</span> achieved
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary/70" />
                    <span className="font-semibold text-foreground">{inFlight}</span> in flight
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{total}</span> total
                  </span>
                </div>
              </div>

              {/* Segment dots — one per goal */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {goals.map((g, i) => {
                  const theme = THEMES[i % THEMES.length];
                  const isAchieved = g.status === 'achieved';
                  return (
                    <div
                      key={g.id}
                      title={g.title}
                      className={`h-2 rounded-full transition-all ${
                        isAchieved
                          ? 'w-8 bg-emerald-500'
                          : `w-5 ${theme.bar} opacity-70`
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground">
        Define the north stars in front of the team — what you're collectively driving toward.
      </p>

      {canManage && (
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) addGoal(); }}
            placeholder="Strategic goal title (e.g. Reach 100 paying customers by Q3)"
            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Why this matters & how we'll know we've achieved it (optional)"
              rows={2}
              className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addGoal}
              disabled={adding || !newTitle.trim()}
              className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 self-start"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Goal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/40 p-10 text-center bg-gradient-to-b from-secondary/20 to-transparent">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="w-7 h-7 text-primary/50" />
          </div>
          <p className="text-sm font-medium">No strategic goals yet</p>
          <p className="text-xs text-muted-foreground mt-1">Set the north stars your team is driving toward.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
          {goals.map((g, idx) => {
            const isAchieved = g.status === 'achieved';
            const isEditing = editingId === g.id;
            const theme = THEMES[idx % THEMES.length];
            const Icon = theme.icon;
            return (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                  isAchieved
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-md shadow-emerald-500/10'
                    : `border-border/50 bg-card hover:shadow-xl ${theme.glow} hover:-translate-y-1 hover:border-transparent`
                }`}
              >
                {/* Top accent stripe */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                  isAchieved ? 'from-emerald-400 to-emerald-600' : `${theme.from} ${theme.to}`
                }`} />

                {/* Decorative corner glow */}
                {!isAchieved && (
                  <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} blur-3xl opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity`} />
                )}

                {/* Big number watermark */}
                <span className={`absolute -bottom-4 -right-2 text-[120px] font-black leading-none pointer-events-none select-none ${
                  isAchieved ? 'text-emerald-500/5' : `${theme.text} opacity-[0.04]`
                }`}>
                  {idx + 1}
                </span>

                {isEditing ? (
                  <div className="space-y-2 relative">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" autoFocus />
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg resize-none" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                      <button onClick={saveEdit} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-start gap-4">
                    {/* Icon medallion */}
                    <div className="shrink-0">
                      {canManage ? (
                        <button
                          onClick={() => toggleStatus(g)}
                          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 ${
                            isAchieved
                              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                              : `bg-gradient-to-br ${theme.from} ${theme.to} text-white shadow-md ${theme.glow}`
                          }`}
                          title={isAchieved ? 'Mark as in flight' : 'Mark as achieved'}
                        >
                          {isAchieved ? <CheckCircle2 className="w-7 h-7" /> : <Icon className="w-6 h-6" />}
                          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 ${isAchieved ? 'border-emerald-500' : 'border-border'} flex items-center justify-center text-[10px] font-bold ${isAchieved ? 'text-emerald-600' : theme.text}`}>
                            {idx + 1}
                          </span>
                        </button>
                      ) : (
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${
                          isAchieved
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                            : `bg-gradient-to-br ${theme.from} ${theme.to} text-white`
                        }`}>
                          {isAchieved ? <CheckCircle2 className="w-7 h-7" /> : <Icon className="w-6 h-6" />}
                          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 ${isAchieved ? 'border-emerald-500' : 'border-border'} flex items-center justify-center text-[10px] font-bold ${isAchieved ? 'text-emerald-600' : theme.text}`}>
                            {idx + 1}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 relative">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className={`text-base font-bold leading-snug ${isAchieved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {g.title}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        isAchieved
                          ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30'
                          : `${theme.soft} ${theme.text} ring-1 ${theme.ring}`
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isAchieved ? 'bg-emerald-500 animate-pulse' : theme.bar}`} />
                        {isAchieved ? 'Achieved' : 'In Flight'}
                      </span>

                      {g.description && (
                        <p className="text-xs text-muted-foreground mt-2.5 whitespace-pre-wrap leading-relaxed">{g.description}</p>
                      )}

                      {/* Adjustable progress */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-medium">
                          <span className="text-muted-foreground uppercase tracking-wider">Progress</span>
                          <span className={`tabular-nums font-bold ${isAchieved ? 'text-emerald-600' : theme.text}`}>{g.progress ?? 0}%</span>
                        </div>
                        {canManage ? (
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={g.progress ?? 0}
                            onChange={e => {
                              const v = Number(e.target.value);
                              setGoals(prev => prev.map(x => x.id === g.id ? { ...x, progress: v } : x));
                            }}
                            onMouseUp={e => updateProgress(g, Number((e.target as HTMLInputElement).value))}
                            onTouchEnd={e => updateProgress(g, Number((e.target as HTMLInputElement).value))}
                            onKeyUp={e => updateProgress(g, Number((e.target as HTMLInputElement).value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-primary"
                            style={{
                              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${g.progress ?? 0}%, hsl(var(--secondary)) ${g.progress ?? 0}%, hsl(var(--secondary)) 100%)`,
                            }}
                          />
                        ) : (
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full ${isAchieved ? 'bg-emerald-500' : theme.bar}`} style={{ width: `${g.progress ?? 0}%` }} />
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => startEdit(g)} className="px-2 py-1 text-[10px] rounded-md border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                          <button onClick={() => deleteGoal(g.id)} className="px-2 py-1 text-[10px] rounded-md border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
