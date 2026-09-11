import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyEntry {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_monthly: number;
  deal_count: number;
  deals: { title: string; monthly: number }[];
}

interface MonthlyCompensationDashboardProps {
  clusterId: string;
}

export function MonthlyCompensationDashboard({ clusterId }: MonthlyCompensationDashboardProps) {
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();

    const membersChannel = supabase
      .channel(`monthly-comp-members-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_members' }, () => loadData())
      .subscribe();

    const dealsChannel = supabase
      .channel(`monthly-comp-deals-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(dealsChannel);
    };
  }, [clusterId]);

  const loadData = async () => {
    setIsLoading(true);

    const { data: deals } = await supabase
      .from('crm_deals')
      .select('id, title')
      .eq('cluster_id', clusterId);

    if (!deals || deals.length === 0) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const { data: members } = await supabase
      .from('deal_members')
      .select('deal_id, profile_id, monthly_amount, profiles:profile_id(id, full_name, avatar_url)')
      .in('deal_id', deals.map(d => d.id));

    if (!members) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const memberTotals: Record<string, MonthlyEntry> = {};

    members.forEach(m => {
      const monthly = (m as any).monthly_amount || 0;
      if (monthly <= 0) return;

      const deal = deals.find(d => d.id === m.deal_id);
      if (!deal) return;

      if (!memberTotals[m.profile_id]) {
        const profiles = m.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
        memberTotals[m.profile_id] = {
          profile_id: m.profile_id,
          full_name: profiles?.full_name || null,
          avatar_url: profiles?.avatar_url || null,
          total_monthly: 0,
          deal_count: 0,
          deals: [],
        };
      }

      memberTotals[m.profile_id].total_monthly += monthly;
      memberTotals[m.profile_id].deal_count += 1;
      memberTotals[m.profile_id].deals.push({ title: deal.title, monthly });
    });

    setEntries(
      Object.values(memberTotals).sort((a, b) => b.total_monthly - a.total_monthly)
    );
    setIsLoading(false);
  };

  const totalMonthly = entries.reduce((sum, e) => sum + e.total_monthly, 0);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Monthly Recurring Compensation</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No monthly compensation data yet. Add monthly amounts to deal members.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Monthly Recurring Compensation</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-bold text-primary">€{totalMonthly.toLocaleString()}/mo</span>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.profile_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-4 p-3 rounded-xl bg-secondary/20"
          >
            {entry.avatar_url ? (
              <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {entry.full_name?.[0] || '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">{entry.full_name || 'Unknown'}</p>
                <span className="text-sm font-bold text-primary flex-shrink-0">
                  €{entry.total_monthly.toLocaleString()}/mo
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{entry.deal_count} deal{entry.deal_count !== 1 ? 's' : ''}</p>
              <div className="flex flex-wrap gap-1">
                {entry.deals.map((deal, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary">
                    {deal.title} <span className="ml-1 text-muted-foreground">€{deal.monthly}/mo</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
