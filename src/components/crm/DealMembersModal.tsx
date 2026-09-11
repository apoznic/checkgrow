import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Users, Plus, Trash2, Loader2, Search, DollarSign, Percent, UserPlus,
  Mail, Phone, Calendar, FileText, MessageSquare, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/GlassCard';
import { CRMDeal } from './types';
import { Slider } from '@/components/ui/slider';
import { format, formatDistanceToNow } from 'date-fns';

interface DealMember {
  id: string;
  deal_id: string;
  profile_id: string;
  compensation_type: 'percentage' | 'fixed';
  compensation_value: number;
  monthly_amount: number;
  equity_percentage: number;
  one_time_commission: number;
  is_finder_bonus: boolean;
  compensation_label: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface OrgMember {
  profile_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface DealActivity {
  id: string;
  activity_type: string;
  subject: string;
  content: string | null;
  activity_date: string;
  profiles?: { full_name: string | null };
}

interface DealMembersModalProps {
  deal: CRMDeal;
  clusterId: string;
  profileId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function DealMembersModal({ deal, clusterId, profileId, onClose, onUpdate }: DealMembersModalProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<DealMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addAsFinderBonus, setAddAsFinderBonus] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'activities'>('members');
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [newActivitySubject, setNewActivitySubject] = useState('');
  const [newActivityContent, setNewActivityContent] = useState('');
  const [newActivityType, setNewActivityType] = useState('note');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [localOrgPercentage, setLocalOrgPercentage] = useState<number>((deal as any).org_percentage || 0);
  const [localOrgEquity, setLocalOrgEquity] = useState<number>((deal as any).org_equity || 0);

  const dealValue = deal.value || 0;

  const getCompensationAmount = (m: DealMember) => {
    if (m.compensation_type === 'fixed') return m.compensation_value;
    return dealValue * m.compensation_value / 100;
  };

  const getCompensationPercent = (m: DealMember) => {
    if (m.compensation_type === 'percentage') return m.compensation_value;
    return dealValue > 0 ? (m.compensation_value / dealValue) * 100 : 0;
  };

  const orgCompensationAmount = dealValue * localOrgPercentage / 100;
  const totalAllocated = members.reduce((sum, m) => sum + getCompensationAmount(m) + (m.monthly_amount || 0) + (m.one_time_commission || 0), 0) + orgCompensationAmount;
  const remaining = dealValue - totalAllocated;
  const percentAllocated = dealValue > 0 ? (totalAllocated / dealValue) * 100 : 0;

  useEffect(() => {
    loadData();
    loadActivities();

    const channel = supabase
      .channel(`deal-members-${deal.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_members', filter: `deal_id=eq.${deal.id}` }, () => loadData())
      .subscribe();

    const actChannel = supabase
      .channel(`deal-activities-${deal.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities', filter: `deal_id=eq.${deal.id}` }, () => loadActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(actChannel);
    };
  }, [deal.id]);

  const loadActivities = async () => {
    setIsLoadingActivities(true);
    const { data } = await supabase
      .from('crm_activities')
      .select('id, activity_type, subject, content, activity_date, profiles:created_by(full_name)')
      .eq('deal_id', deal.id)
      .order('activity_date', { ascending: false })
      .limit(50);
    if (data) setActivities(data as unknown as DealActivity[]);
    setIsLoadingActivities(false);
  };

  const handleSubmitActivity = async () => {
    if (!newActivitySubject.trim()) return;
    setIsSubmittingActivity(true);
    const { error } = await supabase.from('crm_activities').insert({
      cluster_id: clusterId,
      deal_id: deal.id,
      activity_type: newActivityType,
      subject: newActivitySubject.trim(),
      content: newActivityContent.trim() || null,
      activity_date: new Date().toISOString(),
      created_by: profileId,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewActivitySubject('');
      setNewActivityContent('');
    }
    setIsSubmittingActivity(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    
    const [memberRes, orgRes] = await Promise.all([
      supabase
        .from('deal_members')
        .select('*, profiles:profile_id(id, full_name, avatar_url)')
        .eq('deal_id', deal.id),
      supabase
        .from('cluster_enrollments')
        .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
        .eq('cluster_id', clusterId)
        .eq('status', 'approved'),
    ]);

    if (memberRes.data) setMembers(memberRes.data as unknown as DealMember[]);
    if (orgRes.data) setOrgMembers(orgRes.data as unknown as OrgMember[]);
    setIsLoading(false);
  };

  const addMember = async (memberProfileId: string, isFinder = false) => {
    const { data, error } = await supabase
      .from('deal_members')
      .insert({
        deal_id: deal.id,
        profile_id: memberProfileId,
        compensation_type: 'percentage',
        compensation_value: isFinder ? (deal as any).finder_bonus_percent || 15 : 0,
        monthly_amount: 0,
        equity_percentage: 0,
        one_time_commission: 0,
        is_finder_bonus: isFinder,
        compensation_label: isFinder ? 'Finder Bonus' : null,
      })
      .select('*, profiles:profile_id(id, full_name, avatar_url)')
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setMembers([...members, data as unknown as DealMember]);
      setShowAddMember(false);
      onUpdate();
    }
  };

  const updateMemberLocal = (memberId: string, updates: Partial<DealMember>) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m));
  };

  const saveMember = async (member: DealMember) => {
    const { error } = await supabase
      .from('deal_members')
      .update({
        compensation_type: member.compensation_type,
        compensation_value: member.compensation_value,
        monthly_amount: member.monthly_amount,
        equity_percentage: member.equity_percentage,
        one_time_commission: member.one_time_commission,
        is_finder_bonus: member.is_finder_bonus,
        compensation_label: member.compensation_label,
      })
      .eq('id', member.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const updateOrgPercentage = async (value: number) => {
    setLocalOrgPercentage(value);
    await supabase.from('crm_deals').update({ org_percentage: value }).eq('id', deal.id);
    onUpdate();
  };

  const updateOrgEquity = async (value: number) => {
    setLocalOrgEquity(value);
    await supabase.from('crm_deals').update({ org_equity: value } as any).eq('id', deal.id);
    onUpdate();
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('deal_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMembers(members.filter(m => m.id !== memberId));
      onUpdate();
    }
  };

  const handleSliderChange = (memberId: string, member: DealMember, newPercent: number) => {
    if (member.compensation_type === 'percentage') {
      updateMemberLocal(memberId, { compensation_value: newPercent });
    } else {
      const fixedVal = dealValue * newPercent / 100;
      updateMemberLocal(memberId, { compensation_value: Math.round(fixedVal * 100) / 100 });
    }
  };

  const handleSliderCommit = (member: DealMember) => {
    saveMember(member);
  };

  const toggleCompType = (member: DealMember) => {
    const currentAmount = getCompensationAmount(member);
    const currentPercent = getCompensationPercent(member);
    const newType = member.compensation_type === 'percentage' ? 'fixed' : 'percentage';
    const newValue = newType === 'fixed' ? Math.round(currentAmount * 100) / 100 : Math.round(currentPercent * 100) / 100;
    
    const updated = { ...member, compensation_type: newType as 'percentage' | 'fixed', compensation_value: newValue };
    updateMemberLocal(member.id, { compensation_type: updated.compensation_type, compensation_value: updated.compensation_value });
    saveMember(updated);
  };

  const availableMembers = orgMembers.filter(om => 
    om.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const splitEvenly = () => {
    if (members.length === 0) return;
    const evenPercent = Math.round((100 / members.length) * 100) / 100;
    const updated = members.map(m => ({
      ...m,
      compensation_type: 'percentage' as const,
      compensation_value: evenPercent,
    }));
    setMembers(updated);
    updated.forEach(m => saveMember(m));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{deal.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage members & activity</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-secondary/50 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'members' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Compensation ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'activities' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Activity Log ({activities.length})
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Deal Value</span>
                <span className="font-bold text-lg">€{dealValue.toLocaleString()}</span>
              </div>
              {/* Org Percentage */}
              <div className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Organization Cut</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localOrgPercentage}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setLocalOrgPercentage(v);
                    }}
                    onBlur={() => updateOrgPercentage(localOrgPercentage)}
                    className="w-16 h-6 px-2 rounded bg-background border border-border/50 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/30"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-muted-foreground ml-1">= €{orgCompensationAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {(() => {
                const barColors = ['hsl(var(--primary))', 'hsl(210, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(40, 80%, 55%)', 'hsl(280, 60%, 55%)', 'hsl(350, 65%, 55%)', 'hsl(190, 70%, 45%)', 'hsl(20, 75%, 55%)'];
                const slices: { name: string; amount: number; color: string }[] = [];
                if (localOrgPercentage > 0) {
                  slices.push({ name: 'Organization', amount: orgCompensationAmount, color: 'hsl(var(--muted-foreground))' });
                }
                members.forEach((m, i) => {
                  const total = getCompensationAmount(m) + (m.monthly_amount || 0) + (m.one_time_commission || 0);
                  slices.push({ name: m.profiles?.full_name || 'Unknown', amount: total, color: barColors[i % barColors.length] });
                });
                return (
                  <div className="group relative">
                    <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                      {slices.map((s, i) => {
                        const pct = dealValue > 0 ? (s.amount / dealValue) * 100 : 0;
                        return (
                          <div key={i} className="h-full transition-all duration-300" style={{ width: `${Math.max(pct, 0)}%`, backgroundColor: s.color }} />
                        );
                      })}
                    </div>
                    {/* Hover legend */}
                    <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      {slices.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[10px] font-medium">{s.name}</span>
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">€{s.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({dealValue > 0 ? ((s.amount / dealValue) * 100).toFixed(1) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                   Allocated: <span className="text-foreground font-semibold">{percentAllocated.toFixed(1)}%</span>
                   {' '}(€{totalAllocated.toLocaleString()})
                 </span>
                 <span className={remaining >= 0 ? 'text-green-500 font-medium' : 'text-destructive font-medium'}>
                   {remaining >= 0 ? `€${remaining.toLocaleString()} left` : `€${Math.abs(remaining).toLocaleString()} over`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'members' ? (
            isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Organization - always present */}
                <div className="rounded-xl border border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground flex-shrink-0" />
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-bold flex-shrink-0">ORG</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">Organization</p>
                        <span className="px-1.5 py-0.5 rounded-md bg-muted-foreground/15 text-muted-foreground text-[9px] font-semibold">DEFAULT</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Automatic cut from every deal</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">€{orgCompensationAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-muted-foreground">{localOrgPercentage}% of total</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Cut (%)</label>
                      <input
                        type="number"
                        value={localOrgPercentage}
                        onChange={e => setLocalOrgPercentage(parseFloat(e.target.value) || 0)}
                        onBlur={() => updateOrgPercentage(localOrgPercentage)}
                        className="w-full h-7 px-2 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 text-right"
                        min={0} max={100} step={0.5}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Equity (%)</label>
                      <input
                        type="number"
                        value={localOrgEquity}
                        onChange={e => setLocalOrgEquity(parseFloat(e.target.value) || 0)}
                        onBlur={() => updateOrgEquity(localOrgEquity)}
                        className="w-full h-7 px-2 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 text-right"
                        min={0} max={100} step={0.5}
                      />
                    </div>
                  </div>
                </div>

                {members.length > 1 && (
                  <button onClick={splitEvenly} className="w-full text-xs text-primary hover:text-primary/80 py-1.5 rounded-lg border border-dashed border-primary/30 hover:border-primary/50 transition-colors">
                    Split evenly ({(100 / members.length).toFixed(1)}% each)
                  </button>
                )}
                {members.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">Add individual members below</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member, idx) => {
                      const amount = getCompensationAmount(member);
                      const percent = getCompensationPercent(member);
                      const colors = ['border-primary/40', 'border-blue-500/40', 'border-emerald-500/40', 'border-amber-500/40', 'border-violet-500/40', 'border-rose-500/40', 'border-cyan-500/40', 'border-orange-500/40'];
                      const dotColors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500'];
                      return (
                        <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`rounded-xl border ${colors[idx % colors.length]} bg-secondary/10 p-4 space-y-3`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]} flex-shrink-0`} />
                            {member.profiles?.avatar_url ? (
                              <img src={member.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium flex-shrink-0">{member.profiles?.full_name?.[0] || '?'}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{member.profiles?.full_name || 'Unknown'}</p>
                                {member.is_finder_bonus && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[9px] font-semibold flex-shrink-0">FINDER</span>
                                )}
                              </div>
                              {member.compensation_label && (
                                <p className="text-[10px] text-muted-foreground">{member.compensation_label}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold">€{(amount + (member.monthly_amount || 0) + (member.one_time_commission || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {amount > 0 && `Base €${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                {(member.monthly_amount || 0) > 0 && `${amount > 0 ? ' + ' : ''}€${member.monthly_amount}/mo`}
                                {(member.one_time_commission || 0) > 0 && ` + €${member.one_time_commission} 1x`}
                              </p>
                            </div>
                            <button onClick={() => removeMember(member.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Base compensation slider */}
                          <div className="px-1">
                            <Slider value={[Math.min(percent, 100)]} min={0} max={100} step={0.5} onValueChange={([v]) => handleSliderChange(member.id, member, v)} onValueCommit={() => handleSliderCommit(member)} className="w-full" />
                          </div>
                          {/* Comp type + base value */}
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleCompType(member)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${member.compensation_type === 'percentage' ? 'bg-primary/15 text-primary' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                              <Percent className="w-3 h-3" /> %
                            </button>
                            <button onClick={() => toggleCompType(member)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${member.compensation_type === 'fixed' ? 'bg-primary/15 text-primary' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                              <DollarSign className="w-3 h-3" /> Fixed
                            </button>
                            <div className="flex-1" />
                            <div className="relative w-28">
                              <input type="number" value={member.compensation_value} onChange={e => updateMemberLocal(member.id, { compensation_value: parseFloat(e.target.value) || 0 })} onBlur={() => saveMember(member)} className="w-full h-8 px-3 pr-7 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 text-right" min={0} step={member.compensation_type === 'percentage' ? 0.5 : 1} />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{member.compensation_type === 'percentage' ? '%' : '€'}</span>
                            </div>
                          </div>
                          {/* Monthly + One-time + Equity row */}
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/30">
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Monthly (€/mo)</label>
                              <input
                                type="number"
                                value={member.monthly_amount || 0}
                                onChange={e => updateMemberLocal(member.id, { monthly_amount: parseFloat(e.target.value) || 0 })}
                                onBlur={() => saveMember(member)}
                                className="w-full h-7 px-2 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 text-right"
                                min={0}
                                step={100}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">One-time (€)</label>
                              <input
                                type="number"
                                value={member.one_time_commission || 0}
                                onChange={e => updateMemberLocal(member.id, { one_time_commission: parseFloat(e.target.value) || 0 })}
                                onBlur={() => saveMember(member)}
                                className="w-full h-7 px-2 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 text-right"
                                min={0}
                                step={100}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Equity (%)</label>
                              <input
                                type="number"
                                value={member.equity_percentage || 0}
                                onChange={e => updateMemberLocal(member.id, { equity_percentage: parseFloat(e.target.value) || 0 })}
                                onBlur={() => saveMember(member)}
                                className="w-full h-7 px-2 rounded-lg bg-background border border-border/50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 text-right"
                                min={0}
                                max={100}
                                step={0.5}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                {showAddMember ? (
                  <div className="border border-dashed border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addAsFinderBonus}
                          onChange={e => setAddAsFinderBonus(e.target.checked)}
                          className="rounded border-border"
                        />
                        <span className={addAsFinderBonus ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
                          Add as Finder ({(deal as any).finder_bonus_percent || 15}% bonus)
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <GlassInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search members..." className="pl-10 h-9 text-sm" />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No available members</p>
                      ) : (
                        availableMembers.map(om => (
                          <button key={om.profile_id} onClick={() => addMember(om.profile_id, addAsFinderBonus)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                            {om.profiles?.avatar_url ? (
                              <img src={om.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium">{om.profiles?.full_name?.[0] || '?'}</div>
                            )}
                            <span className="text-sm">{om.profiles?.full_name || 'Unknown'}</span>
                            <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
                          </button>
                        ))
                      )}
                    </div>
                    <button onClick={() => setShowAddMember(false)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddMember(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <UserPlus className="w-4 h-4" /> Add Member
                  </button>
                )}
              </>
            )
          ) : (
            /* Activity Log Tab */
            <div className="space-y-4">
              {/* Quick Log */}
              <div className="space-y-2 bg-secondary/20 rounded-xl p-4">
                <div className="flex gap-1.5 mb-2">
                  {[
                    { value: 'note', label: 'Note', icon: FileText },
                    { value: 'email', label: 'Email', icon: Mail },
                    { value: 'call', label: 'Call', icon: Phone },
                    { value: 'meeting', label: 'Meeting', icon: Calendar },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button key={t.value} onClick={() => setNewActivityType(t.value)} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${newActivityType === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                        <Icon className="w-3 h-3" /> {t.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={newActivitySubject}
                  onChange={e => setNewActivitySubject(e.target.value)}
                  placeholder="Activity subject..."
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={e => e.key === 'Enter' && handleSubmitActivity()}
                />
                <textarea
                  value={newActivityContent}
                  onChange={e => setNewActivityContent(e.target.value)}
                  placeholder="Details (optional)..."
                  className="w-full h-16 px-3 py-2 rounded-lg bg-background border border-border/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitActivity}
                    disabled={!newActivitySubject.trim() || isSubmittingActivity}
                    className="px-4 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingActivity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Log Activity
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              {isLoadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No activities logged for this lead yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map(activity => {
                    const typeIcons: Record<string, React.ElementType> = { email: Mail, call: Phone, meeting: Calendar, note: FileText };
                    const Icon = typeIcons[activity.activity_type] || FileText;
                    return (
                      <div key={activity.id} className="flex gap-3 p-3 rounded-xl bg-secondary/20">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.subject}</p>
                          {activity.content && <p className="text-xs text-muted-foreground mt-1">{activity.content}</p>}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{format(new Date(activity.activity_date), 'MMM d, yyyy h:mm a')}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}</span>
                            {activity.profiles?.full_name && (
                              <>
                                <span>•</span>
                                <span>{activity.profiles.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
