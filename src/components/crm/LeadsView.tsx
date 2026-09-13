import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search, X, Download, Columns3, ArrowUp, ArrowDown, ArrowUpDown, Loader2, Inbox,
  Mail, Phone, ExternalLink, CheckSquare, Trash2, RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, startOfMonth, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { DealDetailModal } from './DealDetailModal';
import { CRMDeal, DealStage } from './types';

interface LeadsViewProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  initialDealId?: string | null;
  onOpenInPipeline?: (dealId: string) => void;
}

interface Member { id: string; full_name: string | null; avatar_url: string | null }

type DatePreset = 'any' | 'today' | '7d' | '30d' | 'month' | 'custom';

interface Filters {
  q: string;
  stages: string[];
  sources: string[];
  campaigns: string[];
  forms: string[];
  owners: string[];
  date: DatePreset;
  from: string;
  to: string;
  hasEmail: boolean;
  hasPhone: boolean;
}

type ColumnKey = 'lead' | 'contact' | 'title' | 'source' | 'campaign' | 'form' | 'ad' | 'stage' | 'owner' | 'value' | 'received' | 'updated';
type SortKey = 'lead' | 'source' | 'campaign' | 'form' | 'stage' | 'owner' | 'value' | 'received' | 'updated';

const EMPTY_FILTERS: Filters = { q: '', stages: [], sources: [], campaigns: [], forms: [], owners: [], date: 'any', from: '', to: '', hasEmail: false, hasPhone: false };

