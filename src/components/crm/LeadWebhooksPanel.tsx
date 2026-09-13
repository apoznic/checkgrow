import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Loader2, Webhook, Copy, Check, RefreshCw, Trash2, Power, PowerOff,
  Inbox, AlertCircle, ExternalLink, ChevronDown, ChevronRight, Code2, ShieldCheck, KeyRound, Upload, FileSpreadsheet, Pencil,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { DealStage } from './types';
import { parseCsv } from '@/lib/csv';

interface LeadWebhooksPanelProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  onOpenDeal?: (dealId: string) => void;
}

interface WebhookRow {
  id: string;
  name: string;
  source_label: string | null;
  token: string;
  enabled: boolean;
  default_stage: DealStage;
  default_assigned_to: string | null;
  signing_secret: string | null;
  received_count: number;
  last_received_at: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  status: 'created' | 'duplicate' | 'error' | 'rejected';
  error: string | null;
  payload: Record<string, unknown>;
  deal_id: string | null;
  created_at: string;
  crm_deals?: { id: string; title: string } | null;
}

interface ImportState {
  webhookId: string;
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  runAutomations: boolean;
  status: 'preview' | 'running' | 'done';
  done: number;
  created: number;
  duplicate: number;
  failed: number;
  errors: string[];
}

interface Member {
  profileId: string;
  fullName: string;
}

