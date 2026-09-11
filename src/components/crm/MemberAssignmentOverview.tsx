import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as PieChartIcon, Loader2, Briefcase, ChevronDown, Plus, Trash2, Building2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DealEntry {
  id: string;
  title: string;
  value: number;
  stage: string;
  project_id: string | null;
  source: 'responsible' | 'created' | 'member';
  equity: number;
  monthly: number;
  one_time: number;
  compensation_type: string;
  compensation_value: number;
  compensation_label: string | null;
  is_finder: boolean;
  created_at: string;
}

interface MemberAssignment {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  deals: DealEntry[];
}

interface LeadEntry {
  id: string;
  name: string;
  company: string | null;
  created_at: string;
}

interface EquityEntry {
  name: string;
  value: number;
  fill: string;
  dealBreakdown: { title: string; equity: number }[];
}

interface MemberAssignmentOverviewProps {
  clusterId: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(40, 80%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(350, 65%, 55%)',
  'hsl(190, 70%, 45%)',
  'hsl(20, 75%, 55%)',
];

const KUT_ID = '__kut__';

export function MemberAssignmentOverview({ clusterId }: MemberAssignmentOverviewProps) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [leadsByPerson, setLeadsByPerson] = useState<Record<string, LeadEntry[]>>({});
  const [orgMembers, setOrgMembers] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'leads_in' | 'won'>('won');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [equityView, setEquityView] = useState<'portfolio' | 'per-deal'>('portfolio');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [deals, setDeals] = useState<{ id: string; title: string; value: number; org_equity: number; org_percentage: number }[]>([]);
  const [allDealMembers, setAllDealMembers] = useState<{ id: string; deal_id: string; profile_id: string; equity_percentage: number; full_name: string | null }[]>([]);

  // Add equity form
  const [showAddEquity, setShowAddEquity] = useState(false);
  const [newEqHolder, setNewEqHolder] = useState<string>('');
  const [newEqDeal, setNewEqDeal] = useState<string>('');
  const [newEqPct, setNewEqPct] = useState<string>('');
  const [savingEq, setSavingEq] = useState(false);

