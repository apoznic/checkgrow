import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Minus, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { hr } from 'date-fns/locale';

interface MonthlyLeadTrackerProps {
  clusterId: string;
}

interface DealEntry {
  profile_id: string;
  deals: string[];
}

interface MonthData {
  month: string; // YYYY-MM
  label: string;
  members: {
    profile_id: string;
    full_name: string | null;
    avatar_url: string | null;
    deal_count: number;
    deals: string[];
  }[];
}

export function MonthlyLeadTracker({ clusterId }: MonthlyLeadTrackerProps) {
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // YYYY-MM or null for all

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`lead-tracker-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  const loadData = async () => {
    setIsLoading(true);

    const [{ data: deals }, { data: members }] = await Promise.all([
      supabase
        .from('crm_deals')
        .select('id, title, assigned_to, created_at, stage, profiles:assigned_to(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId)
        .in('stage', ['lead', 'negotiation', 'won'])
        .not('assigned_to', 'is', null),
      supabase
        .from('cluster_enrollments')
        .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId)
        .eq('status', 'approved'),
    ]);

    if (deals) setAllDeals(deals);
    if (members) {
      setAllMembers(members.map(m => {
        const p = m.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
        return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
      }));
    }
    setIsLoading(false);
  };

  // Available months from deals (sorted newest first)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allDeals.forEach(d => set.add(format(parseISO(d.created_at), 'yyyy-MM')));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allDeals]);

  // Set initial selected month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // Navigate months
  const currentMonthIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const canGoPrev = currentMonthIdx < availableMonths.length - 1; // older
  const canGoNext = currentMonthIdx > 0; // newer

  // Build month data filtered by search and selected month
  const months = useMemo(() => {
    const filtered = allDeals.filter(deal => {
      const monthKey = format(parseISO(deal.created_at), 'yyyy-MM');
      if (selectedMonth && monthKey !== selectedMonth) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const owner = allMembers.find(m => m.id === deal.assigned_to);
        const matchesName = owner?.full_name?.toLowerCase().includes(q);
        const matchesTitle = deal.title.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle) return false;
      }
      return true;
    });

    const monthMap: Record<string, DealEntry[]> = {};
    filtered.forEach(deal => {
      const monthKey = format(parseISO(deal.created_at), 'yyyy-MM');
      if (!monthMap[monthKey]) monthMap[monthKey] = [];
      const existing = monthMap[monthKey].find(e => e.profile_id === deal.assigned_to);
      if (existing) {
        existing.deals.push(deal.title);
      } else {
        monthMap[monthKey].push({ profile_id: deal.assigned_to, deals: [deal.title] });
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, entries]): MonthData => ({
        month: monthKey,
        label: format(parseISO(`${monthKey}-01`), 'LLLL yyyy', { locale: hr }),
        members: entries.map(e => {
          const member = allMembers.find(m => m.id === e.profile_id);
          return {
            profile_id: e.profile_id,
            full_name: member?.full_name || null,
            avatar_url: member?.avatar_url || null,
            deal_count: e.deals.length,
            deals: e.deals,
          };
        }).sort((a, b) => b.deal_count - a.deal_count),
      }));
  }, [allDeals, allMembers, searchQuery, selectedMonth]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (allDeals.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Mjesečni pregled leadova</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nema unesenih leadova. Kreirajte dealove da biste vidjeli mjesečni pregled.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Mjesečni pregled leadova</h3>
      </div>

      {/* Controls: month nav + search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        {/* Month navigator */}
        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => canGoPrev && setSelectedMonth(availableMonths[currentMonthIdx + 1])}
            disabled={!canGoPrev}
            className="p-1.5 rounded-md hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 min-w-[140px] text-center capitalize">
            {selectedMonth
              ? format(parseISO(`${selectedMonth}-01`), 'LLLL yyyy', { locale: hr })
              : 'Svi mjeseci'}
          </span>
          <button
            onClick={() => canGoNext && setSelectedMonth(availableMonths[currentMonthIdx - 1])}
            disabled={!canGoNext}
            className="p-1.5 rounded-md hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pretraži po imenu ili nazivu leada..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-secondary/30 border border-border/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Content */}
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nema rezultata za odabrani filter.
        </p>
      ) : (
        <div className="space-y-5">
          {months.map((month, mi) => {
            const contributorIds = new Set(month.members.map(m => m.profile_id));

            return (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mi * 0.05 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold capitalize">{month.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({month.members.reduce((s, m) => s + m.deal_count, 0)} leadova)
                  </span>
                </div>

                <div className="space-y-1.5">
                  {month.members.map(member => (
                    <div key={member.profile_id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {member.full_name?.[0] || '?'}
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">{member.full_name || 'Nepoznato'}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {member.deal_count} {member.deal_count === 1 ? 'lead' : 'leadova'}
                      </span>
                    </div>
                  ))}

                  {!searchQuery && allMembers
                    .filter(m => !contributorIds.has(m.id))
                    .map(member => (
                      <div key={member.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-secondary/20 opacity-60">
                        <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {member.full_name?.[0] || '?'}
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground truncate">{member.full_name || 'Nepoznato'}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
