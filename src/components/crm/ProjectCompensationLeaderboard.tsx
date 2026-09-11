import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Loader2, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_compensation: number;
  deal_count: number;
}

interface ProjectCompensationLeaderboardProps {
  clusterId: string;
}

export function ProjectCompensationLeaderboard({ clusterId }: ProjectCompensationLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();

    const membersChannel = supabase
      .channel(`project-comp-members-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_members' }, () => loadLeaderboard())
      .subscribe();

    const dealsChannel = supabase
      .channel(`project-comp-deals-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => loadLeaderboard())
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(dealsChannel);
    };
  }, [clusterId]);

  const loadLeaderboard = async () => {
    setIsLoading(true);

    const { data: deals } = await supabase
      .from('crm_deals')
      .select('id, value')
      .eq('cluster_id', clusterId);

    if (!deals || deals.length === 0) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    // Get only non-finder members (regular project compensation)
    const { data: members } = await supabase
      .from('deal_members')
      .select('deal_id, profile_id, compensation_type, compensation_value, monthly_amount, equity_percentage, one_time_commission, is_finder_bonus, profiles:profile_id(id, full_name, avatar_url)')
      .in('deal_id', deals.map(d => d.id));

    if (!members) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    // Filter out finders - only regular project members
    const projectMembers = members.filter(m => !m.is_finder_bonus);

    const memberTotals: Record<string, {
      profile_id: string;
      full_name: string | null;
      avatar_url: string | null;
      total: number;
      deals: Set<string>;
    }> = {};

    projectMembers.forEach(m => {
      const deal = deals.find(d => d.id === m.deal_id);
      if (!deal) return;

      const dealValue = deal.value || 0;
      const baseComp = m.compensation_type === 'fixed'
        ? m.compensation_value
        : (dealValue * m.compensation_value / 100);
      const monthly = m.monthly_amount || 0;
      const oneTime = m.one_time_commission || 0;
      const compensation = baseComp + monthly + oneTime;

      if (compensation <= 0) return;

      if (!memberTotals[m.profile_id]) {
        const profiles = m.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
        memberTotals[m.profile_id] = {
          profile_id: m.profile_id,
          full_name: profiles?.full_name || null,
          avatar_url: profiles?.avatar_url || null,
          total: 0,
          deals: new Set(),
        };
      }

      memberTotals[m.profile_id].total += compensation;
      memberTotals[m.profile_id].deals.add(m.deal_id);
    });

    setEntries(
      Object.values(memberTotals)
        .map(m => ({
          profile_id: m.profile_id,
          full_name: m.full_name,
          avatar_url: m.avatar_url,
          total_compensation: m.total,
          deal_count: m.deals.size,
        }))
        .sort((a, b) => b.total_compensation - a.total_compensation)
    );
    setIsLoading(false);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-slate-300';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

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
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Project Compensation Leaderboard</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No project compensation data yet. Add members to deals to see the leaderboard.
        </p>
      </div>
    );
  }

  const maxCompensation = entries[0]?.total_compensation || 1;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Project Compensation Leaderboard</h3>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.profile_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4"
          >
            <div className="w-8 flex items-center justify-center">
              {index < 3 ? (
                <Medal className={`w-5 h-5 ${getMedalColor(index)}`} />
              ) : (
                <span className="text-sm text-muted-foreground">{index + 1}</span>
              )}
            </div>

            {entry.avatar_url ? (
              <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                {entry.full_name?.[0] || '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{entry.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{entry.deal_count} deals</p>
            </div>

            <div className="w-32">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-primary">
                  €{entry.total_compensation.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(entry.total_compensation / maxCompensation) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
