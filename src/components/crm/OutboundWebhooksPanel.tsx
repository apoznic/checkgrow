import { useEffect, useState } from 'react';
import {
  Plus, Loader2, Send, Copy, Check, RefreshCw, Trash2, Power, PowerOff, Pencil,
  ChevronDown, ChevronRight, Eye, EyeOff, AlertCircle, RotateCcw, FlaskConical, ShieldCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';

interface OutboundWebhooksPanelProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  onOpenDeal?: (dealId: string) => void;
}

type PayloadFormat = 'envelope' | 'flat';

interface OutboundRow {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  secret: string;
  events: string[];
  payload_format: PayloadFormat;
  exclude_inbound: boolean;
  headers: Record<string, string>;
  delivered_count: number;
  failed_count: number;
  last_delivered_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

interface DeliveryRow {
  id: string;
  event: string;
  deal_id: string | null;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  next_attempt_at: string;
  last_status_code: number | null;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
  crm_deals?: { id: string; title: string } | null;
}

interface FormState {
  name: string;
  url: string;
  events: string[];
  payload_format: PayloadFormat;
  exclude_inbound: boolean;
  headersText: string;
}

const EVENTS: { id: string; label: string; hint: string }[] = [
  { id: 'lead.created', label: 'Lead created', hint: 'a new lead enters the pipeline' },
  { id: 'lead.updated', label: 'Lead updated', hint: 'title, value, owner, contact or description changed' },
  { id: 'lead.stage_changed', label: 'Stage changed', hint: 'moved between pipeline stages (includes won and lost)' },
  { id: 'lead.won', label: 'Lead won', hint: 'marked as won' },
  { id: 'lead.lost', label: 'Lead lost', hint: 'marked as lost' },
];

const FORMAT_OPTIONS = [
  { value: 'envelope', label: 'Envelope: { event, lead: {…} }' },
  { value: 'flat', label: 'Flat: { name, email, phone, … }' },
];

const EMPTY_FORM: FormState = { name: '', url: '', events: ['lead.created'], payload_format: 'envelope', exclude_inbound: true, headersText: '' };

const STATUS_STYLE: Record<DeliveryRow['status'], string> = {
  delivered: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-600',
};

const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** "Name: value" per line. Returns an error message for anything that is not a real HTTP header. */
const parseHeaders = (text: string): { headers: Record<string, string> } | { error: string } => {
  const headers: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    const name = idx > 0 ? trimmed.slice(0, idx).trim() : '';
    if (!name || !HEADER_NAME.test(name)) {
      return { error: `"${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}" is not a header. Use one "Name: value" per line, e.g. "X-Api-Key: abc123". Leave the field empty if the receiver needs no extra headers.` };
    }
    headers[name] = trimmed.slice(idx + 1).trim();
  }
  return { headers };
};

const headersToText = (h: Record<string, string> | null | undefined) =>
  Object.entries(h || {}).map(([k, v]) => `${k}: ${v}`).join('\n');

const randomSecret = () =>
  'owhsec_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * Outbound webhooks: push lead events from this organization's CRM to other
 * systems. Deliveries are signed with a per-webhook secret and retried.
 */