  useEffect(() => {
    loadData();
    const ch1 = supabase
      .channel(`assignments-members-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_members' }, () => loadData())
      .subscribe();
    const ch2 = supabase
      .channel(`assignments-deals-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [clusterId]);

  const loadData = async () => {
    setIsLoading(true);
    const dealIdsRes = await supabase.from('crm_deals').select('id').eq('cluster_id', clusterId);
    const dealIds = dealIdsRes.data?.map(d => d.id) || [];

    const [dealsRes, membersRes, contactsRes, enrollRes] = await Promise.all([
      supabase
        .from('crm_deals')
        .select('id, title, value, stage, archived_from, project_id, created_at, created_by, assigned_to, org_equity, org_percentage, finder_bonus_percent, profiles:assigned_to(id, full_name, avatar_url), creator:created_by(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId),
      dealIds.length
        ? supabase
            .from('deal_members')
            .select('id, deal_id, profile_id, compensation_type, compensation_value, monthly_amount, equity_percentage, one_time_commission, is_finder_bonus, compensation_label, profiles:profile_id(id, full_name, avatar_url)')
            .in('deal_id', dealIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('crm_contacts')
        .select('id, name, company, created_at, created_by')
        .eq('cluster_id', clusterId),
      supabase
        .from('cluster_enrollments')
        .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId)
        .eq('status', 'approved'),
    ]);

    const allDeals = (dealsRes.data || []) as any[];
    const allMembers = (membersRes.data || []) as any[];
    const allContacts = (contactsRes.data || []) as any[];
    const enrollments = (enrollRes.data || []) as any[];

    setDeals(allDeals.map(d => ({ id: d.id, title: d.title, value: d.value || 0, org_equity: d.org_equity || 0, org_percentage: d.org_percentage || 0 })));
    setOrgMembers(enrollments.map(e => e.profiles).filter(Boolean));

    // Build per-person aggregation
    const map: Record<string, MemberAssignment> = {};
    const ensure = (p: { id: string; full_name: string | null; avatar_url: string | null }) => {
      if (!map[p.id]) map[p.id] = { profile_id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, deals: [] };
      return map[p.id];
    };

    allDeals.forEach(deal => {
      const responsible = deal.profiles as any;
      const memberInDeal = allMembers.filter(m => m.deal_id === deal.id);

      const baseEntry = (source: DealEntry['source'], pid: string): DealEntry => {
        const m = memberInDeal.find(mm => mm.profile_id === pid);
        return {
          id: deal.id,
          title: deal.title,
          value: deal.value || 0,
          stage: deal.stage === 'archived' && deal.archived_from === 'won' ? 'won' : deal.stage,
          project_id: deal.project_id,
          source,
          equity: m?.equity_percentage || 0,
          monthly: m?.monthly_amount || 0,
          one_time: m?.one_time_commission || 0,
          compensation_type: m?.compensation_type || 'percentage',
          compensation_value: m?.compensation_value || 0,
          compensation_label: m?.compensation_label || null,
          is_finder: m?.is_finder_bonus || false,
          created_at: deal.created_at,
        };
      };

      // Responsible person
      if (responsible && deal.assigned_to) {
        ensure(responsible).deals.push(baseEntry('responsible', deal.assigned_to));
      }
      // Other members on deal (excluding responsible to avoid dup)
      memberInDeal.forEach(m => {
        if (m.profile_id === deal.assigned_to) return;
        const prof = m.profiles as any;
        if (!prof) return;
        ensure(prof).deals.push(baseEntry('member', m.profile_id));
      });
    });

    // Leads brought by each person (contacts they created)
    const leadMap: Record<string, LeadEntry[]> = {};
    allContacts.forEach(c => {
      if (!c.created_by) return;
      if (!leadMap[c.created_by]) leadMap[c.created_by] = [];
      leadMap[c.created_by].push({ id: c.id, name: c.name, company: c.company, created_at: c.created_at });
    });
    setLeadsByPerson(leadMap);

    setAssignments(Object.values(map).sort((a, b) => b.deals.length - a.deals.length));
    setAllDealMembers(allMembers.map(m => ({
      id: m.id,
      deal_id: m.deal_id,
      profile_id: m.profile_id,
      equity_percentage: m.equity_percentage || 0,
      full_name: (m.profiles as any)?.full_name || null,
    })));

    setIsLoading(false);
  };

  const equityData = useMemo((): EquityEntry[] => {
    if (equityView === 'per-deal' && selectedDealId) {
      const entries: EquityEntry[] = [];
      let totalMember = 0;
      const deal = deals.find(d => d.id === selectedDealId);
      const dealTitle = deal?.title || 'Deal';
      const inDeal = allDealMembers.filter(m => m.deal_id === selectedDealId && m.equity_percentage > 0);
      inDeal.forEach((member, i) => {
        entries.push({
          name: member.full_name || 'Unknown',
          value: member.equity_percentage,
          fill: COLORS[i % COLORS.length],
          dealBreakdown: [{ title: dealTitle, equity: member.equity_percentage }],
        });
        totalMember += member.equity_percentage;
      });
      const orgEq = deal?.org_equity || 0;
      const orgPct = orgEq > 0 ? orgEq : Math.max(0, 100 - totalMember);
      entries.push({
        name: 'Kolektiv KUT',
        value: Math.round(orgPct * 100) / 100,
        fill: 'hsl(var(--muted-foreground))',
        dealBreakdown: [{ title: dealTitle, equity: Math.round(orgPct * 100) / 100 }],
      });
      return entries;
    }

    const memberEquity: Record<string, { name: string; totalEquity: number; dealBreakdown: { title: string; equity: number }[] }> = {};
    let totalMember = 0;
    allDealMembers.forEach(m => {
      if (m.equity_percentage > 0) {
        if (!memberEquity[m.profile_id]) memberEquity[m.profile_id] = { name: m.full_name || 'Unknown', totalEquity: 0, dealBreakdown: [] };
        const dealInfo = deals.find(dl => dl.id === m.deal_id);
        memberEquity[m.profile_id].totalEquity += m.equity_percentage;
        memberEquity[m.profile_id].dealBreakdown.push({ title: dealInfo?.title || m.deal_id, equity: m.equity_percentage });
        totalMember += m.equity_percentage;
      }
    });
    const entries: EquityEntry[] = Object.values(memberEquity).map((e, i) => ({
      name: e.name, value: Math.round(e.totalEquity * 100) / 100, fill: COLORS[i % COLORS.length], dealBreakdown: e.dealBreakdown,
    }));

    const orgBreakdown: { title: string; equity: number }[] = [];
    let totalOrg = 0;
    deals.forEach(d => {
      const eq = d.org_equity || 0;
      if (eq > 0) { orgBreakdown.push({ title: d.title, equity: eq }); totalOrg += eq; }
    });
    const orgValue = totalOrg > 0 ? Math.round(totalOrg * 100) / 100 : Math.max(0, Math.round((100 - totalMember) * 100) / 100);
    entries.push({
      name: 'Kolektiv KUT',
      value: orgValue,
      fill: 'hsl(var(--muted-foreground))',
      dealBreakdown: orgBreakdown.length > 0 ? orgBreakdown : [{ title: 'Remaining', equity: orgValue }],
    });
    return entries;
  }, [allDealMembers, equityView, selectedDealId, deals]);

  const handleAddEquity = async () => {
    if (!newEqHolder || !newEqDeal || !newEqPct) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    const pct = parseFloat(newEqPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast({ title: 'Enter valid % (0–100)', variant: 'destructive' });
      return;
    }
    setSavingEq(true);

    if (newEqHolder === KUT_ID) {
      const { error } = await supabase.from('crm_deals').update({ org_equity: pct }).eq('id', newEqDeal);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Kolektiv KUT equity updated' });
    } else {
      const existing = allDealMembers.find(m => m.deal_id === newEqDeal && m.profile_id === newEqHolder);
      if (existing) {
        const { error } = await supabase.from('deal_members').update({ equity_percentage: pct }).eq('id', existing.id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else toast({ title: 'Equity updated' });
      } else {
        const { error } = await supabase.from('deal_members').insert({
          deal_id: newEqDeal,
          profile_id: newEqHolder,
          compensation_type: 'percentage',
          compensation_value: 0,
          monthly_amount: 0,
          equity_percentage: pct,
          one_time_commission: 0,
          is_finder_bonus: false,
        });
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else toast({ title: 'Equity assigned' });
      }
    }
    setSavingEq(false);
    setShowAddEquity(false);
    setNewEqHolder(''); setNewEqDeal(''); setNewEqPct('');
    loadData();
  };

  const handleRemoveEquity = async (memberRowId: string) => {
    const { error } = await supabase.from('deal_members').update({ equity_percentage: 0 }).eq('id', memberRowId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Equity removed' }); loadData(); }
  };

  const handleRemoveOrgEquity = async (dealId: string) => {
    const { error } = await supabase.from('crm_deals').update({ org_equity: 0 }).eq('id', dealId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'KUT equity cleared' }); loadData(); }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  const stageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-500/15 text-blue-600',
      negotiation: 'bg-amber-500/15 text-amber-600',
      won: 'bg-emerald-500/15 text-emerald-600',
      lost: 'bg-red-500/15 text-red-600',
      archived: 'bg-muted text-muted-foreground',
    };
    return colors[stage] || 'bg-muted text-muted-foreground';
  };

  const renderMember = (member: MemberAssignment) => {
    const isOpen = expanded === member.profile_id;
    const totalValue = member.deals.reduce((s, d) => s + d.value, 0);
    const totalEquity = member.deals.reduce((s, d) => s + d.equity, 0);
    const totalMonthly = member.deals.reduce((s, d) => s + d.monthly, 0);
    const personLeads = leadsByPerson[member.profile_id] || [];
    const responsibleDeals = member.deals.filter(d => d.source === 'responsible');
    const totalResponsible = responsibleDeals.length;
    const wonDeals = responsibleDeals.filter(d => d.stage === 'won');
    const inProgressDeals = responsibleDeals.filter(d => d.stage !== 'won');
    const wonResponsible = wonDeals.length;

    return (
      <motion.div key={member.profile_id} layout className="rounded-xl bg-secondary/20 overflow-hidden">
        <button
          onClick={() => setExpanded(isOpen ? null : member.profile_id)}
          className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors text-left"
        >
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {member.full_name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{member.full_name || 'Unknown'}</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <span>{totalResponsible} lead{totalResponsible !== 1 ? 's' : ''} in</span>
              <span>·</span>
              <span>{wonResponsible} won</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 min-w-[64px]">
              <span className="text-base font-bold text-primary leading-none">{totalResponsible}</span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Leads in</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-w-[64px]">
              <span className="text-base font-bold text-emerald-600 leading-none">{wonResponsible}</span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Won</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="p-4 space-y-4">
                {/* Won leads (priority — shown first, no double counting) */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Won ({wonResponsible})
                  </p>
                  {wonDeals.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No won leads yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {wonDeals
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((d, i) => (
                          <div key={`won-${d.id}-${i}`} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-sm font-medium truncate">{d.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-600 flex-shrink-0">
                              won
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* In-progress leads brought in (excludes won to avoid duplication) */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    In progress ({inProgressDeals.length})
                  </p>
                  {inProgressDeals.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No active leads.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {inProgressDeals
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((d, i) => (
                          <div key={`${d.id}-${i}`} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background/50">
                            <span className="text-sm font-medium truncate">{d.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${stageBadge(d.stage)}`}>
                              {d.stage}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* People */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">People</h3>
            <span className="text-xs text-muted-foreground ml-1">({assignments.length})</span>
          </div>
          <div className="flex items-center bg-secondary/60 rounded-full p-0.5">
            <button
              onClick={() => setSortBy('leads_in')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${sortBy === 'leads_in' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sort by Leads in
            </button>
            <button
              onClick={() => setSortBy('won')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${sortBy === 'won' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sort by Won
            </button>
          </div>
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No member assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const sorted = [...assignments]
                .sort((a, b) => {
                  const aResp = a.deals.filter(d => d.source === 'responsible');
                  const bResp = b.deals.filter(d => d.source === 'responsible');
                  if (sortBy === 'won') {
                    return bResp.filter(d => d.stage === 'won').length - aResp.filter(d => d.stage === 'won').length;
                  }
                  return bResp.length - aResp.length;
                });
              const visible = sorted.slice(0, 5);
              const hidden = sorted.slice(5);
              return (
                <>
                  {visible.map((member) => renderMember(member))}
                  <AnimatePresence>
                    {showAllMembers && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {hidden.map((member) => renderMember(member))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {hidden.length > 0 && (
                    <button
                      onClick={() => setShowAllMembers(v => !v)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-secondary/30"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAllMembers ? 'rotate-180' : ''}`} />
                      {showAllMembers ? 'Show less' : `Show ${hidden.length} more`}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Equity Structure */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Equity Structure</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary/60 rounded-full p-0.5">
              <button
                onClick={() => setEquityView('portfolio')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${equityView === 'portfolio' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >Portfolio</button>
              <button
                onClick={() => setEquityView('per-deal')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${equityView === 'per-deal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >Per Deal</button>
            </div>
            <button
              onClick={() => setShowAddEquity(s => !s)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        {/* Add equity inline form */}
        <AnimatePresence>
          {showAddEquity && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Holder</label>
                    <select
                      value={newEqHolder}
                      onChange={e => setNewEqHolder(e.target.value)}
                      className="w-full mt-1 bg-background border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select holder…</option>
                      <option value={KUT_ID}>🏛️ Kolektiv KUT (Organization)</option>
                      {orgMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name || 'Unknown'}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Deal</label>
                    <select
                      value={newEqDeal}
                      onChange={e => setNewEqDeal(e.target.value)}
                      className="w-full mt-1 bg-background border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select deal…</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Equity %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newEqPct}
                      onChange={e => setNewEqPct(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full mt-1 bg-background border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddEquity(false); setNewEqHolder(''); setNewEqDeal(''); setNewEqPct(''); }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
                  >Cancel</button>
                  <button
                    onClick={handleAddEquity}
                    disabled={savingEq}
                    className="px-4 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >{savingEq ? 'Saving…' : 'Save equity'}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {equityView === 'per-deal' && (
          <div className="mb-5">
            <select
              value={selectedDealId || ''}
              onChange={e => setSelectedDealId(e.target.value || null)}
              className="w-full bg-secondary/50 border border-border/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a deal...</option>
              {deals.map(d => (<option key={d.id} value={d.id}>{d.title}</option>))}
            </select>
          </div>
        )}

        {equityData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {equityView === 'per-deal' && !selectedDealId ? 'Select a deal to view equity breakdown.' : 'No equity data available.'}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="h-6 rounded-full overflow-hidden flex bg-secondary/40">
              {equityData.map((entry, i) => (
                <motion.div
                  key={entry.name}
                  initial={{ width: 0 }}
                  animate={{ width: `${(entry.value / equityData.reduce((s, e) => s + e.value, 0)) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="h-full"
                  style={{ backgroundColor: entry.fill }}
                  title={`${entry.name}: ${entry.value}%`}
                />
              ))}
            </div>

            <div className="space-y-1">
              {equityData.map((entry) => {
                const isKut = entry.name === 'Kolektiv KUT';
                return (
                  <div key={entry.name} className="py-2 border-b border-border/20 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          {isKut && <Building2 className="w-3.5 h-3.5 text-muted-foreground" />}
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{entry.value}%</span>
                    </div>
                    {entry.dealBreakdown.length > 0 && (
                      <div className="ml-[1.625rem] mt-1 space-y-0.5">
                        {entry.dealBreakdown.map((db, j) => {
                          // Find matching deal_member row for delete (only for non-KUT)
                          const dealRow = deals.find(d => d.title === db.title);
                          const memberRow = !isKut && dealRow
                            ? allDealMembers.find(m => m.deal_id === dealRow.id && (m.full_name || 'Unknown') === entry.name && m.equity_percentage === db.equity)
                            : null;
                          return (
                            <div key={j} className="group flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <span className="truncate max-w-[60%]">{db.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums">{db.equity}%</span>
                                {isKut && dealRow && db.equity > 0 ? (
                                  <button
                                    onClick={() => handleRemoveOrgEquity(dealRow.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    title="Remove KUT equity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                ) : memberRow ? (
                                  <button
                                    onClick={() => handleRemoveEquity(memberRow.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    title="Remove equity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