const STAGE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'negotiation', label: 'Negotiation' },
];

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-lead-webhook`;
const webhookUrl = (token: string) => `${FUNCTIONS_BASE}?token=${token}`;

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');

const STATUS_STYLE: Record<EventRow['status'], string> = {
  created: 'bg-green-100 text-green-700',
  duplicate: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600',
};

/**
 * Inbound lead webhooks: one URL per source system. Anything POSTed to the URL
 * becomes a contact + lead in this organization's CRM.
 */
export function LeadWebhooksPanel({ clusterId, profileId, canManage, onOpenDeal }: LeadWebhooksPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', source_label: '', default_stage: 'lead' as DealStage, default_assigned_to: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, EventRow[]>>({});
  const [eventsLoading, setEventsLoading] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [secretEditId, setSecretEditId] = useState<string | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [secretSaving, setSecretSaving] = useState(false);
  const [importState, setImportState] = useState<ImportState | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', source_label: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTargetRef = useRef<string | null>(null);
  const cancelImportRef = useRef(false);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel(`crm-webhooks-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_webhooks', filter: `cluster_id=eq.${clusterId}` }, () => loadWebhooks())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_webhook_events', filter: `cluster_id=eq.${clusterId}` }, (payload) => {
        const row = payload.new as { webhook_id: string };
        loadWebhooks();
        if (row?.webhook_id && expandedId === row.webhook_id) loadEvents(row.webhook_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadWebhooks(), loadMembers()]);
    setIsLoading(false);
  };

  const loadWebhooks = async () => {
    const { data, error } = await supabase
      .from('crm_webhooks')
      .select('id, name, source_label, token, enabled, default_stage, default_assigned_to, signing_secret, received_count, last_received_at, created_at')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Could not load webhooks', description: error.message, variant: 'destructive' });
      return;
    }
    setWebhooks((data || []) as WebhookRow[]);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, profiles ( full_name )')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    setMembers(
      (data || [])
        .map((r: { profile_id: string; profiles: { full_name: string | null } | null }) => ({ profileId: r.profile_id, fullName: r.profiles?.full_name || 'Unnamed member' }))
        .sort((a: Member, b: Member) => a.fullName.localeCompare(b.fullName)),
    );
  };

  const loadEvents = async (webhookId: string) => {
    setEventsLoading(webhookId);
    const { data } = await supabase
      .from('crm_webhook_events')
      .select('id, status, error, payload, deal_id, created_at, crm_deals ( id, title )')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(25);
    setEvents(prev => ({ ...prev, [webhookId]: (data || []) as unknown as EventRow[] }));
    setEventsLoading(null);
  };

  const toggleExpanded = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !events[next]) loadEvents(next);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('crm_webhooks').insert({
      cluster_id: clusterId,
      name: form.name.trim(),
      source_label: form.source_label.trim() || form.name.trim(),
      default_stage: form.default_stage,
      default_assigned_to: form.default_assigned_to || null,
      created_by: profileId,
      token: randomToken(),
    });
    setIsSaving(false);
    if (error) {
      toast({ title: 'Could not create webhook', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Webhook created', description: 'Copy the URL into the system that sends leads.' });
    setForm({ name: '', source_label: '', default_stage: 'lead', default_assigned_to: '' });
    setShowCreate(false);
    loadWebhooks();
  };

  const handleToggle = async (hook: WebhookRow) => {
    setWebhooks(prev => prev.map(h => (h.id === hook.id ? { ...h, enabled: !h.enabled } : h)));
    const { error } = await supabase.from('crm_webhooks').update({ enabled: !hook.enabled }).eq('id', hook.id);
    if (error) {
      toast({ title: 'Could not update webhook', description: error.message, variant: 'destructive' });
      loadWebhooks();
    }
  };

  const handleRegenerate = async (hook: WebhookRow) => {
    if (!confirm(`Regenerate the URL for "${hook.name}"? The old URL stops working immediately.`)) return;
    const { error } = await supabase.from('crm_webhooks').update({ token: randomToken() }).eq('id', hook.id);
    if (error) {
      toast({ title: 'Could not regenerate', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'New URL generated' });
    loadWebhooks();
  };

  const handleDelete = async (hook: WebhookRow) => {
    if (!confirm(`Delete "${hook.name}"? Leads already created stay in the CRM.`)) return;
    const { error } = await supabase.from('crm_webhooks').delete().eq('id', hook.id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    setWebhooks(prev => prev.filter(h => h.id !== hook.id));
  };

  const handleUpdateField = async (hook: WebhookRow, patch: Partial<Pick<WebhookRow, 'default_stage' | 'default_assigned_to'>>) => {
    setWebhooks(prev => prev.map(h => (h.id === hook.id ? { ...h, ...patch } : h)));
    await supabase.from('crm_webhooks').update(patch).eq('id', hook.id);
  };

  const handleSaveSecret = async (hook: WebhookRow) => {
    const secret = secretDraft.trim();
    if (!secret) return;
    setSecretSaving(true);
    const { error } = await supabase.from('crm_webhooks').update({ signing_secret: secret }).eq('id', hook.id);
    setSecretSaving(false);
    if (error) {
      toast({ title: 'Could not save the signing secret', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Signature verification on', description: `Deliveries to "${hook.name}" must now be signed with this secret.` });
    setSecretEditId(null);
    setSecretDraft('');
    loadWebhooks();
  };

  const handleRemoveSecret = async (hook: WebhookRow) => {
    if (!confirm(`Stop verifying signatures for "${hook.name}"? Any request with the URL will be accepted again.`)) return;
    const { error } = await supabase.from('crm_webhooks').update({ signing_secret: null }).eq('id', hook.id);
    if (error) {
      toast({ title: 'Could not remove the signing secret', description: error.message, variant: 'destructive' });
      return;
    }
    loadWebhooks();
  };

  const startEdit = (hook: WebhookRow) => {
    setEditId(hook.id);
    setEditForm({ name: hook.name, source_label: hook.source_label || '' });
  };

  const handleSaveEdit = async (hook: WebhookRow) => {
    const name = editForm.name.trim();
    if (!name) return;
    const { error } = await supabase.from('crm_webhooks').update({ name, source_label: editForm.source_label.trim() || name }).eq('id', hook.id);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setEditId(null);
    loadWebhooks();
  };

  const pickImportFile = (hook: WebhookRow) => {
    importTargetRef.current = hook.id;
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const webhookId = importTargetRef.current;
    e.target.value = '';
    if (!file || !webhookId) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      toast({ title: 'Nothing to import', description: 'The file has a header row but no leads.', variant: 'destructive' });
      return;
    }
    setImportState({
      webhookId, fileName: file.name, headers: parsed.headers, rows: parsed.rows,
      runAutomations: false, status: 'preview', done: 0, created: 0, duplicate: 0, failed: 0, errors: [],
    });
  };

  /** A stable id per CSV row so re-importing the same file does not duplicate leads. */
  const rowExternalId = (row: Record<string, string>): string | null => {
    const byKey = new Map(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[\s-]+/g, '_'), v]));
    const explicit = ['external_id', 'lead_id', 'id', 'submission_id', 'response_id'].map(k => byKey.get(k)).find(v => v && v.trim());
    if (explicit) return explicit.trim();
    const email = (['email', 'email_address', 'e_mail'].map(k => byKey.get(k)).find(v => v && v.trim()) || '').trim().toLowerCase();
    const name = (['name', 'full_name', 'lead', 'contact'].map(k => byKey.get(k)).find(v => v && v.trim()) || '').trim().toLowerCase();
    const when = (['received', 'received_at', 'created', 'created_at', 'date', 'submitted', 'submitted_at', 'timestamp'].map(k => byKey.get(k)).find(v => v && v.trim()) || '').trim();
    if (!email && !name) return null;
    return `import:${email || name}:${when}`;
  };

  const runImport = async () => {
    if (!importState) return;
    const hook = webhooks.find(h => h.id === importState.webhookId);
    if (!hook) return;
    cancelImportRef.current = false;
    setImportState(s => (s ? { ...s, status: 'running', done: 0, created: 0, duplicate: 0, failed: 0, errors: [] } : s));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hook.signing_secret) headers['x-webhook-secret'] = hook.signing_secret;
    if (!importState.runAutomations) headers['x-skip-automations'] = '1';
    const rows = importState.rows;
    let next = 0;
    const worker = async () => {
      while (next < rows.length && !cancelImportRef.current) {
        const index = next++;
        const row = rows[index];
        const externalId = rowExternalId(row);
        const body: Record<string, string> = { ...row };
        if (externalId && !Object.keys(row).some(k => /^(external_id|lead_id|id)$/i.test(k.trim()))) body.external_id = externalId;
        let outcome: 'created' | 'duplicate' | 'failed' = 'failed';
        let errorText = '';
        try {
          const res = await fetch(webhookUrl(hook.token), { method: 'POST', headers, body: JSON.stringify(body) });
          const data = await res.json().catch(() => ({}));
          if (res.ok) outcome = data.duplicate ? 'duplicate' : 'created';
          else errorText = data.error || `HTTP ${res.status}`;
        } catch (err) {
          errorText = err instanceof Error ? err.message : 'Network error';
        }
        setImportState(s => {
          if (!s) return s;
          const errors = outcome === 'failed' && s.errors.length < 10 ? [...s.errors, `Row ${index + 2}: ${errorText}`] : s.errors;
          return { ...s, done: s.done + 1, [outcome]: s[outcome] + 1, errors };
        });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setImportState(s => (s ? { ...s, status: 'done' } : s));
    loadWebhooks();
    if (expandedId === hook.id) loadEvents(hook.id);
  };

  const copy = async (hook: WebhookRow) => {
    try {
      await navigator.clipboard.writeText(webhookUrl(hook.token));
      setCopiedId(hook.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the URL and copy it manually.', variant: 'destructive' });
    }
  };

  const memberOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...members.map(m => ({ value: m.profileId, label: m.fullName }))],
    [members],
  );
  const memberName = (id: string | null) => members.find(m => m.profileId === id)?.fullName || 'Unassigned';
  const totalReceived = webhooks.reduce((sum, h) => sum + h.received_count, 0);
  const exampleToken = webhooks[0]?.token || '<token>';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Webhook className="w-4 h-4" />
            <span className="text-sm">Webhooks</span>
          </div>
          <p className="text-2xl font-bold">{webhooks.length}</p>
          <p className="text-xs text-[#9B9B9B] mt-1">{webhooks.filter(h => h.enabled).length} active</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Inbox className="w-4 h-4" />
            <span className="text-sm">Leads received</span>
          </div>
          <p className="text-2xl font-bold">{totalReceived}</p>
        </div>
        <div className="glass-panel p-4 md:col-span-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Send leads from any system</p>
            <p className="text-xs text-muted-foreground">Forms, ad platforms, Zapier, n8n, or your own backend: POST JSON to a webhook URL.</p>
          </div>
          {canManage && (
            <GlassButtonNew variant="primary" onClick={() => setShowCreate(v => !v)} leftIcon={<Plus className="w-4 h-4" />}>
              New webhook
            </GlassButtonNew>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreate && canManage && (
        <div className="glass-panel p-6 space-y-4">
          <div>
            <p className="eyebrow mb-1">New inbound webhook</p>
            <h3 className="text-h4">Where do these leads come from?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <GlassInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Website contact form" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Source label on leads</label>
              <GlassInput value={form.source_label} onChange={e => setForm(p => ({ ...p, source_label: e.target.value }))} placeholder="e.g. Website" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Starting stage</label>
              <GlassSelect value={form.default_stage} onChange={v => setForm(p => ({ ...p, default_stage: v as DealStage }))} options={STAGE_OPTIONS} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Default owner</label>
              <GlassSelect value={form.default_assigned_to} onChange={v => setForm(p => ({ ...p, default_assigned_to: v }))} options={memberOptions} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <GlassButtonNew variant="ghost" onClick={() => setShowCreate(false)}>Cancel</GlassButtonNew>
            <GlassButtonNew variant="primary" onClick={handleCreate} disabled={!form.name.trim()} isLoading={isSaving}>
              Create webhook
            </GlassButtonNew>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Webhook className="w-12 h-12 mx-auto mb-3 text-[#9B9B9B]" />
          <p className="font-semibold mb-1">No inbound webhooks yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create one per lead source. Each gets its own URL, and every POST to it becomes a lead in the pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(hook => {
            const open = expandedId === hook.id;
            const hookEvents = events[hook.id] || [];
            return (
              <div key={hook.id} className="glass-panel">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      {editId === hook.id ? (
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Name</label>
                            <GlassInput value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(hook); if (e.key === 'Escape') setEditId(null); }} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Source label on leads</label>
                            <GlassInput value={editForm.source_label} onChange={e => setEditForm(f => ({ ...f, source_label: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(hook); if (e.key === 'Escape') setEditId(null); }} />
                          </div>
                          <GlassButtonNew variant="primary" size="sm" onClick={() => handleSaveEdit(hook)} disabled={!editForm.name.trim()}>Save</GlassButtonNew>
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</GlassButtonNew>
                        </div>
                      ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{hook.name}</h3>
                        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground border border-[#CFC3D9]">
                          {hook.source_label || hook.name}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${hook.enabled ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                          {hook.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {hook.received_count} lead{hook.received_count === 1 ? '' : 's'} received
                        {hook.last_received_at ? ` · last ${formatDistanceToNow(new Date(hook.last_received_at), { addSuffix: true })}` : ' · nothing received yet'}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => startEdit(hook)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                          Edit
                        </GlassButtonNew>
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => handleToggle(hook)} leftIcon={hook.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}>
                          {hook.enabled ? 'Pause' : 'Enable'}
                        </GlassButtonNew>
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => handleRegenerate(hook)} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                          New URL
                        </GlassButtonNew>
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => pickImportFile(hook)} leftIcon={<Upload className="w-3.5 h-3.5" />} disabled={importState?.status === 'running'}>
                          Import CSV
                        </GlassButtonNew>
                        <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => handleDelete(hook)} title="Delete webhook" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </GlassButtonNew>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={webhookUrl(hook.token)}
                      onFocus={e => e.currentTarget.select()}
                      className="glass-input font-mono text-xs"
                    />
                    <GlassButtonNew variant="secondary" size="default" onClick={() => copy(hook)} leftIcon={copiedId === hook.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}>
                      {copiedId === hook.id ? 'Copied' : 'Copy'}
                    </GlassButtonNew>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-muted-foreground">New leads start in</span>
                    {canManage ? (
                      <GlassSelect value={hook.default_stage} onChange={v => handleUpdateField(hook, { default_stage: v as DealStage })} options={STAGE_OPTIONS} className="min-w-[130px]" />
                    ) : (
                      <span className="font-medium">{STAGE_OPTIONS.find(s => s.value === hook.default_stage)?.label}</span>
                    )}
                    <span className="text-muted-foreground">owned by</span>
                    {canManage ? (
                      <GlassSelect value={hook.default_assigned_to || ''} onChange={v => handleUpdateField(hook, { default_assigned_to: v || null })} options={memberOptions} className="min-w-[170px]" />
                    ) : (
                      <span className="font-medium">{memberName(hook.default_assigned_to)}</span>
                    )}
                  </div>

                  {/* Signing secret */}
                  <div className="card-tinted p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs">
                        {hook.signing_secret ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <KeyRound className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-medium">
                          {hook.signing_secret ? 'Signature verification on' : 'Signature verification off'}
                        </span>
                        <span className="text-muted-foreground">
                          {hook.signing_secret
                            ? `· secret ${hook.signing_secret.slice(0, 10)}…${hook.signing_secret.slice(-4)}`
                            : '· paste the signing secret the sending system gave you'}
                        </span>
                      </div>
                      {canManage && secretEditId !== hook.id && (
                        <div className="flex items-center gap-1">
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => { setSecretEditId(hook.id); setSecretDraft(''); }}>
                            {hook.signing_secret ? 'Change secret' : 'Add secret'}
                          </GlassButtonNew>
                          {hook.signing_secret && (
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => handleRemoveSecret(hook)} className="text-muted-foreground hover:text-destructive">
                              Remove
                            </GlassButtonNew>
                          )}
                        </div>
                      )}
                    </div>
                    {canManage && secretEditId === hook.id && (
                      <div className="flex gap-2">
                        <GlassInput
                          value={secretDraft}
                          onChange={e => setSecretDraft(e.target.value)}
                          placeholder="e.g. lwhsec_0e327f4c…"
                          className="font-mono text-xs"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveSecret(hook); if (e.key === 'Escape') setSecretEditId(null); }}
                        />
                        <GlassButtonNew variant="primary" size="default" onClick={() => handleSaveSecret(hook)} disabled={!secretDraft.trim()} isLoading={secretSaving}>
                          Save
                        </GlassButtonNew>
                        <GlassButtonNew variant="ghost" size="default" onClick={() => setSecretEditId(null)}>Cancel</GlassButtonNew>
                      </div>
                    )}
                  </div>

                  {/* CSV import */}
                  {importState?.webhookId === hook.id && (
                    <div className="card-outlined p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-accent-foreground" />
                        <p className="text-sm font-semibold">
                          {importState.status === 'preview' && `Import ${importState.rows.length} lead${importState.rows.length === 1 ? '' : 's'} from ${importState.fileName}`}
                          {importState.status === 'running' && `Importing… ${importState.done} / ${importState.rows.length}`}
                          {importState.status === 'done' && `Import finished: ${importState.created} created, ${importState.duplicate} already existed, ${importState.failed} failed`}
                        </p>
                      </div>
                      {importState.status === 'preview' && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Columns found: {importState.headers.join(', ')}. Name, email, phone, company, subject, message and value are mapped automatically; everything else is kept in the lead description and available to automations. Leads with the same email are merged into one contact.
                          </p>
                          <label className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={importState.runAutomations} onChange={e => setImportState(s => (s ? { ...s, runAutomations: e.target.checked } : s))} className="rounded border-border" />
                            Run automations for these leads (off by default, so old leads do not get welcome emails)
                          </label>
                          <div className="flex gap-2 justify-end">
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => setImportState(null)}>Cancel</GlassButtonNew>
                            <GlassButtonNew variant="primary" size="sm" onClick={runImport} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                              Import {importState.rows.length} lead{importState.rows.length === 1 ? '' : 's'}
                            </GlassButtonNew>
                          </div>
                        </>
                      )}
                      {importState.status !== 'preview' && (
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((importState.done / Math.max(1, importState.rows.length)) * 100)}%` }} />
                        </div>
                      )}
                      {importState.errors.length > 0 && (
                        <ul className="text-xs text-destructive space-y-0.5">
                          {importState.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      )}
                      {importState.status === 'running' && (
                        <div className="flex justify-end">
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => { cancelImportRef.current = true; }}>Stop</GlassButtonNew>
                        </div>
                      )}
                      {importState.status === 'done' && (
                        <div className="flex justify-end">
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => setImportState(null)}>Close</GlassButtonNew>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleExpanded(hook.id)}
                  className="w-full flex items-center gap-2 px-5 py-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Recent deliveries
                </button>
                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {eventsLoading === hook.id && hookEvents.length === 0 ? (
                      <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading</div>
                    ) : hookEvents.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">Nothing received yet. Send a test request to the URL above.</p>
                    ) : (
                      hookEvents.map(ev => {
                        const p = ev.payload || {};
                        const preview = [p.name, p.email, p.company].filter(Boolean).join(' · ') || Object.keys(p).slice(0, 4).join(', ');
                        return (
                          <div key={ev.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${STATUS_STYLE[ev.status]}`}>
                              {ev.status}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{ev.crm_deals?.title || preview || 'Payload'}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                                {ev.error ? ` · ${ev.error}` : preview && ev.crm_deals?.title ? ` · ${preview}` : ''}
                              </p>
                            </div>
                            {ev.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                            {ev.deal_id && onOpenDeal && (
                              <button onClick={() => onOpenDeal(ev.deal_id!)} className="text-muted-foreground hover:text-foreground shrink-0" title="Open lead">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Integration help */}
      <div className="card-outlined">
        <button onClick={() => setShowHelp(v => !v)} className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-secondary/60 rounded-2xl transition-colors">
          <Code2 className="w-4 h-4 text-accent-foreground" />
          How to send a lead
          <span className="ml-auto text-muted-foreground">{showHelp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
        </button>
        {showHelp && (
          <div className="px-5 pb-5 space-y-4 text-sm">
            <p className="text-muted-foreground">
              POST JSON (or a form submission) to the webhook URL. Field names are matched case-insensitively; anything unrecognised is kept in the lead description.
            </p>
            <pre className="rounded-lg bg-[#2A2722] text-[#F7F7F5] p-4 text-xs overflow-x-auto font-mono">{`curl -X POST "${FUNCTIONS_BASE}?token=${exampleToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ana Horvat",
    "email": "ana@example.com",
    "phone": "+385 91 000 0000",
    "company": "Example d.o.o.",
    "subject": "Website redesign",
    "message": "We need a new site by Q1.",
    "value": 8500,
    "external_id": "form-1234"
  }'`}</pre>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold mb-1">Recognised fields</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li><code>name</code> or <code>first_name</code> + <code>last_name</code></li>
                  <li><code>email</code>, <code>phone</code>, <code>company</code>, <code>position</code></li>
                  <li><code>subject</code> / <code>title</code> → lead title</li>
                  <li><code>message</code> / <code>notes</code> → description</li>
                  <li><code>value</code> / <code>budget</code> → lead value</li>
                  <li><code>source</code> / <code>utm_source</code> → overrides the source label</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Behaviour</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>Contacts are matched by email inside this organization.</li>
                  <li>Send <code>external_id</code> to make retries safe (duplicates are ignored).</li>
                  <li>Wrapped payloads (<code>data</code>, <code>fields</code>, <code>answers</code>) are unwrapped automatically.</li>
                  <li>The default owner gets an in-app notification for each new lead.</li>
                  <li>Pass the token as <code>?token=</code>, an <code>x-webhook-token</code> header, or the last path segment.</li>
                  <li>Existing leads from another tool: export them as CSV there and use <strong>Import CSV</strong> on the webhook card. Rows go through the same mapping and de-duplication.</li>
                  <li>With a signing secret set, deliveries must carry an HMAC-SHA256 of the raw body in <code>x-signature</code> (hex or base64, <code>sha256=</code>, <code>t=…,v1=…</code> and Standard Webhooks formats all work), or the secret itself in <code>x-webhook-secret</code>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