export function OutboundWebhooksPanel({ clusterId, profileId, canManage, onOpenDeal }: OutboundWebhooksPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<OutboundRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryRow[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks().then(() => setIsLoading(false));
    const channel = supabase
      .channel(`crm-outbound-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_outbound_webhooks', filter: `cluster_id=eq.${clusterId}` }, () => loadWebhooks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_outbound_deliveries', filter: `cluster_id=eq.${clusterId}` }, (payload) => {
        const row = (payload.new || payload.old) as { webhook_id?: string };
        if (row?.webhook_id) loadDeliveries(row.webhook_id, true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const loadWebhooks = async () => {
    const { data, error } = await supabase
      .from('crm_outbound_webhooks')
      .select('id, name, url, enabled, secret, events, payload_format, exclude_inbound, headers, delivered_count, failed_count, last_delivered_at, last_status_code, created_at')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Could not load outbound webhooks', description: error.message, variant: 'destructive' });
      return;
    }
    setWebhooks((data || []) as OutboundRow[]);
  };

  const loadDeliveries = async (webhookId: string, silent = false) => {
    if (!silent) setDeliveriesLoading(webhookId);
    const { data } = await supabase
      .from('crm_outbound_deliveries')
      .select('id, event, deal_id, status, attempts, next_attempt_at, last_status_code, last_error, created_at, delivered_at, crm_deals ( id, title )')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(25);
    setDeliveries(prev => ({ ...prev, [webhookId]: (data || []) as unknown as DeliveryRow[] }));
    if (!silent) setDeliveriesLoading(null);
  };

  const toggleExpanded = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !deliveries[next]) loadDeliveries(next);
  };

  const validate = (): { name: string; url: string; headers: Record<string, string> } | null => {
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name) { toast({ title: 'Give the webhook a name', variant: 'destructive' }); return null; }
    if (!/^https?:\/\/\S+$/i.test(url)) { toast({ title: 'Enter a full URL', description: 'It must start with https:// (or http://).', variant: 'destructive' }); return null; }
    if (form.events.length === 0) { toast({ title: 'Pick at least one event', variant: 'destructive' }); return null; }
    const parsed = parseHeaders(form.headersText);
    if ('error' in parsed) { toast({ title: 'Check the extra headers', description: parsed.error, variant: 'destructive' }); return null; }
    return { name, url, headers: parsed.headers };
  };

  const handleCreate = async () => {
    const v = validate();
    if (!v) return;
    setIsSaving(true);
    const { error } = await supabase.from('crm_outbound_webhooks').insert({
      cluster_id: clusterId, name: v.name, url: v.url, events: form.events,
      payload_format: form.payload_format, exclude_inbound: form.exclude_inbound, headers: v.headers,
      created_by: profileId, secret: randomSecret(),
    });
    setIsSaving(false);
    if (error) { toast({ title: 'Could not create webhook', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Outbound webhook created', description: 'Send a test delivery to check the receiving side.' });
    setForm(EMPTY_FORM);
    setShowCreate(false);
    loadWebhooks();
  };

  const startEdit = (hook: OutboundRow) => {
    setEditingId(hook.id);
    setShowCreate(false);
    setForm({ name: hook.name, url: hook.url, events: hook.events, payload_format: hook.payload_format, exclude_inbound: hook.exclude_inbound, headersText: headersToText(hook.headers) });
  };

  const handleSaveEdit = async (hook: OutboundRow) => {
    const v = validate();
    if (!v) return;
    setIsSaving(true);
    const { error } = await supabase.from('crm_outbound_webhooks').update({
      name: v.name, url: v.url, events: form.events, payload_format: form.payload_format, exclude_inbound: form.exclude_inbound, headers: v.headers,
    }).eq('id', hook.id);
    setIsSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setEditingId(null);
    setForm(EMPTY_FORM);
    loadWebhooks();
  };

  const handleToggle = async (hook: OutboundRow) => {
    setWebhooks(prev => prev.map(h => (h.id === hook.id ? { ...h, enabled: !h.enabled } : h)));
    const { error } = await supabase.from('crm_outbound_webhooks').update({ enabled: !hook.enabled }).eq('id', hook.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); loadWebhooks(); }
  };

  const handleRegenerateSecret = async (hook: OutboundRow) => {
    if (!confirm(`Generate a new signing secret for "${hook.name}"? The receiving system must be updated with it.`)) return;
    const { error } = await supabase.from('crm_outbound_webhooks').update({ secret: randomSecret() }).eq('id', hook.id);
    if (error) { toast({ title: 'Could not regenerate', description: error.message, variant: 'destructive' }); return; }
    setRevealedId(hook.id);
    loadWebhooks();
  };

  const handleDelete = async (hook: OutboundRow) => {
    if (!confirm(`Delete "${hook.name}"? Pending deliveries stop immediately.`)) return;
    const { error } = await supabase.from('crm_outbound_webhooks').delete().eq('id', hook.id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    setWebhooks(prev => prev.filter(h => h.id !== hook.id));
  };

  const invokeDispatcher = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('crm-outbound-dispatcher', { body: { cluster_id: clusterId, ...payload } });
    if (error) throw new Error(error.message);
    return data as { processed: number; results: { delivery: string; status: string; code?: number; error?: string }[] };
  };

  const handleSendTest = async (hook: OutboundRow) => {
    setBusyId(hook.id);
    try {
      const data = await invokeDispatcher({ test: { webhook_id: hook.id } });
      const r = data.results?.[0];
      if (r?.status === 'delivered') toast({ title: `Test delivered (HTTP ${r.code})`, description: `${hook.name} accepted the sample lead.` });
      else toast({ title: 'Test delivery failed', description: r?.error || 'No response recorded', variant: 'destructive' });
      setExpandedId(hook.id);
      loadDeliveries(hook.id, true);
      loadWebhooks();
    } catch (err) {
      toast({ title: 'Could not send test', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (hook: OutboundRow, delivery: DeliveryRow) => {
    setBusyId(delivery.id);
    try {
      const data = await invokeDispatcher({ delivery_id: delivery.id });
      const r = data.results?.[0];
      if (r?.status === 'delivered') toast({ title: `Delivered (HTTP ${r.code})` });
      else toast({ title: 'Still failing', description: r?.error || 'No response recorded', variant: 'destructive' });
      loadDeliveries(hook.id, true);
      loadWebhooks();
    } catch (err) {
      toast({ title: 'Could not retry', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const copySecret = async (hook: OutboundRow) => {
    try {
      await navigator.clipboard.writeText(hook.secret);
      setCopiedId(hook.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Reveal the secret and copy it manually.', variant: 'destructive' });
    }
  };

  const toggleEvent = (id: string) =>
    setForm(p => ({ ...p, events: p.events.includes(id) ? p.events.filter(e => e !== id) : [...p.events, id] }));

  const renderForm = (onSave: () => void, onCancel: () => void, saveLabel: string) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <GlassInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Checkgrow, HubSpot, n8n" autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Destination URL</label>
          <GlassInput value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://example.com/webhooks/leads" className="font-mono text-xs" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Send when</label>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map(ev => {
            const on = form.events.includes(ev.id);
            return (
              <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)} title={ev.hint}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'bg-[#2A2722] text-[#F7F7F5] border-[#2A2722]' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}>
                {on && <Check className="w-3 h-3" />}
                {ev.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Payload format</label>
          <GlassSelect value={form.payload_format} onChange={v => setForm(p => ({ ...p, payload_format: v as PayloadFormat }))} options={FORMAT_OPTIONS} />
          <p className="text-[11px] text-muted-foreground">Use "Flat" for form-style receivers that expect name, email and phone at the top level (Checkgrow's inbound webhook, Zapier, n8n).</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Extra HTTP headers (optional, usually empty)</label>
          <textarea value={form.headersText} onChange={e => setForm(p => ({ ...p, headersText: e.target.value }))} rows={3}
            placeholder={'X-Api-Key: abc123'} className="glass-input font-mono text-xs w-full resize-y" />
          <p className="text-[11px] text-muted-foreground">Only if the receiver asks for an API key or token. One "Name: value" per line. Do not paste URLs or curl commands here; Checkgrow needs nothing.</p>
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={form.exclude_inbound} onChange={e => setForm(p => ({ ...p, exclude_inbound: e.target.checked }))} className="mt-0.5 rounded border-border" />
        <span>Skip leads that arrived through an inbound webhook. Keeps two connected systems from sending each other's leads back and forth.</span>
      </label>
      <div className="flex gap-2 justify-end">
        <GlassButtonNew variant="ghost" onClick={onCancel}>Cancel</GlassButtonNew>
        <GlassButtonNew variant="primary" onClick={onSave} isLoading={isSaving}>{saveLabel}</GlassButtonNew>
      </div>
    </div>
  );

  const totalDelivered = webhooks.reduce((s, h) => s + h.delivered_count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Send className="w-4 h-4" />
            <span className="text-sm">Destinations</span>
          </div>
          <p className="text-2xl font-bold">{webhooks.length}</p>
          <p className="text-xs text-[#9B9B9B] mt-1">{webhooks.filter(h => h.enabled).length} active</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm">Delivered</span>
          </div>
          <p className="text-2xl font-bold">{totalDelivered}</p>
        </div>
        <div className="glass-panel p-4 md:col-span-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Send leads to any system</p>
            <p className="text-xs text-muted-foreground">Every delivery is signed with the webhook's secret and retried up to six times.</p>
          </div>
          {canManage && (
            <GlassButtonNew variant="primary" onClick={() => { setShowCreate(v => !v); setEditingId(null); setForm(EMPTY_FORM); }} leftIcon={<Plus className="w-4 h-4" />}>
              New destination
            </GlassButtonNew>
          )}
        </div>
      </div>

      {showCreate && canManage && (
        <div className="glass-panel p-6 space-y-4">
          <div>
            <p className="eyebrow mb-1">New outbound webhook</p>
            <h3 className="text-h4">Where should leads go?</h3>
          </div>
          {renderForm(handleCreate, () => setShowCreate(false), 'Create webhook')}
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Send className="w-12 h-12 mx-auto mb-3 text-[#9B9B9B]" />
          <p className="font-semibold mb-1">No outbound webhooks yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add a destination URL and the events you want to send. The receiving system gets a signed POST for each one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(hook => {
            const open = expandedId === hook.id;
            const rows = deliveries[hook.id] || [];
            const editing = editingId === hook.id;
            return (
              <div key={hook.id} className="glass-panel">
                <div className="p-5 space-y-4">
                  {editing ? (
                    <>
                      <p className="eyebrow">Edit outbound webhook</p>
                      {renderForm(() => handleSaveEdit(hook), () => { setEditingId(null); setForm(EMPTY_FORM); }, 'Save changes')}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{hook.name}</h3>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${hook.enabled ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                              {hook.enabled ? 'Active' : 'Paused'}
                            </span>
                            {hook.events.map(ev => (
                              <span key={ev} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground border border-[#CFC3D9]">
                                {EVENTS.find(e => e.id === ev)?.label || ev}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{hook.url}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hook.delivered_count} delivered · {hook.failed_count} failed
                            {hook.last_delivered_at ? ` · last ${formatDistanceToNow(new Date(hook.last_delivered_at), { addSuffix: true })}` : ' · nothing sent yet'}
                            {' · '}{hook.payload_format === 'flat' ? 'flat payload' : 'envelope payload'}
                            {hook.exclude_inbound ? ' · skips inbound leads' : ''}
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => handleSendTest(hook)} isLoading={busyId === hook.id} leftIcon={<FlaskConical className="w-3.5 h-3.5" />}>
                              Send test
                            </GlassButtonNew>
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => startEdit(hook)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                              Edit
                            </GlassButtonNew>
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => handleToggle(hook)} leftIcon={hook.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}>
                              {hook.enabled ? 'Pause' : 'Enable'}
                            </GlassButtonNew>
                            <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => handleDelete(hook)} title="Delete webhook" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </GlassButtonNew>
                          </div>
                        )}
                      </div>

                      <div className="card-tinted p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-xs min-w-0">
                            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                            <span className="font-medium shrink-0">Signing secret</span>
                            <code className="font-mono text-xs truncate">{revealedId === hook.id ? hook.secret : `${hook.secret.slice(0, 10)}${'•'.repeat(24)}`}</code>
                          </div>
                          <div className="flex items-center gap-1">
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => setRevealedId(revealedId === hook.id ? null : hook.id)} leftIcon={revealedId === hook.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}>
                              {revealedId === hook.id ? 'Hide' : 'Reveal'}
                            </GlassButtonNew>
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => copySecret(hook)} leftIcon={copiedId === hook.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}>
                              {copiedId === hook.id ? 'Copied' : 'Copy'}
                            </GlassButtonNew>
                            {canManage && (
                              <GlassButtonNew variant="ghost" size="sm" onClick={() => handleRegenerateSecret(hook)} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                                Regenerate
                              </GlassButtonNew>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Paste it into the receiving system. Each request carries <code>x-webhook-signature</code> (v1, base64 HMAC-SHA256 of id.timestamp.body), <code>x-signature</code> (sha256= hex HMAC of the body), <code>x-webhook-id</code>, <code>x-webhook-timestamp</code> and <code>x-webhook-event</code>.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <button onClick={() => toggleExpanded(hook.id)} className="w-full flex items-center gap-2 px-5 py-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Recent deliveries
                </button>
                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {deliveriesLoading === hook.id && rows.length === 0 ? (
                      <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading</div>
                    ) : rows.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">Nothing sent yet. Use "Send test" or create a lead.</p>
                    ) : (
                      rows.map(dv => (
                        <div key={dv.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${STATUS_STYLE[dv.status]}`}>{dv.status}</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">
                              <span className="font-medium">{dv.event}</span>
                              {dv.crm_deals?.title ? ` · ${dv.crm_deals.title}` : dv.event === 'lead.test' ? ' · sample lead' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(dv.created_at), { addSuffix: true })}
                              {` · ${dv.attempts} attempt${dv.attempts === 1 ? '' : 's'}`}
                              {dv.last_status_code ? ` · HTTP ${dv.last_status_code}` : ''}
                              {dv.last_error ? ` · ${dv.last_error}` : ''}
                              {dv.status === 'pending' && dv.attempts > 0 ? ` · retry ${formatDistanceToNow(new Date(dv.next_attempt_at), { addSuffix: true })}` : ''}
                            </p>
                          </div>
                          {dv.status === 'failed' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                          {canManage && dv.status !== 'delivered' && (
                            <GlassButtonNew variant="ghost" size="sm" onClick={() => handleRetry(hook, dv)} isLoading={busyId === dv.id} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                              Retry
                            </GlassButtonNew>
                          )}
                          {dv.deal_id && onOpenDeal && (
                            <button onClick={() => onOpenDeal(dv.deal_id!)} className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline">Open</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
