import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, TrendingUp, Plus, Loader2, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  profile_id: string;
  hours: number;
  description: string | null;
  entry_date: string;
  billable: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ProfitabilityMonitorProps {
  projectId: string;
  isOwner: boolean;
  profileId: string;
  teamMembers: {
    profile_id: string;
    profiles: { id: string; full_name: string | null; avatar_url: string | null };
  }[];
}

export function ProfitabilityMonitor({ projectId, isOwner, profileId, teamMembers }: ProfitabilityMonitorProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ hours: '', description: '', entry_date: format(new Date(), 'yyyy-MM-dd'), billable: true });

  useEffect(() => {
    loadEntries();
    loadRate();
  }, [projectId]);

  const loadEntries = async () => {
    const { data } = await (supabase as any)
      .from('project_time_entries')
      .select('*, profiles:profile_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false });

    if (data) setEntries(data as TimeEntry[]);
    setIsLoading(false);
  };

  const loadRate = async () => {
    const { data } = await (supabase as any)
      .from('project_settings')
      .select('hourly_rate')
      .eq('project_id', projectId)
      .single();

    if (data?.hourly_rate) setHourlyRate(data.hourly_rate);
  };

  const handleSaveRate = async (rate: number) => {
    setHourlyRate(rate);
    await (supabase as any)
      .from('project_settings')
      .upsert({ project_id: projectId, hourly_rate: rate }, { onConflict: 'project_id' });
  };

  const handleAdd = async () => {
    if (!form.hours || parseFloat(form.hours) <= 0) return;
    setIsAdding(true);

    const { error } = await (supabase as any)
      .from('project_time_entries')
      .insert({
        project_id: projectId,
        profile_id: profileId,
        hours: parseFloat(form.hours),
        description: form.description.trim() || null,
        entry_date: form.entry_date,
        billable: form.billable,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setForm({ hours: '', description: '', entry_date: format(new Date(), 'yyyy-MM-dd'), billable: true });
      setShowAdd(false);
      loadEntries();
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('project_time_entries').delete().eq('id', id);
    loadEntries();
  };

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
  const nonBillableHours = totalHours - billableHours;
  const revenue = billableHours * hourlyRate;
  const utilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const memberStats = teamMembers.map(m => {
    const memberEntries = entries.filter(e => e.profile_id === m.profile_id);
    const memberHours = memberEntries.reduce((s, e) => s + e.hours, 0);
    const memberBillable = memberEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    return { ...m, totalHours: memberHours, billableHours: memberBillable, revenue: memberBillable * hourlyRate };
  }).filter(m => m.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Hours', value: totalHours.toFixed(1), icon: Clock, sub: `${billableHours.toFixed(1)} billable` },
          { label: 'Revenue', value: `€${revenue.toLocaleString()}`, icon: DollarSign, sub: `@ €${hourlyRate}/hr` },
          { label: 'Utilization', value: `${utilization}%`, icon: TrendingUp, sub: `${nonBillableHours.toFixed(1)}h non-bill.` },
          { label: 'Entries', value: entries.length.toString(), icon: Clock, sub: `${memberStats.length} contributors` },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel p-3">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Hourly Rate (owner only) */}
      {isOwner && (
        <div className="glass-panel p-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Hourly Rate (€):</span>
          <input
            type="number"
            value={hourlyRate}
            onChange={e => handleSaveRate(parseFloat(e.target.value) || 0)}
            className="w-24 bg-secondary/30 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {/* Log Time */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Time Entries</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-panel p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
              <input type="number" step="0.25" min="0" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. 2.5" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What did you work on?"
            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.billable} onChange={e => setForm(p => ({ ...p, billable: e.target.checked }))} className="rounded" />
            Billable
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm rounded-lg bg-secondary/50 hover:bg-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={isAdding || !form.hours} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Member Breakdown */}
      {memberStats.length > 0 && (
        <div className="glass-panel p-4">
          <h4 className="font-medium text-sm mb-3">Team Breakdown</h4>
          <div className="space-y-2">
            {memberStats.map(m => (
              <div key={m.profile_id} className="flex items-center gap-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {m.profiles.avatar_url ? (
                    <img src={m.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 text-primary" />
                  )}
                </div>
                <span className="text-sm flex-1 truncate">{m.profiles.full_name || 'Member'}</span>
                <span className="text-xs text-muted-foreground">{m.totalHours.toFixed(1)}h</span>
                <span className="text-xs font-medium">€{m.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {entries.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No time entries yet
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 20).map((e) => (
            <div key={e.id} className="glass-panel p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{e.hours}h</span>
                  {e.billable ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">Billable</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Non-billable</span>
                  )}
                </div>
                {e.description && <p className="text-xs text-muted-foreground truncate">{e.description}</p>}
                <p className="text-[10px] text-muted-foreground">{e.profiles?.full_name} · {format(new Date(e.entry_date), 'MMM d')}</p>
              </div>
              {(isOwner || e.profile_id === profileId) && (
                <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