const STAGES: { value: string; label: string; chip: string }[] = [
  { value: 'lead', label: 'New', chip: 'bg-[#E9ECFF] text-[#3F47A8]' },
  { value: 'qualified', label: 'Qualified', chip: 'bg-sky-100 text-sky-700' },
  { value: 'proposal', label: 'Proposal', chip: 'bg-violet-100 text-violet-700' },
  { value: 'negotiation', label: 'Negotiation', chip: 'bg-amber-100 text-amber-700' },
  { value: 'won', label: 'Won', chip: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', chip: 'bg-red-100 text-red-600' },
  { value: 'archived', label: 'Archived', chip: 'bg-secondary text-muted-foreground' },
];
const stageMeta = (s: string) => STAGES.find(x => x.value === s) || { value: s, label: s, chip: 'bg-secondary text-muted-foreground' };

const COLUMN_WIDTH: Record<ColumnKey, number> = { lead: 18, contact: 18, title: 16, source: 10, campaign: 15, form: 11, ad: 11, stage: 9, owner: 13, value: 6, received: 9, updated: 8 };

const COLUMNS: { key: ColumnKey; label: string; sort?: SortKey; defaultOn: boolean }[] = [
  { key: 'lead', label: 'Lead', sort: 'lead', defaultOn: true },
  { key: 'contact', label: 'Contact', defaultOn: true },
  { key: 'title', label: 'Title', defaultOn: false },
  { key: 'source', label: 'Source', sort: 'source', defaultOn: true },
  { key: 'campaign', label: 'Campaign', sort: 'campaign', defaultOn: true },
  { key: 'form', label: 'Form', sort: 'form', defaultOn: false },
  { key: 'ad', label: 'Ad', defaultOn: false },
  { key: 'stage', label: 'Stage', sort: 'stage', defaultOn: true },
  { key: 'owner', label: 'Owner', sort: 'owner', defaultOn: true },
  { key: 'value', label: 'Value', sort: 'value', defaultOn: true },
  { key: 'received', label: 'Received', sort: 'received', defaultOn: true },
  { key: 'updated', label: 'Updated', sort: 'updated', defaultOn: false },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

const UNSET = '__none__';

const leadName = (d: CRMDeal) => d.crm_contacts?.name || d.title;
const money = (n: number | null | undefined, currency = 'EUR') =>
  n === null || n === undefined ? '' : new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Leads: one dense, filterable table of every lead with its attribution
 * (source, campaign, form, ad), contact details, stage and owner.
 */
export function LeadsView({ clusterId, profileId, canManage, initialDealId, onOpenInPipeline }: LeadsViewProps) {
  const { toast } = useToast();
  const storageKey = `leads_view_${clusterId}`;
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [columns, setColumns] = useState<ColumnKey[]>(COLUMNS.filter(c => c.defaultOn).map(c => c.key));
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'received', dir: 'desc' });
  const [showColumns, setShowColumns] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailDeal, setDetailDeal] = useState<CRMDeal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedColumns, setSavedColumns] = useState(false);

  // Restore the saved view once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { filters?: Partial<Filters>; columns?: ColumnKey[]; sort?: { key: SortKey; dir: 'asc' | 'desc' } };
        if (saved.filters) setFilters({ ...EMPTY_FILTERS, ...saved.filters });
        if (saved.columns?.length) { setColumns(saved.columns.filter(c => COLUMNS.some(x => x.key === c))); setSavedColumns(true); }
        if (saved.sort) setSort(saved.sort);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ filters, columns, sort })); } catch { /* ignore */ }
  }, [filters, columns, sort, hydrated, storageKey]);

  const loadDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_deals')
      .select('*, crm_contacts(id, name, email, phone, company, position), profiles:assigned_to(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });
    if (error) { toast({ title: 'Could not load leads', description: error.message, variant: 'destructive' }); return; }
    setDeals((data || []) as unknown as CRMDeal[]);
  }, [clusterId, toast]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, profiles:profile_id(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    setMembers(
      ((data || []) as unknown as { profiles: Member | null }[])
        .map(r => r.profiles)
        .filter((p): p is Member => !!p)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
    );
  }, [clusterId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadDeals(), loadMembers()]).then(() => setIsLoading(false));
    const channel = supabase
      .channel(`crm-leads-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => loadDeals())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts', filter: `cluster_id=eq.${clusterId}` }, () => loadDeals())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clusterId, loadDeals, loadMembers]);

  useEffect(() => {
    if (!savedColumns && deals.some(d => d.form_name)) setColumns(cols => (cols.includes('form') ? cols : COLUMNS.map(x => x.key).filter(k => cols.includes(k) || k === 'form')));
  }, [deals, savedColumns]);

  useEffect(() => {
    if (initialDealId && deals.length) {
      const d = deals.find(x => x.id === initialDealId);
      if (d) setDetailDeal(d);
    }
  }, [initialDealId, deals]);

  // ---- Options with counts ----
  const countBy = (get: (d: CRMDeal) => string | null | undefined, labelFor?: (v: string) => string): MultiSelectOption[] => {
    const m = new Map<string, number>();
    for (const d of deals) { const v = get(d) || UNSET; m.set(v, (m.get(v) || 0) + 1); }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value === UNSET ? '(not set)' : labelFor ? labelFor(value) : value, count }));
  };
  const sourceOptions = useMemo(() => countBy(d => d.source), [deals]); // eslint-disable-line react-hooks/exhaustive-deps
  const campaignOptions = useMemo(() => countBy(d => d.campaign), [deals]); // eslint-disable-line react-hooks/exhaustive-deps
  const formOptions = useMemo(() => countBy(d => d.form_name), [deals]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerOptions = useMemo(() => countBy(d => d.assigned_to, v => members.find(m => m.id === v)?.full_name || 'Unknown'), [deals, members]); // eslint-disable-line react-hooks/exhaustive-deps
  const stageOptions = useMemo(() => STAGES.map(s => ({ value: s.value, label: s.label, count: deals.filter(d => d.stage === s.value).length })).filter(o => o.count > 0 || ['lead', 'won', 'lost'].includes(o.value)), [deals]);

  // ---- Filtering ----
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const matchSet = (list: string[], v: string | null | undefined) => list.length === 0 || list.includes(v || UNSET);
    let since: Date | null = null;
    let until: Date | null = null;
    const now = new Date();
    switch (filters.date) {
      case 'today': since = startOfDay(now); break;
      case '7d': since = subDays(startOfDay(now), 6); break;
      case '30d': since = subDays(startOfDay(now), 29); break;
      case 'month': since = startOfMonth(now); break;
      case 'custom':
        since = filters.from ? new Date(filters.from) : null;
        until = filters.to ? new Date(new Date(filters.to).getTime() + 86400000) : null;
        break;
      default: break;
    }
    return deals.filter(d => {
      if (!matchSet(filters.stages, d.stage)) return false;
      if (!matchSet(filters.sources, d.source)) return false;
      if (!matchSet(filters.campaigns, d.campaign)) return false;
      if (!matchSet(filters.forms, d.form_name)) return false;
      if (!matchSet(filters.owners, d.assigned_to)) return false;
      if (filters.hasEmail && !d.crm_contacts?.email) return false;
      if (filters.hasPhone && !d.crm_contacts?.phone) return false;
      const created = new Date(d.created_at);
      if (since && created < since) return false;
      if (until && created >= until) return false;
      if (q) {
        const hay = [d.title, d.crm_contacts?.name, d.crm_contacts?.email, d.crm_contacts?.phone, d.crm_contacts?.company, d.source, d.campaign, d.form_name, d.ad_name, d.description]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, filters]);

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const ownerName = (d: CRMDeal) => members.find(m => m.id === d.assigned_to)?.full_name || '';
    const stageIndex = (s: string) => STAGES.findIndex(x => x.value === s);
    const val = (d: CRMDeal): string | number => {
      switch (sort.key) {
        case 'lead': return leadName(d).toLowerCase();
        case 'source': return (d.source || '').toLowerCase();
        case 'campaign': return (d.campaign || '').toLowerCase();
        case 'form': return (d.form_name || '').toLowerCase();
        case 'stage': return stageIndex(d.stage);
        case 'owner': return ownerName(d).toLowerCase();
        case 'value': return d.value ?? -1;
        case 'updated': return new Date(d.updated_at).getTime();
        default: return new Date(d.created_at).getTime();
      }
    };
    return [...filtered].sort((a, b) => { const x = val(a), y = val(b); return x < y ? -dir : x > y ? dir : 0; });
  }, [filtered, sort, members]);

  const activeFilterCount =
    (filters.q ? 1 : 0) + filters.stages.length + filters.sources.length + filters.campaigns.length + filters.forms.length + filters.owners.length +
    (filters.date !== 'any' ? 1 : 0) + (filters.hasEmail ? 1 : 0) + (filters.hasPhone ? 1 : 0);

  // ---- Stats (on the filtered set) ----
  const stats = useMemo(() => {
    const weekAgo = subDays(new Date(), 7);
    const open = filtered.filter(d => !['won', 'lost', 'archived'].includes(d.stage));
    return {
      total: filtered.length,
      newThisWeek: filtered.filter(d => new Date(d.created_at) >= weekAgo).length,
      won: filtered.filter(d => d.stage === 'won').length,
      pipelineValue: open.reduce((s, d) => s + (d.value || 0), 0),
      wonValue: filtered.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0),
    };
  }, [filtered]);

  // ---- Mutations ----
  const updateDeal = async (id: string, patch: Partial<CRMDeal>) => {
    setDeals(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
    const { error } = await supabase.from('crm_deals').update(patch as Record<string, unknown>).eq('id', id);
    if (error) { toast({ title: 'Could not update lead', description: error.message, variant: 'destructive' }); loadDeals(); }
  };
  const setStage = (id: string, stage: string) =>
    updateDeal(id, { stage: stage as DealStage, closed_at: stage === 'won' || stage === 'lost' ? new Date().toISOString() : null });
  const setOwner = (id: string, owner: string) => updateDeal(id, { assigned_to: owner || null });

  const bulk = async (patch: Record<string, unknown>) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setDeals(prev => prev.map(d => (selected.has(d.id) ? { ...d, ...(patch as Partial<CRMDeal>) } : d)));
    const { error } = await supabase.from('crm_deals').update(patch).in('id', ids);
    if (error) { toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' }); loadDeals(); return; }
    toast({ title: `${ids.length} lead${ids.length === 1 ? '' : 's'} updated` });
    setSelected(new Set());
  };
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0 || !confirm(`Delete ${ids.length} lead${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    const { error } = await supabase.from('crm_deals').delete().in('id', ids);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setDeals(prev => prev.filter(d => !selected.has(d.id)));
    setSelected(new Set());
  };

  const exportCsv = (rows: CRMDeal[]) => {
    const head = ['Lead', 'Company', 'Email', 'Phone', 'Title', 'Source', 'Campaign', 'Form', 'Ad', 'Stage', 'Owner', 'Value', 'Currency', 'Received', 'Updated', 'Description'];
    const lines = rows.map(d => [
      leadName(d), d.crm_contacts?.company, d.crm_contacts?.email, d.crm_contacts?.phone, d.title, d.source, d.campaign, d.form_name, d.ad_name,
      stageMeta(d.stage).label, members.find(m => m.id === d.assigned_to)?.full_name, d.value, d.currency, d.created_at, d.updated_at, d.description,
    ].map(csvEscape).join(','));
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'received' || key === 'updated' || key === 'value' ? 'desc' : 'asc' }));

  const allVisibleSelected = sorted.length > 0 && sorted.every(d => selected.has(d.id));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(sorted.map(d => d.id)));
  const toggleOne = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const visibleColumns = COLUMNS.filter(c => columns.includes(c.key));
  const memberName = (id: string | null) => members.find(m => m.id === id)?.full_name || (id ? 'Unknown' : '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const SortIcon = ({ k }: { k?: SortKey }) => {
    if (!k) return null;
    if (sort.key !== k) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />;
    return sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-10rem)] min-h-[560px] text-[13px]">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: activeFilterCount ? 'Leads (filtered)' : 'Leads', value: String(stats.total), sub: activeFilterCount ? `of ${deals.length}` : 'all time' },
          { label: 'New this week', value: String(stats.newThisWeek), sub: 'last 7 days' },
          { label: 'Won', value: String(stats.won), sub: stats.wonValue ? money(stats.wonValue) : 'no value yet' },
          { label: 'Open pipeline', value: money(stats.pipelineValue) || '€0', sub: `${filtered.filter(d => !['won', 'lost', 'archived'].includes(d.stage)).length} open` },
          { label: 'Sources', value: String(sourceOptions.filter(o => o.value !== UNSET).length), sub: campaignOptions.filter(o => o.value !== UNSET).length + ' campaigns' },
        ].map(t => (
          <div key={t.label} className="rounded-2xl bg-card shadow-sm px-4 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="text-lg font-bold leading-tight mt-0.5">{t.value}</p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="relative z-20 rounded-2xl bg-card shadow-sm px-3 py-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            placeholder="Search name, email, phone, company, campaign…"
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filters.q && (
            <button onClick={() => setFilters(f => ({ ...f, q: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <MultiSelect label="Stage" options={stageOptions} selected={filters.stages} onChange={v => setFilters(f => ({ ...f, stages: v }))} />
        <MultiSelect label="Source" options={sourceOptions} selected={filters.sources} onChange={v => setFilters(f => ({ ...f, sources: v }))} />
        <MultiSelect label="Campaign" options={campaignOptions} selected={filters.campaigns} onChange={v => setFilters(f => ({ ...f, campaigns: v }))} />
        <MultiSelect label="Form" options={formOptions} selected={filters.forms} onChange={v => setFilters(f => ({ ...f, forms: v }))} />
        <MultiSelect label="Owner" options={ownerOptions} selected={filters.owners} onChange={v => setFilters(f => ({ ...f, owners: v }))} />
        <select
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value as DatePreset }))}
          className={`h-9 rounded-lg border px-2.5 text-xs font-medium ${filters.date !== 'any' ? 'bg-[#2A2722] text-[#F7F7F5] border-[#2A2722]' : 'bg-card border-border'}`}
        >
          {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {filters.date === 'custom' && (
          <>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="h-9 rounded-lg border border-border bg-card px-2 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="h-9 rounded-lg border border-border bg-card px-2 text-xs" />
          </>
        )}
        <button onClick={() => setFilters(f => ({ ...f, hasEmail: !f.hasEmail }))} className={`inline-flex items-center gap-1 h-9 rounded-lg border px-2.5 text-xs font-medium ${filters.hasEmail ? 'bg-[#2A2722] text-[#F7F7F5] border-[#2A2722]' : 'bg-card border-border hover:bg-secondary'}`} title="Only leads with an email">
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
        <button onClick={() => setFilters(f => ({ ...f, hasPhone: !f.hasPhone }))} className={`inline-flex items-center gap-1 h-9 rounded-lg border px-2.5 text-xs font-medium ${filters.hasPhone ? 'bg-[#2A2722] text-[#F7F7F5] border-[#2A2722]' : 'bg-card border-border hover:bg-secondary'}`} title="Only leads with a phone number">
          <Phone className="w-3.5 h-3.5" /> Phone
        </button>
        {activeFilterCount > 0 && (
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-1 h-9 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" /> Clear {activeFilterCount}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <GlassButtonNew variant="ghost" size="sm" onClick={() => setShowColumns(v => !v)} leftIcon={<Columns3 className="w-3.5 h-3.5" />}>Columns</GlassButtonNew>
            {showColumns && (
              <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg p-2" onMouseLeave={() => setShowColumns(false)}>
                {COLUMNS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary cursor-pointer">
                    <input type="checkbox" checked={columns.includes(c.key)} disabled={c.key === 'lead'} onChange={e => setColumns(cols => (e.target.checked ? COLUMNS.map(x => x.key).filter(k => cols.includes(k) || k === c.key) : cols.filter(k => k !== c.key)))} className="rounded border-border" />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <GlassButtonNew variant="ghost" size="sm" onClick={() => exportCsv(sorted)} leftIcon={<Download className="w-3.5 h-3.5" />} disabled={sorted.length === 0}>Export</GlassButtonNew>
          <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => { setIsLoading(true); loadDeals().then(() => setIsLoading(false)); }} title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></GlassButtonNew>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="rounded-xl bg-[#2A2722] text-[#F7F7F5] px-4 py-2 flex flex-wrap items-center gap-3 text-xs">
          <CheckSquare className="w-4 h-4" />
          <span className="font-medium">{selected.size} selected</span>
          {canManage && (
            <>
              <select defaultValue="" onChange={e => { if (e.target.value) { bulk({ stage: e.target.value, closed_at: ['won', 'lost'].includes(e.target.value) ? new Date().toISOString() : null }); e.target.value = ''; } }} className="h-7 rounded-md bg-white/10 border border-white/20 px-2 text-xs text-[#F7F7F5]">
                <option value="" className="text-black">Move to stage…</option>
                {STAGES.map(s => <option key={s.value} value={s.value} className="text-black">{s.label}</option>)}
              </select>
              <select defaultValue="" onChange={e => { if (e.target.value) { bulk({ assigned_to: e.target.value === UNSET ? null : e.target.value }); e.target.value = ''; } }} className="h-7 rounded-md bg-white/10 border border-white/20 px-2 text-xs text-[#F7F7F5]">
                <option value="" className="text-black">Assign to…</option>
                <option value={UNSET} className="text-black">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id} className="text-black">{m.full_name || 'Unknown'}</option>)}
              </select>
            </>
          )}
          <button onClick={() => exportCsv(sorted.filter(d => selected.has(d.id)))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10"><Download className="w-3.5 h-3.5" /> Export selected</button>
          {canManage && <button onClick={bulkDelete} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10 text-red-200"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
          <button onClick={() => setSelected(new Set())} className="ml-auto rounded-md px-2 py-1 hover:bg-white/10">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-border bg-card shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-[#9B9B9B]" />
            <p className="font-semibold mb-1">{deals.length === 0 ? 'No leads yet' : 'No leads match these filters'}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {deals.length === 0 ? 'Connect a source under Inbound webhooks or import a CSV, and leads will appear here as they arrive.' : 'Try clearing a filter or widening the date range.'}
            </p>
            {activeFilterCount > 0 && <GlassButtonNew variant="secondary" size="sm" className="mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</GlassButtonNew>}
          </div>
        ) : (
          <table className="w-full table-fixed text-[13px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2.5 py-2 border-b border-border w-9">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="rounded border-border" aria-label="Select all" />
                </th>
                {visibleColumns.map(c => (
                  <th key={c.key} style={{ width: `${(COLUMN_WIDTH[c.key] / visibleColumns.reduce((s, x) => s + COLUMN_WIDTH[x.key], 0)) * 100}%` }} className={`px-2.5 py-2 border-b border-border font-medium whitespace-nowrap overflow-hidden text-ellipsis ${c.key === 'value' ? 'text-right' : ''}`}>
                    {c.sort ? (
                      <button onClick={() => toggleSort(c.sort!)} className="inline-flex items-center gap-1 hover:text-foreground">{c.label} <SortIcon k={c.sort} /></button>
                    ) : c.label}
                  </th>
                ))}
                <th className="px-2.5 py-2 border-b border-border w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const isSel = selected.has(d.id);
                const sm = stageMeta(d.stage);
                return (
                  <tr key={d.id} className={`group hover:bg-secondary/60 transition-colors ${isSel ? 'bg-accent/40' : ''}`}>
                    <td className="px-3 py-2 border-b border-border/60 align-top">
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(d.id)} className="rounded border-border mt-1" aria-label="Select lead" />
                    </td>
                    {visibleColumns.map(c => {
                      const base = 'px-2.5 py-1.5 border-b border-border/60 align-top overflow-hidden';
                      switch (c.key) {
                        case 'lead':
                          return (
                            <td key={c.key} className={`${base}`}>
                              <button onClick={() => setDetailDeal(d)} className="text-left w-full min-w-0">
                                <p className="font-medium leading-tight hover:underline truncate">{leadName(d)}</p>
                                {d.crm_contacts?.company && <p className="text-xs text-muted-foreground truncate">{d.crm_contacts.company}</p>}
                              </button>
                            </td>
                          );
                        case 'contact':
                          return (
                            <td key={c.key} className={`${base} text-xs`}>
                              {d.crm_contacts?.email ? <a href={`mailto:${d.crm_contacts.email}`} className="block truncate hover:underline" title={d.crm_contacts.email}>{d.crm_contacts.email}</a> : null}
                              {d.crm_contacts?.phone ? <a href={`tel:${d.crm_contacts.phone}`} className="block truncate text-muted-foreground hover:underline">{d.crm_contacts.phone}</a> : null}
                              {!d.crm_contacts?.email && !d.crm_contacts?.phone && <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        case 'title':
                          return <td key={c.key} className={`${base} text-xs truncate`} title={d.title}>{d.title}</td>;
                        case 'source':
                          return <td key={c.key} className={`${base} text-xs`}>{d.source ? <button onClick={() => setFilters(f => ({ ...f, sources: [d.source!] }))} className="inline-flex max-w-full truncate rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground border border-[#CFC3D9] hover:opacity-80" title="Filter by this source">{d.source}</button> : <span className="text-muted-foreground">—</span>}</td>;
                        case 'campaign':
                          return <td key={c.key} className={`${base} text-xs`}>{d.campaign ? <button onClick={() => setFilters(f => ({ ...f, campaigns: [d.campaign!] }))} className="truncate block w-full text-left hover:underline" title={`${d.campaign} (click to filter)`}>{d.campaign}</button> : <span className="text-muted-foreground">—</span>}</td>;
                        case 'form':
                          return <td key={c.key} className={`${base} text-xs truncate`} title={d.form_name || ''}>{d.form_name || <span className="text-muted-foreground">—</span>}</td>;
                        case 'ad':
                          return <td key={c.key} className={`${base} text-xs truncate`} title={d.ad_name || ''}>{d.ad_name || <span className="text-muted-foreground">—</span>}</td>;
                        case 'stage':
                          return (
                            <td key={c.key} className={`${base}`}>
                              {canManage ? (
                                <select value={d.stage} onChange={e => setStage(d.id, e.target.value)} className={`h-7 w-full max-w-[110px] rounded-full px-2 pr-5 text-[11px] font-medium border-0 cursor-pointer appearance-none ${sm.chip}`} style={{ backgroundImage: 'none' }}>
                                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                              ) : (
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${sm.chip}`}>{sm.label}</span>
                              )}
                            </td>
                          );
                        case 'owner':
                          return (
                            <td key={c.key} className={`${base} text-xs`}>
                              {canManage ? (
                                <select value={d.assigned_to || ''} onChange={e => setOwner(d.id, e.target.value)} className="h-7 w-full max-w-[130px] truncate rounded-md bg-transparent border border-transparent hover:border-border px-1 text-xs cursor-pointer">
                                  <option value="">Unassigned</option>
                                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || 'Unknown'}</option>)}
                                </select>
                              ) : (memberName(d.assigned_to) || <span className="text-muted-foreground">Unassigned</span>)}
                            </td>
                          );
                        case 'value':
                          return <td key={c.key} className={`${base} text-xs text-right tabular-nums whitespace-nowrap`}>{money(d.value, d.currency) || <span className="text-muted-foreground">—</span>}</td>;
                        case 'received':
                          return <td key={c.key} className={`${base} text-xs whitespace-nowrap`} title={format(new Date(d.created_at), 'PPpp')}><span>{format(new Date(d.created_at), 'd MMM')}</span><span className="block text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true }).replace('about ', '')}</span></td>;
                        case 'updated':
                          return <td key={c.key} className={`${base} text-xs whitespace-nowrap text-muted-foreground`} title={format(new Date(d.updated_at), 'PPpp')}>{formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}</td>;
                        default:
                          return <td key={c.key} className={base} />;
                      }
                    })}
                    <td className="px-2 py-2 border-b border-border/60 align-top">
                      <button onClick={() => setDetailDeal(d)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" title="Open lead"><ExternalLink className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Showing {sorted.length} of {deals.length} lead{deals.length === 1 ? '' : 's'}. Click a source or campaign to filter by it; click a name to open the lead.
      </p>

      <AnimatePresence>
        {detailDeal && (
          <DealDetailModal
            deal={detailDeal}
            profileId={profileId}
            clusterId={clusterId}
            orgMembers={members}
            onClose={() => setDetailDeal(null)}
            onEdit={deal => { setDetailDeal(null); onOpenInPipeline?.(deal.id); }}
            onManageMembers={deal => { setDetailDeal(null); onOpenInPipeline?.(deal.id); }}
            canManage={canManage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
